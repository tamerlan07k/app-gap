// College Scorecard ingester.
//
// Fills the standardized numeric layer (admit rate, SAT/ACT ranges, undergrad
// enrollment, location, control) from the federal College Scorecard API, keyed
// on IPEDS unitid. This is the automatable part of the pipeline; CDS factors,
// current rounds/deadlines, and logos are handled separately (see README).
//
//   Dry run (no DB writes, safe to run anywhere):
//     node scripts/college-ingest/ingest-scorecard.mjs --dry-run --limit 5
//   Live ingest (writes via the service role):
//     node scripts/college-ingest/ingest-scorecard.mjs
//
// Secrets are read from the environment / .env.local and never hard-coded:
//   COLLEGE_SCORECARD_API_KEY   required for live; dry-run falls back to DEMO_KEY
//   NEXT_PUBLIC_SUPABASE_URL    required for live
//   SUPABASE_SERVICE_ROLE_KEY   required for live (RLS-bypassing writes)
//
// Nothing is invented: fields the source does not provide are recorded as
// `not_reported` in field_status and left null.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { SEED_COLLEGES } from "./seed-colleges.mjs";

const SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";

const FIELDS = [
  "id",
  "school.name",
  "school.city",
  "school.state",
  "school.school_url",
  "school.ownership", // 1 public, 2 private nonprofit, 3 private for-profit
  "latest.student.size",
  "latest.admissions.admission_rate.overall",
  "latest.admissions.sat_scores.25th_percentile.critical_reading",
  "latest.admissions.sat_scores.midpoint.critical_reading",
  "latest.admissions.sat_scores.75th_percentile.critical_reading",
  "latest.admissions.sat_scores.25th_percentile.math",
  "latest.admissions.sat_scores.midpoint.math",
  "latest.admissions.sat_scores.75th_percentile.math",
  "latest.admissions.sat_scores.average.overall",
  "latest.admissions.act_scores.25th_percentile.cumulative",
  "latest.admissions.act_scores.midpoint.cumulative",
  "latest.admissions.act_scores.75th_percentile.cumulative",
].join(",");

// ─── args + env ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg
  ? Number(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1])
  : Infinity;
const yearArg = args.find((a) => a.startsWith("--year"));
const ACADEMIC_YEAR = yearArg
  ? (yearArg.split("=")[1] ?? args[args.indexOf(yearArg) + 1])
  : "scorecard_latest";
const filterArg = args.find((a) => a.startsWith("--filter"));
const FILTER = filterArg
  ? (filterArg.split("=")[1] ?? args[args.indexOf(filterArg) + 1])
  : null;

function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // .env.local is optional when the values are already in process.env.
  }
  return env;
}

const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];

const SCORECARD_KEY =
  get("COLLEGE_SCORECARD_API_KEY") ?? (DRY_RUN ? "DEMO_KEY" : null);
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");

if (!SCORECARD_KEY) {
  console.error(
    "COLLEGE_SCORECARD_API_KEY is not set. Get a free key at https://api.data.gov/signup/ " +
      "and set it in your environment or .env.local.",
  );
  process.exit(1);
}
if (!DRY_RUN) {
  if (SCORECARD_KEY === "DEMO_KEY") {
    console.error(
      "Refusing to run a LIVE ingest with DEMO_KEY. Set COLLEGE_SCORECARD_API_KEY.",
    );
    process.exit(1);
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error(
      "Live ingest needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    process.exit(1);
  }
}

const db = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

// ─── helpers ────────────────────────────────────────────────────────────────

const OWNERSHIP = {
  1: "public",
  2: "private_nonprofit",
  3: "private_forprofit",
};

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchCandidates(seed) {
  const url =
    `${SCORECARD_URL}?api_key=${encodeURIComponent(SCORECARD_KEY)}` +
    `&school.name=${encodeURIComponent(seed.name)}` +
    (seed.state ? `&school.state=${encodeURIComponent(seed.state)}` : "") +
    `&fields=${FIELDS}&per_page=100`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Scorecard ${res.status} for "${seed.name}": ${await res.text()}`,
    );
  }
  const json = await res.json();
  return json.results ?? [];
}

function normalizeName(s) {
  return (s ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

// Deterministic resolution: require an EXACT canonical-name + state match. We
// never fall back to a "closest" result — a wrong guess (e.g. NYU → SUNY New
// Paltz) is worse than a flagged no-match. Exactly one exact match → resolved;
// more than one → ambiguous; none → no-match (surfaced for a seed-name fix).
function pickMatch(seed, candidates) {
  const target = normalizeName(seed.name);
  const state = (seed.state ?? "").toUpperCase();
  const exact = candidates.filter(
    (c) =>
      normalizeName(c["school.name"]) === target &&
      (!state || (c["school.state"] ?? "").toUpperCase() === state),
  );
  if (exact.length === 1) return { match: exact[0], ambiguous: false };
  if (exact.length > 1) return { match: exact[0], ambiguous: true };
  return { match: null, ambiguous: false };
}

// Map a Scorecard record → { college, stats }. Fields the source omits are left
// null and marked `not_reported`; present fields are `reported`.
function mapRecord(rec) {
  const f = (k) => rec[k] ?? null;
  const status = {};
  const mark = (key, value) => {
    status[key] =
      value === null || value === undefined ? "not_reported" : "reported";
    return value ?? null;
  };

  const college = {
    ipeds_unitid: f("id"),
    canonical_name: f("school.name"),
    city: f("school.city"),
    state: f("school.state"),
    official_website: f("school.school_url"),
    institution_type: OWNERSHIP[f("school.ownership")] ?? "unknown",
  };

  const stats = {
    source: "scorecard",
    academic_year: ACADEMIC_YEAR,
    source_url: "https://collegescorecard.ed.gov/",
    admit_rate: mark(
      "admit_rate",
      f("latest.admissions.admission_rate.overall"),
    ),
    undergrad_enrollment: mark(
      "undergrad_enrollment",
      f("latest.student.size"),
    ),
    sat_ebrw_25: mark(
      "sat_ebrw_25",
      f("latest.admissions.sat_scores.25th_percentile.critical_reading"),
    ),
    sat_ebrw_50: mark(
      "sat_ebrw_50",
      f("latest.admissions.sat_scores.midpoint.critical_reading"),
    ),
    sat_ebrw_75: mark(
      "sat_ebrw_75",
      f("latest.admissions.sat_scores.75th_percentile.critical_reading"),
    ),
    sat_math_25: mark(
      "sat_math_25",
      f("latest.admissions.sat_scores.25th_percentile.math"),
    ),
    sat_math_50: mark(
      "sat_math_50",
      f("latest.admissions.sat_scores.midpoint.math"),
    ),
    sat_math_75: mark(
      "sat_math_75",
      f("latest.admissions.sat_scores.75th_percentile.math"),
    ),
    sat_total_50: mark(
      "sat_total_50",
      f("latest.admissions.sat_scores.average.overall"),
    ),
    act_composite_25: mark(
      "act_composite_25",
      f("latest.admissions.act_scores.25th_percentile.cumulative"),
    ),
    act_composite_50: mark(
      "act_composite_50",
      f("latest.admissions.act_scores.midpoint.cumulative"),
    ),
    act_composite_75: mark(
      "act_composite_75",
      f("latest.admissions.act_scores.75th_percentile.cumulative"),
    ),
    // Scorecard does not report these; other sources (IPEDS/CDS) fill them later.
    applicants: mark("applicants", null),
    admits: mark("admits", null),
    enrolled: mark("enrolled", null),
    gpa_avg: mark("gpa_avg", null),
  };

  return { college, statsFieldStatus: status, stats };
}

// ─── live persistence ─────────────────────────────────────────────────────────

async function persist(rec, mapped) {
  // Raw payload for provenance / re-processing.
  await db.from("college_ingest_raw").insert({
    source: "scorecard",
    ipeds_unitid: mapped.college.ipeds_unitid,
    payload: rec,
  });

  // Upsert the college on its unique unitid.
  const { data: col, error: colErr } = await db
    .from("colleges")
    .upsert(
      {
        ...mapped.college,
        slug: slugify(mapped.college.canonical_name),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "ipeds_unitid" },
    )
    .select("id")
    .single();
  if (colErr) throw new Error(`upsert college failed: ${colErr.message}`);

  const statsRow = {
    college_id: col.id,
    school_id: null,
    ...mapped.stats,
    field_status: mapped.statsFieldStatus,
    source_date: new Date().toISOString().slice(0, 10),
    updated_at: new Date().toISOString(),
  };

  // Idempotent per (college, year, source) — update if present, else insert.
  const { data: existing } = await db
    .from("college_admission_stats")
    .select("id")
    .eq("college_id", col.id)
    .eq("academic_year", statsRow.academic_year)
    .eq("source", "scorecard")
    .is("school_id", null)
    .maybeSingle();

  if (existing) {
    const { error } = await db
      .from("college_admission_stats")
      .update(statsRow)
      .eq("id", existing.id);
    if (error) throw new Error(`update stats failed: ${error.message}`);
  } else {
    const { error } = await db.from("college_admission_stats").insert(statsRow);
    if (error) throw new Error(`insert stats failed: ${error.message}`);
  }
}

// ─── main ───────────────────────────────────────────────────────────────────

async function main() {
  const seeds = SEED_COLLEGES.filter(
    (s) => !FILTER || s.name.toLowerCase().includes(FILTER.toLowerCase()),
  ).slice(0, LIMIT);
  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Scorecard ingest — ${seeds.length} colleges, ` +
      `academic_year="${ACADEMIC_YEAR}"${SCORECARD_KEY === "DEMO_KEY" ? " (DEMO_KEY: low rate limit)" : ""}\n`,
  );

  const summary = { ok: 0, ambiguous: [], noMatch: [], errors: [] };

  for (const seed of seeds) {
    try {
      const candidates = await fetchCandidates(seed);
      const { match, ambiguous } = pickMatch(seed, candidates);
      if (!match) {
        summary.noMatch.push(seed.name);
        console.log(
          `  ✗ NO MATCH   ${seed.name} (${seed.state}) — needs manual resolution`,
        );
        continue;
      }
      const mapped = mapRecord(match);
      const s = mapped.stats;
      const pct =
        s.admit_rate != null
          ? `${(s.admit_rate * 100).toFixed(1)}% admit`
          : "admit n/a";
      const sat = s.sat_total_50 != null ? `SAT~${s.sat_total_50}` : "SAT n/a";
      const flag = ambiguous ? " ⚠ ambiguous (verify)" : "";
      console.log(
        `  ✓ ${match["school.name"]}  [unitid ${mapped.college.ipeds_unitid}, ${match["school.city"]}, ${match["school.state"]}]  ${pct}, ${sat}${flag}`,
      );
      if (ambiguous)
        summary.ambiguous.push(`${seed.name} → ${match["school.name"]}`);

      if (!DRY_RUN) await persist(match, mapped);
      summary.ok++;
    } catch (err) {
      summary.errors.push(`${seed.name}: ${err.message}`);
      console.log(`  ! ERROR      ${seed.name}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. matched=${summary.ok} ambiguous=${summary.ambiguous.length} ` +
      `no-match=${summary.noMatch.length} errors=${summary.errors.length}`,
  );
  if (summary.ambiguous.length)
    console.log(
      `Verify these matches manually:\n  ${summary.ambiguous.join("\n  ")}`,
    );
  if (summary.noMatch.length)
    console.log(
      "No Scorecard match (resolve manually):\n  " +
        summary.noMatch.join("\n  "),
    );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
