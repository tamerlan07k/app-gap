// College content DRAFT generator (AI) — fills the admin review queue.
//
// Writes UNPUBLISHED drafts for the dedicated college page, grounded on the
// verified facts we already store (name, city/state, founded year, setting,
// institution type, admit rate). NOTHING it writes is shown to students until a
// human publishes it in /admin/college-content — drafts are stored with their
// verification timestamp left NULL.
//
// Three content types:
//   --type history  → college_profiles.history                (one per college)
//   --type fit      → college_profiles.fit (5 facets)          (one per college)
//   --type program  → college_field_strengths (per field_key)  (college × majors)
//
// Safety rails:
//   • --dry-run (default-safe): NO LLM call, NO writes — prints the plan and the
//     exact prompt for the first target so you can inspect grounding first.
//   • --sample: calls the LLM for up to --limit targets and PRINTS the output,
//     but writes NOTHING (preview quality + cost before committing).
//   • live (no --dry-run/--sample): writes drafts, but SKIPS any target that
//     already has content for that type — it never overwrites, and never touches
//     a published (verified) row. Re-runs only fill gaps.
//
//   node scripts/college-ingest/generate-content-drafts.mjs --type history --dry-run
//   node scripts/college-ingest/generate-content-drafts.mjs --type history --sample --model openai/gpt-4o-mini --limit 2
//   node scripts/college-ingest/generate-content-drafts.mjs --type history --model openai/gpt-4o-mini
//   node scripts/college-ingest/generate-content-drafts.mjs --type program --model google/gemini-2.5-flash --majors cs,engineering,business
//
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY.

import { readFileSync } from "node:fs";
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { generateObject } from "ai";
import { z } from "zod";

// ─── args + env ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (name, dflt) => {
  const a = args.find((x) => x.startsWith(name));
  if (!a) return dflt;
  return a.split("=")[1] ?? args[args.indexOf(a) + 1];
};

const TYPE = val("--type", null); // history | fit | program
const MODEL = val("--model", null); // provider/model, required for LLM calls
const DRY_RUN = has("--dry-run");
const SAMPLE = has("--sample");
const LIMIT = Number(val("--limit", Infinity));
const FILTER = val("--filter", null);
const MAJORS_ARG = val("--majors", null);
// How many LLM calls to run at once. Default 1 (sequential, unchanged behavior).
// Writes are idempotent upserts and the skip-existing set is computed up front,
// so raising this only parallelizes — it never duplicates rows.
const CONCURRENCY = Math.max(1, Number(val("--concurrency", 1)) || 1);

const VALID_TYPES = ["history", "fit", "program"];
if (!VALID_TYPES.includes(TYPE)) {
  console.error(`--type must be one of: ${VALID_TYPES.join(", ")}`);
  process.exit(1);
}
const WILL_CALL_LLM = !DRY_RUN; // sample OR live both call the LLM
if (WILL_CALL_LLM && !MODEL) {
  console.error(
    "A --model is required to call the LLM (e.g. --model openai/gpt-4o-mini). " +
      "Use --dry-run to inspect the plan/prompt without any LLM call.",
  );
  process.exit(1);
}

function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}
const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const AI_KEY = get("AI_GATEWAY_API_KEY");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
if (WILL_CALL_LLM && !AI_KEY) {
  console.error("AI_GATEWAY_API_KEY is required to call the LLM.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});
const gateway = WILL_CALL_LLM
  ? createOpenAI({ apiKey: AI_KEY, baseURL: "https://ai-gateway.vercel.sh/v1" })
  : null;

// ─── taxonomy ───────────────────────────────────────────────────────────────

// Mirrors src/lib/colleges/field-fit.ts FIELD_LABELS (kept in sync manually).
const FIELD_LABELS = {
  cs: "Computer Science / AI",
  engineering: "Engineering",
  "bio-premed": "Biology / Pre-Med",
  business: "Business / Finance",
  "math-physics": "Math / Physics",
  polisci: "Political Science / IR",
  psych: "Psychology / Neuroscience",
  humanities: "Humanities",
  design: "Architecture / Design / Arts",
  education: "Education / Public Policy",
  law: "Pre-Law",
};
const TOP_MAJORS = [
  "cs",
  "engineering",
  "business",
  "bio-premed",
  "math-physics",
  "psych",
  "humanities",
  "polisci",
];
const FIELD_STRENGTHS = [
  "excellent",
  "strong",
  "moderate",
  "limited",
  "unknown",
];

// ─── grounding + prompts ──────────────────────────────────────────────────────

function factsLine(c) {
  const bits = [
    `Name: ${c.name}`,
    c.city || c.state
      ? `Location: ${[c.city, c.state].filter(Boolean).join(", ")}`
      : null,
    c.foundedYear != null ? `Founded: ${c.foundedYear}` : null,
    c.setting ? `Setting: ${c.setting} campus` : null,
    c.institutionType && c.institutionType !== "unknown"
      ? `Type: ${c.institutionType.replace(/_/g, " ")}`
      : null,
    c.admitRate != null
      ? `Overall admit rate: ${Math.round(c.admitRate * 100)}%`
      : null,
  ].filter(Boolean);
  return bits.join(" · ");
}

const GROUNDING_RULES =
  "Use ONLY widely-established, well-documented facts about this specific, real " +
  "institution. Do NOT invent founding dates, statistics, rankings, named programs, " +
  "or 'known for' claims you are not highly confident are broadly documented. Prefer " +
  "general but true statements over specific but uncertain ones. No marketing fluff, " +
  "no superlatives you can't support. This is a DRAFT a human will fact-check.";

function buildPrompt(type, c, fieldKey) {
  if (type === "history") {
    return {
      system: `You write concise, accurate school histories for a college-planning app. ${GROUNDING_RULES} Output STRICT JSON only.`,
      prompt:
        `${factsLine(c)}\n\n` +
        "Write a prospective-student-facing history of this college in TWO short " +
        "paragraphs (founding, a few major milestones, what it became known for). " +
        'Separate the paragraphs with a blank line. Return JSON: {"history": string, "confidence": "low"|"medium"|"high"}.',
    };
  }
  if (type === "fit") {
    return {
      system:
        `You describe what makes a SPECIFIC, real college distinctive, for a college-planning app. ${GROUNDING_RULES} ` +
        "Write only SPECIFIC, well-documented facts unique to THIS institution — e.g. named traditions, consortia or exchange programs, a distinctive curriculum, signature or nationally-known programs, notable campus or location features, or a well-known cultural character. " +
        "STRICTLY BAN generic statements that are true of almost any college — for example: 'offers a variety of clubs', 'a diverse and inclusive community', 'a range of research and internship opportunities', 'provides career services', 'strong emphasis on academics'. " +
        "If you do not know something SPECIFIC and TRUE for a facet, return an empty string for that facet. An empty string is REQUIRED over generic filler. Each facet is ONE sentence. Output STRICT JSON only.",
      prompt:
        `${factsLine(c)}\n\n` +
        "Write up to five one-sentence facets, each naming something SPECIFIC and verifiable about THIS exact college (never generic to colleges in general). " +
        'Leave any facet you cannot fill with a real, specific fact as "" (empty). Return JSON: ' +
        '{"vibe": string, "campusLife": string, "diversity": string, ' +
        '"opportunities": string, "careerFit": string, "confidence": "low"|"medium"|"high"}.',
    };
  }
  // program
  const label = FIELD_LABELS[fieldKey] ?? fieldKey;
  return {
    system: `You assess a college's strength in a field for a college-planning app. ${GROUNDING_RULES} Be CONSERVATIVE: only 'excellent' or 'strong' for programs with a broad, well-known reputation in this field; otherwise 'moderate', 'limited', or 'unknown'. Output STRICT JSON only.`,
    prompt:
      `${factsLine(c)}\nField: ${label}\n\n` +
      "Assess this college's undergraduate strength in the field above. Return JSON: " +
      '{"strength": "excellent"|"strong"|"moderate"|"limited"|"unknown", ' +
      '"headline": string (one line), "notes": string (1-2 sentences), ' +
      '"confidence": "low"|"medium"|"high"}. Use "unknown" if you are not confident.',
  };
}

// Strict structured-output mode requires EVERY property to be required, so
// confidence is not optional (the model always returns one of these).
const CONFIDENCE = z.enum(["low", "medium", "high"]);
const SCHEMAS = {
  history: z.object({ history: z.string(), confidence: CONFIDENCE }),
  fit: z.object({
    // Empty string is allowed and expected when a facet has no specific fact.
    vibe: z.string(),
    campusLife: z.string(),
    diversity: z.string(),
    opportunities: z.string(),
    careerFit: z.string(),
    confidence: CONFIDENCE,
  }),
  program: z.object({
    strength: z.enum(FIELD_STRENGTHS),
    headline: z.string(),
    notes: z.string(),
    confidence: CONFIDENCE,
  }),
};

// Structured output: the schema forces valid JSON and prevents the free-text
// runaway (a 49KB unterminated string) we saw with generateText.
async function callModel(type, system, prompt) {
  const { object } = await generateObject({
    model: gateway(MODEL),
    schema: SCHEMAS[type],
    system,
    prompt,
    temperature: 0.3,
  });
  return object;
}

// ─── data loading ─────────────────────────────────────────────────────────────

async function loadColleges() {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("colleges")
      .select("id, canonical_name, city, state, institution_type")
      .eq("status", "active")
      .order("canonical_name")
      .range(from, from + 999);
    if (error) throw new Error(`load colleges: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

// Page through an entire table (PostgREST caps a single select at 1000 rows).
async function selectAll(table, columns) {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (error) throw new Error(`load ${table}: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return all;
}

async function loadFactsAndExisting() {
  const [profiles, stats] = await Promise.all([
    selectAll(
      "college_profiles",
      "college_id, founded_year, setting, history, fit",
    ),
    selectAll("college_admission_stats", "college_id, admit_rate, source_date"),
  ]);
  const profileById = new Map(profiles.map((p) => [p.college_id, p]));
  // Most-recent admit rate per college.
  const admitById = new Map();
  const dateById = new Map();
  for (const s of stats) {
    const prev = dateById.get(s.college_id) ?? "";
    if ((s.source_date ?? "") >= prev) {
      dateById.set(s.college_id, s.source_date ?? "");
      admitById.set(s.college_id, s.admit_rate);
    }
  }
  return { profileById, admitById };
}

// ─── writers (drafts: verification timestamp left NULL) ───────────────────────

async function writeHistory(collegeId, out) {
  const history = (out.history ?? "").trim();
  if (!history) return false;
  const { error } = await db
    .from("college_profiles")
    .upsert(
      { college_id: collegeId, history, updated_at: new Date().toISOString() },
      { onConflict: "college_id" },
    );
  if (error) throw new Error(error.message);
  return true;
}

async function writeFit(collegeId, out) {
  const fit = {};
  for (const k of [
    "vibe",
    "campusLife",
    "diversity",
    "opportunities",
    "careerFit",
  ]) {
    const v = (out[k] ?? "").trim();
    if (v) fit[k] = v;
  }
  if (Object.keys(fit).length === 0) return false;
  const { error } = await db
    .from("college_profiles")
    .upsert(
      { college_id: collegeId, fit, updated_at: new Date().toISOString() },
      { onConflict: "college_id" },
    );
  if (error) throw new Error(error.message);
  return true;
}

async function writeProgram(collegeId, fieldKey, out) {
  const strength = FIELD_STRENGTHS.includes(out.strength)
    ? out.strength
    : "unknown";
  const { error } = await db.from("college_field_strengths").upsert(
    {
      college_id: collegeId,
      field_key: fieldKey,
      strength,
      headline: (out.headline ?? "").trim() || null,
      notes: (out.notes ?? "").trim() || null,
      source_type: "manual",
      confidence: out.confidence ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "college_id,field_key", ignoreDuplicates: true },
  );
  if (error) throw new Error(error.message);
  return true;
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  let colleges = await loadColleges();
  if (FILTER)
    colleges = colleges.filter((c) =>
      c.canonical_name.toLowerCase().includes(FILTER.toLowerCase()),
    );
  const { profileById, admitById } = await loadFactsAndExisting();

  const enrich = (c) => {
    const p = profileById.get(c.id);
    return {
      id: c.id,
      name: c.canonical_name,
      city: c.city,
      state: c.state,
      institutionType: c.institution_type,
      foundedYear: p?.founded_year ?? null,
      setting: p?.setting ?? null,
      admitRate: admitById.get(c.id) ?? null,
      _hasHistory: !!p?.history,
      _hasFit: !!p?.fit,
    };
  };

  // Build the target list (college, [fieldKey]) and drop already-filled ones.
  const majors = MAJORS_ARG
    ? MAJORS_ARG.split(",")
        .map((m) => m.trim())
        .filter(Boolean)
    : TOP_MAJORS;

  let targets = [];
  if (TYPE === "program") {
    // Page through ALL existing (college, field) rows. A single select is capped
    // at 1000 by PostgREST's default limit, so at >1000 program rows it would
    // under-count what's already done and re-attempt existing rows — harmless
    // (writes ignore duplicates) but each retry still burns an LLM call/budget.
    const have = new Set();
    let existFrom = 0;
    for (;;) {
      const { data, error } = await db
        .from("college_field_strengths")
        .select("college_id, field_key")
        .in("field_key", majors)
        .range(existFrom, existFrom + 999);
      if (error)
        throw new Error(`load existing program rows: ${error.message}`);
      for (const r of data ?? []) have.add(`${r.college_id}:${r.field_key}`);
      if (!data || data.length < 1000) break;
      existFrom += 1000;
    }
    for (const c of colleges) {
      const e = enrich(c);
      for (const fk of majors) {
        if (!have.has(`${c.id}:${fk}`))
          targets.push({ college: e, fieldKey: fk });
      }
    }
  } else {
    for (const c of colleges) {
      const e = enrich(c);
      const filled = TYPE === "history" ? e._hasHistory : e._hasFit;
      if (!filled) targets.push({ college: e, fieldKey: null });
    }
  }

  const totalBeforeLimit = targets.length;
  targets = targets.slice(0, LIMIT);

  const mode = DRY_RUN
    ? "DRY RUN (no LLM, no writes)"
    : SAMPLE
      ? "SAMPLE (LLM, no writes)"
      : "LIVE (writes drafts)";
  console.log(
    `Content drafts — type=${TYPE} · ${mode}` +
      `${MODEL ? ` · model=${MODEL}` : ""}` +
      `${TYPE === "program" ? ` · majors=${majors.join(",")}` : ""}\n` +
      `Targets missing content: ${totalBeforeLimit}` +
      `${targets.length < totalBeforeLimit ? ` (processing ${targets.length} due to --limit)` : ""}\n`,
  );

  if (targets.length === 0) {
    console.log(
      "Nothing to do — every target already has content for this type.",
    );
    return;
  }

  // Dry run: show the first prompt and stop (no LLM).
  if (DRY_RUN) {
    const t = targets[0];
    const { system, prompt } = buildPrompt(TYPE, t.college, t.fieldKey);
    console.log("── Sample prompt for the first target ──");
    console.log(`[system]\n${system}\n\n[user]\n${prompt}\n`);
    console.log(
      `(Dry run — no LLM called, nothing written. Re-run with --sample --model <id> to preview real output, or without --dry-run to write drafts.)`,
    );
    return;
  }

  const summary = { ok: 0, empty: 0, errors: [] };

  async function processTarget(t) {
    const label =
      TYPE === "program" ? `${t.college.name} · ${t.fieldKey}` : t.college.name;
    try {
      const { system, prompt } = buildPrompt(TYPE, t.college, t.fieldKey);
      const out = await callModel(TYPE, system, prompt);

      if (SAMPLE) {
        console.log(`\n── ${label} (${out.confidence ?? "?"}) ──`);
        console.log(JSON.stringify(out, null, 2));
        summary.ok++;
        return;
      }

      let wrote = false;
      if (TYPE === "history") wrote = await writeHistory(t.college.id, out);
      else if (TYPE === "fit") wrote = await writeFit(t.college.id, out);
      else wrote = await writeProgram(t.college.id, t.fieldKey, out);

      if (wrote) {
        summary.ok++;
        console.log(`  ✓ ${label} [${out.confidence ?? "?"}]`);
      } else {
        summary.empty++;
        console.log(`  – ${label}: model returned nothing usable (skipped)`);
      }
    } catch (err) {
      summary.errors.push(`${label}: ${err.message}`);
      console.log(`  ! ERROR ${label}: ${err.message}`);
    }
  }

  // Worker pool: process up to CONCURRENCY targets at once. Targets are
  // independent (each writes its own row via an idempotent upsert), so order
  // doesn't matter and the only effect of concurrency is wall-clock speed.
  if (CONCURRENCY > 1) console.log(`(running ${CONCURRENCY} at a time)\n`);
  let cursor = 0;
  async function worker() {
    while (cursor < targets.length) {
      const i = cursor++;
      await processTarget(targets[i]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker),
  );

  console.log(
    `\nDone. ${SAMPLE ? "sampled" : "wrote-drafts"}=${summary.ok} ` +
      `empty=${summary.empty} errors=${summary.errors.length}` +
      `${SAMPLE ? "" : "  → review & publish at /admin/college-content"}`,
  );
  if (summary.errors.length)
    console.log(`Errors:\n  ${summary.errors.slice(0, 20).join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
