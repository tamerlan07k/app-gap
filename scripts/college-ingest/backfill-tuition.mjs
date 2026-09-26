// Tuition backfill.
//
// Fills college_admission_stats.tuition_in_state / tuition_out_of_state for
// colleges already ingested, from College Scorecard (latest.cost.tuition.*).
// This is annual published undergraduate tuition — NOT total cost of attendance.
// Nothing is invented: a school Scorecard doesn't report tuition for is left null
// (the UI shows "N/A").
//
// Why a bulk pager instead of the per-seed ingester: api.data.gov allows ~1000
// requests/hour, but there are ~1.5k colleges. So we page the whole Scorecard
// index pulling ONLY id + tuition (~65 requests total) and match rows to our
// colleges by IPEDS unitid — well under the rate limit and idempotent.
//
//   Dry run (no writes):
//     node scripts/college-ingest/backfill-tuition.mjs --dry-run
//   Live:
//     node scripts/college-ingest/backfill-tuition.mjs
//
// Secrets from environment / .env.local, never hard-coded:
//   COLLEGE_SCORECARD_API_KEY, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

function loadEnvLocal() {
  const env = {};
  try {
    const raw = readFileSync(".env.local", "utf8");
    for (const line of raw.split(/\r?\n/)) {
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
const SCORECARD_KEY = get("COLLEGE_SCORECARD_API_KEY");
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");

if (!SCORECARD_KEY) {
  console.error("COLLEGE_SCORECARD_API_KEY is required.");
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.",
  );
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

// Page the whole Scorecard index, pulling only id + tuition. Returns a map
// unitid(number) -> { in: number|null, out: number|null }.
async function fetchTuitionByUnitid() {
  const fields = [
    "id",
    "latest.cost.tuition.in_state",
    "latest.cost.tuition.out_of_state",
  ].join(",");
  const map = new Map();
  let page = 0;
  for (;;) {
    const url =
      `${SCORECARD_URL}?api_key=${encodeURIComponent(SCORECARD_KEY)}` +
      `&fields=${fields}&per_page=100&page=${page}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(
        `Scorecard ${res.status} on page ${page}: ${await res.text()}`,
      );
    }
    const json = await res.json();
    const results = json.results ?? [];
    for (const r of results) {
      const id = r.id;
      if (id == null) continue;
      map.set(Number(id), {
        in: r["latest.cost.tuition.in_state"] ?? null,
        out: r["latest.cost.tuition.out_of_state"] ?? null,
      });
    }
    const total = json.metadata?.total ?? 0;
    const perPage = json.metadata?.per_page ?? 100;
    if ((page + 1) * perPage >= total || results.length === 0) break;
    page++;
  }
  return map;
}

async function loadColleges() {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("colleges")
      .select("id, canonical_name, ipeds_unitid")
      .not("ipeds_unitid", "is", null)
      .range(from, from + 999);
    if (error) throw new Error(`load colleges: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  return rows;
}

// The most-recent scorecard stats row id per college_id.
async function loadScorecardStatsRows() {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await db
      .from("college_admission_stats")
      .select("id, college_id, source_date")
      .eq("source", "scorecard")
      .range(from, from + 999);
    if (error) throw new Error(`load stats: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
    from += 1000;
  }
  const latest = new Map();
  for (const r of rows) {
    const prev = latest.get(r.college_id);
    if (!prev || (r.source_date ?? "") > (prev.source_date ?? "")) {
      latest.set(r.college_id, r);
    }
  }
  return latest;
}

async function main() {
  console.log(`${DRY_RUN ? "[DRY RUN] " : ""}Fetching tuition from Scorecard…`);
  const [tuition, colleges, statsByCollege] = await Promise.all([
    fetchTuitionByUnitid(),
    loadColleges(),
    loadScorecardStatsRows(),
  ]);
  console.log(
    `Scorecard tuition rows: ${tuition.size}; our colleges: ${colleges.length}; ` +
      `scorecard stats rows: ${statsByCollege.size}`,
  );

  const summary = { updated: 0, noStatsRow: 0, noTuition: 0, errors: [] };
  const pending = [];
  const BATCH = 20;
  const flush = async () => {
    const chunk = pending.splice(0, pending.length);
    await Promise.all(
      chunk.map(async ({ statsId, name, tin, tout }) => {
        const { error } = await db
          .from("college_admission_stats")
          .update({
            tuition_in_state: tin,
            tuition_out_of_state: tout,
            updated_at: new Date().toISOString(),
          })
          .eq("id", statsId);
        if (error) summary.errors.push(`${name}: ${error.message}`);
        else summary.updated++;
      }),
    );
  };

  let sample = 0;
  for (const c of colleges) {
    const t = tuition.get(Number(c.ipeds_unitid));
    if (!t || (t.in == null && t.out == null)) {
      summary.noTuition++;
      continue;
    }
    const statsRow = statsByCollege.get(c.id);
    if (!statsRow) {
      summary.noStatsRow++;
      continue;
    }
    if (sample < 8) {
      console.log(`  ${c.canonical_name}: in=${t.in} out=${t.out}`);
      sample++;
    }
    if (DRY_RUN) {
      summary.updated++;
      continue;
    }
    pending.push({
      statsId: statsRow.id,
      name: c.canonical_name,
      tin: t.in,
      tout: t.out,
    });
    if (pending.length >= BATCH) await flush();
  }
  if (!DRY_RUN && pending.length) await flush();

  console.log(
    `\n${DRY_RUN ? "[DRY RUN] " : ""}Done. ` +
      `${DRY_RUN ? "would update" : "updated"}=${summary.updated} ` +
      `no-tuition-reported=${summary.noTuition} ` +
      `no-scorecard-stats-row=${summary.noStatsRow} errors=${summary.errors.length}`,
  );
  if (summary.errors.length) {
    console.log(`Errors:\n  ${summary.errors.slice(0, 20).join("\n  ")}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
