// Supplemental-essay prompt loader (current application cycle).
//
// Loads verbatim, official supplemental prompts from supplemental-prompts-
// candidates.json into college_supplemental_prompts. Each candidate college is
// matched by slug or canonical_name; its prompt set is reconciled for the cycle
// (adds new, updates existing matched by prompt_text, deletes prompts no longer
// listed). verified_at is set ONLY for prompts marked `verified: true` in the
// file (human-confirmed against the official source); everything else stays
// verified_at = null and therefore never surfaces in the app. No prompt text is
// invented here — the file is the single source of truth.
//
//   Dry run (no DB writes; prints per-college add/update/remove diff):
//     node scripts/college-ingest/ingest-supplemental-prompts.mjs --dry-run
//   Live load (writes via the service role):
//     node scripts/college-ingest/ingest-supplemental-prompts.mjs
//
// Env (from environment / .env.local, never committed):
//   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Idempotent: re-running reconciles each college's prompt set to exactly what the
// file lists for the cycle.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const val = (flag) => {
  const a = args.find((x) => x.startsWith(flag));
  return a ? (a.split("=")[1] ?? args[args.indexOf(a) + 1]) : null;
};
const FILTER = val("--filter");
// Optional alternate source file (defaults to the canonical candidates file).
// Lets a working batch (e.g. priority-batch.json) be ingested in isolation so
// reconciliation only touches the colleges IN that file — the canonical file's
// colleges (and any out-of-band prompts they carry) are never reconciled.
const FILE = val("--file") ?? "supplemental-prompts-candidates.json";

const candidatesRaw = JSON.parse(readFileSync(join(HERE, FILE), "utf8"));
const CYCLE_YEAR = candidatesRaw.cycle_year ?? "2026-2027";
const SOURCE_DATE = candidatesRaw._meta?.source_date ?? null;

function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // optional
  }
  return env;
}
const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

async function resolveCollegeId(ref) {
  // Match by slug first, then canonical_name (exact).
  const bySlug = await supabase
    .from("colleges")
    .select("id")
    .eq("slug", ref)
    .maybeSingle();
  if (bySlug.data) return bySlug.data.id;
  const byName = await supabase
    .from("colleges")
    .select("id")
    .eq("canonical_name", ref)
    .maybeSingle();
  return byName.data?.id ?? null;
}

async function resolveSchoolId(collegeId, schoolName) {
  if (!schoolName) return null;
  const { data } = await supabase
    .from("college_schools")
    .select("id")
    .eq("college_id", collegeId)
    .eq("name", schoolName)
    .maybeSingle();
  return data?.id ?? null;
}

// Page through a table (Supabase caps a single select at 1000 rows).
async function fetchAll(table, columns, applyFilters) {
  const PAGE = 1000;
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1);
    if (applyFilters) q = applyFilters(q);
    const { data, error } = await q;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }
  return rows;
}

// Decide a college's coverage status from its candidate entry.
//   explicit `status` wins → else `no_supplements:true` → none_required
//   → else prompts present → has_supplements → else null (leave to seed-pending).
function deriveStatus(entry) {
  if (entry.status) return entry.status;
  if (entry.no_supplements === true) return "none_required";
  if ((entry.prompts ?? []).length > 0) return "has_supplements";
  return null;
}

// Upsert the (college, cycle) status row. `verified` gates verified_at: a
// none_required claim needs a confirmed official source, exactly like a prompt.
async function upsertStatus(collegeId, entry, status) {
  const desiredPrompts = entry.prompts ?? [];
  const verified =
    status === "has_supplements"
      ? desiredPrompts.some((p) => p.verified)
      : entry.verified === true;
  const row = {
    college_id: collegeId,
    cycle_year: CYCLE_YEAR,
    status,
    notes: entry.notes ?? null,
    source_type: entry.source_type ?? "official_site",
    source_url: entry.status_source_url ?? entry.source_url ?? null,
    source_date: SOURCE_DATE,
    verified_at: verified ? new Date().toISOString() : null,
    verified_by: verified ? "ingest" : null,
    confidence: entry.confidence ?? null,
    updated_at: new Date().toISOString(),
  };
  if (!DRY_RUN) {
    await supabase
      .from("college_supplement_status")
      .upsert(row, { onConflict: "college_id,cycle_year" });
  }
  return verified;
}

// Give EVERY college a pending status row for the cycle (idempotent; never
// overwrites an existing/verified row thanks to ignoreDuplicates). Lets the
// coverage report show a true "checked vs total" denominator.
async function seedPending() {
  const colleges = await fetchAll("colleges", "id");
  console.log(`Seeding pending status for ${colleges.length} colleges…`);
  const rows = colleges.map((c) => ({
    college_id: c.id,
    cycle_year: CYCLE_YEAR,
    status: "pending",
  }));
  if (DRY_RUN) {
    console.log(
      `  [dry-run] would upsert ${rows.length} pending rows (skip existing).`,
    );
    return;
  }
  const CHUNK = 500;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error, count } = await supabase
      .from("college_supplement_status")
      .upsert(rows.slice(i, i + CHUNK), {
        onConflict: "college_id,cycle_year",
        ignoreDuplicates: true,
        count: "exact",
      });
    if (error) throw new Error(`seed-pending: ${error.message}`);
    inserted += count ?? 0;
  }
  console.log(
    `  Done — ${inserted} new pending row(s) created (existing rows untouched).`,
  );
}

// Print the coverage dashboard for the current cycle.
async function report() {
  const [colleges, statusRows, promptRows] = await Promise.all([
    fetchAll("colleges", "id"),
    fetchAll(
      "college_supplement_status",
      "college_id, status, verified_at",
      (q) => q.eq("cycle_year", CYCLE_YEAR),
    ),
    fetchAll(
      "college_supplemental_prompts",
      "college_id, is_required, verified_at, source_type",
      (q) => q.eq("cycle_year", CYCLE_YEAR).not("verified_at", "is", null),
    ),
  ]);

  const totalColleges = colleges.length;

  const collegesWithPrompts = new Set(promptRows.map((r) => r.college_id));
  const totalPrompts = promptRows.length;
  const optionalPrompts = promptRows.filter(
    (r) => r.is_required === false,
  ).length;
  const requiredPrompts = totalPrompts - optionalPrompts;

  const verifiedNone = new Set(
    statusRows
      .filter((r) => r.verified_at && r.status === "none_required")
      .map((r) => r.college_id),
  );

  // "Checked" = a verified answer either way (has prompts, or verified none).
  const checked = new Set([...collegesWithPrompts, ...verifiedNone]);
  const pending = totalColleges - checked.size;
  const statusRowsTotal = statusRows.length;

  const bySource = {};
  for (const r of promptRows) {
    const k = r.source_type ?? "unknown";
    bySource[k] = (bySource[k] ?? 0) + 1;
  }

  console.log(`\nSupplemental prompt coverage — cycle ${CYCLE_YEAR}\n`);
  console.log(`  Colleges in database:            ${totalColleges}`);
  console.log(`  Status rows present:             ${statusRowsTotal}`);
  console.log(`  ── Verified ──────────────────`);
  console.log(`  Checked (verified answer):       ${checked.size}`);
  console.log(`    • with official prompts:       ${collegesWithPrompts.size}`);
  console.log(`    • verified no supplements:     ${verifiedNone.size}`);
  console.log(`  Pending verification:            ${pending}`);
  console.log(`  ── Prompts ───────────────────`);
  console.log(`  Total official prompts:          ${totalPrompts}`);
  console.log(`    • required:                    ${requiredPrompts}`);
  console.log(`    • optional:                    ${optionalPrompts}`);
  console.log(`  By source_type:`);
  for (const [k, n] of Object.entries(bySource).sort((a, b) => b[1] - a[1])) {
    console.log(`    • ${k}: ${n}`);
  }
  console.log("");
}

async function main() {
  if (args.includes("--report")) {
    await report();
    return;
  }
  if (args.includes("--seed-pending")) {
    await seedPending();
    return;
  }
  const colleges = candidatesRaw.colleges ?? [];
  const targets = FILTER
    ? colleges.filter((c) =>
        c.college?.toLowerCase().includes(FILTER.toLowerCase()),
      )
    : colleges;

  if (targets.length === 0) {
    console.log(
      `No candidate prompts to load (cycle ${CYCLE_YEAR}). The file ships empty; add colleges to supplemental-prompts-candidates.json.`,
    );
    return;
  }

  let added = 0;
  let updated = 0;
  let removed = 0;
  let skipped = 0;
  let statusSet = 0;

  for (const entry of targets) {
    const collegeId = await resolveCollegeId(entry.college);
    if (!collegeId) {
      console.warn(`  ! No college match for "${entry.college}" — skipping`);
      skipped += 1;
      continue;
    }

    const desired = entry.prompts ?? [];
    const { data: existingRows } = await supabase
      .from("college_supplemental_prompts")
      .select("id, prompt_text")
      .eq("college_id", collegeId)
      .eq("cycle_year", CYCLE_YEAR);
    const existingByText = new Map(
      (existingRows ?? []).map((r) => [r.prompt_text, r]),
    );
    const desiredTexts = new Set(desired.map((p) => p.prompt_text));

    // Upsert desired prompts.
    for (let i = 0; i < desired.length; i++) {
      const p = desired[i];
      const schoolId = await resolveSchoolId(collegeId, p.school);
      const verifiedAt = p.verified ? new Date().toISOString() : null;
      const row = {
        college_id: collegeId,
        school_id: schoolId,
        cycle_year: CYCLE_YEAR,
        prompt_text: p.prompt_text,
        word_limit: p.word_limit ?? null,
        is_required: p.is_required ?? true,
        sort_order: i,
        source_type: p.source_type ?? "official_site",
        source_url: p.source_url ?? null,
        source_date: SOURCE_DATE,
        verified_at: verifiedAt,
        verified_by: p.verified ? "ingest" : null,
        confidence: p.confidence ?? null,
        updated_at: new Date().toISOString(),
      };
      const existing = existingByText.get(p.prompt_text);
      if (existing) {
        if (!DRY_RUN) {
          await supabase
            .from("college_supplemental_prompts")
            .update(row)
            .eq("id", existing.id);
        }
        updated += 1;
      } else {
        if (!DRY_RUN) {
          await supabase.from("college_supplemental_prompts").insert(row);
        }
        added += 1;
      }
    }

    // Delete prompts no longer listed for this college+cycle.
    for (const [text, r] of existingByText) {
      if (!desiredTexts.has(text)) {
        if (!DRY_RUN) {
          await supabase
            .from("college_supplemental_prompts")
            .delete()
            .eq("id", r.id);
        }
        removed += 1;
      }
    }

    // Reconcile the coverage status row (has_supplements / none_required / …).
    const status = deriveStatus(entry);
    let statusNote = "";
    if (status) {
      const verified = await upsertStatus(collegeId, entry, status);
      statusSet += 1;
      statusNote = ` [status: ${status}${verified ? "" : " (unverified)"}]`;
    }

    console.log(`  ${entry.college}: ${desired.length} prompt(s)${statusNote}`);
  }

  console.log(
    `\n${DRY_RUN ? "[dry-run] " : ""}Done — added ${added}, updated ${updated}, removed ${removed}, skipped ${skipped}, status set ${statusSet} (cycle ${CYCLE_YEAR}).`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
