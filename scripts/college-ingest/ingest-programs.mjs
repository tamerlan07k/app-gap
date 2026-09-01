// Tier-A undergraduate program ingester (scalable, all institutions).
//
// Populates `college_programs` with the majors an institution ACTUALLY confers
// at bachelor's level, verified by a federal source (IPEDS via the College
// Scorecard `latest.programs.cip_4_digit` array), intersected with the curated
// common-major whitelist (program-whitelist.mjs). Nothing is invented:
//   • A program row is written ONLY if Scorecard reports that CIP family at
//     bachelor's credential level for that institution.
//   • Names come from the whitelist (student-facing), cip_code from the source.
//   • degree is left NULL — IPEDS confirms a bachelor's program exists but not
//     the B.A./B.S. designation (a local catalog fact); the UI shows "Not sure
//     yet". Verified degrees are layered on later per-institution (Tier B).
//   • school_id is NULL — this is the University → Program layer. Colleges that
//     have a verified school layer (college_schools) are SKIPPED here; their
//     curated school-scoped programs stay authoritative (Tier B).
//   • NOTHING here touches college_admission_stats or the chance engine.
//
//   Dry run (no DB writes; requires COLLEGE_SCORECARD_API_KEY for full scale):
//     node scripts/college-ingest/ingest-programs.mjs --dry-run
//     node scripts/college-ingest/ingest-programs.mjs --dry-run --limit 20
//   Live ingest (writes via service role) — DO NOT run until reviewed:
//     node scripts/college-ingest/ingest-programs.mjs
//
// Idempotent: upserts keyed by (college_id, cip_code); a re-run adds only newly
// whitelisted CIPs and never duplicates.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { CIP_WHITELIST, dottedCip } from "./program-whitelist.mjs";

const SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const PROG_FIELDS = [
  "id",
  "latest.programs.cip_4_digit.code",
  "latest.programs.cip_4_digit.credential.level",
].join(",");
const BACHELOR_LEVEL = 3; // Scorecard credential.level 3 = Bachelor's Degree

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");
const limitArg = args.find((a) => a.startsWith("--limit"));
const LIMIT = limitArg
  ? Number(limitArg.split("=")[1] ?? args[args.indexOf(limitArg) + 1])
  : Infinity;

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

const SCORECARD_KEY =
  get("COLLEGE_SCORECARD_API_KEY") ?? (DRY_RUN ? "DEMO_KEY" : null);
const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");

if (!SCORECARD_KEY) {
  console.error(
    "COLLEGE_SCORECARD_API_KEY is not set (needed even for full dry-run scale).",
  );
  process.exit(1);
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
  );
  process.exit(1);
}
if (!DRY_RUN && SCORECARD_KEY === "DEMO_KEY") {
  console.error("Refusing a LIVE ingest with DEMO_KEY.");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchAll(table, columns, filter) {
  const out = [];
  let from = 0;
  for (;;) {
    let q = db
      .from(table)
      .select(columns)
      .range(from, from + 999);
    if (filter) q = filter(q);
    const { data, error } = await q;
    if (error) throw error;
    out.push(...data);
    if (data.length < 1000) break;
    from += 1000;
  }
  return out;
}

async function fetchPrograms(unitid, tries = 3) {
  const url = `${SCORECARD_URL}?api_key=${encodeURIComponent(SCORECARD_KEY)}&id=${unitid}&fields=${PROG_FIELDS}&per_page=1`;
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url);
    if (res.status === 429 && attempt < tries) {
      await sleep(2000 * attempt);
      continue;
    }
    if (!res.ok)
      throw new Error(`Scorecard ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const rec = json.results?.[0];
    return rec?.["latest.programs.cip_4_digit"] ?? [];
  }
}

/** Bachelor-level whitelisted CIPs for one institution → [{ cip4, name }]. */
function whitelistedBachelors(cipEntries) {
  const seen = new Set();
  const out = [];
  for (const p of cipEntries) {
    if (p.credential?.level !== BACHELOR_LEVEL) continue;
    const code = String(p.code).padStart(4, "0");
    if (!CIP_WHITELIST[code] || seen.has(code)) continue;
    seen.add(code);
    out.push({ cip4: code, name: CIP_WHITELIST[code] });
  }
  return out;
}

async function main() {
  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Tier-A program ingest` +
      `${SCORECARD_KEY === "DEMO_KEY" ? " (DEMO_KEY: low rate limit)" : ""}` +
      `  whitelist=${Object.keys(CIP_WHITELIST).length} CIP families\n`,
  );

  // Colleges that already have a verified school layer are handled by Tier B —
  // skip them so we never duplicate their curated school-scoped programs.
  const schoolRows = await fetchAll("college_schools", "college_id");
  const hasSchool = new Set(schoolRows.map((r) => r.college_id));

  // Existing (college_id, cip_code) pairs → idempotent skip on re-run.
  const existingProgRows = await fetchAll(
    "college_programs",
    "college_id, cip_code",
  );
  const existingPair = new Set(
    existingProgRows
      .filter((r) => r.cip_code)
      .map((r) => `${r.college_id}:${r.cip_code}`),
  );
  // Colleges that ALREADY have any program row are complete — a college is
  // written as one all-or-nothing per-college batch, so "has ≥1 program" means
  // "done". Skipping them makes re-runs cheap (no wasted API calls) and lets the
  // ingest resume cleanly after a transient rate-limit, filling only the gaps.
  const collegesWithPrograms = new Set(
    existingProgRows.map((r) => r.college_id),
  );

  let colleges = (
    await fetchAll("colleges", "id, ipeds_unitid, canonical_name, slug")
  ).filter((c) => !hasSchool.has(c.id) && !collegesWithPrograms.has(c.id)); // University → Program targets not yet ingested
  colleges = colleges.slice(0, LIMIT);
  console.log(`  ${colleges.length} target colleges still needing programs\n`);

  const summary = {
    processed: 0,
    noUnitid: 0,
    withMatches: 0,
    zeroMatch: [],
    errors: [],
    programsToInsert: 0,
    perCollege: [],
  };

  for (const c of colleges) {
    if (!c.ipeds_unitid) {
      summary.noUnitid++;
      continue;
    }
    try {
      const cips = await fetchPrograms(c.ipeds_unitid);
      const wl = whitelistedBachelors(cips);
      const toInsert = wl.filter(
        (p) => !existingPair.has(`${c.id}:${dottedCip(p.cip4)}`),
      );
      summary.processed++;
      if (wl.length === 0) summary.zeroMatch.push(c.canonical_name);
      else summary.withMatches++;
      summary.programsToInsert += toInsert.length;
      summary.perCollege.push({
        name: c.canonical_name,
        matched: wl.length,
        insert: toInsert.length,
      });

      if (VERBOSE)
        console.log(
          `  ${c.canonical_name}: ${wl.length} whitelisted majors (+${toInsert.length} new)`,
        );

      if (!DRY_RUN && toInsert.length) {
        const rows = toInsert.map((p) => ({
          college_id: c.id,
          school_id: null,
          name: p.name,
          cip_code: dottedCip(p.cip4),
          cip_code_verified: true,
          offered: true,
          degree: null,
          source_type: "scorecard",
          source_url: "https://collegescorecard.ed.gov/",
          source_date: new Date().toISOString().slice(0, 10),
          confidence: "medium",
          field_status: { degree: "not_reported" },
        }));
        const { error } = await db.from("college_programs").insert(rows);
        if (error) throw error;
      }
      await sleep(90); // be polite to api.data.gov
    } catch (err) {
      summary.errors.push(`${c.canonical_name}: ${err.message}`);
      console.log(`  ! ERROR ${c.canonical_name}: ${err.message}`);
      // A sustained api.data.gov rate-limit means the hourly budget is spent —
      // stop now rather than burn requests on every remaining college. The
      // resumable target filter above means a later re-run continues the gaps.
      if (/OVER_RATE_LIMIT|429/.test(err.message)) {
        console.log(
          "  ⏸ hit api.data.gov rate limit — stopping early; re-run after the hourly window resets to finish the rest.",
        );
        break;
      }
    }
  }

  // Distribution of how many majors colleges get.
  const buckets = { 0: 0, "1-5": 0, "6-15": 0, "16-30": 0, "31+": 0 };
  for (const p of summary.perCollege) {
    const n = p.matched;
    if (n === 0) buckets["0"]++;
    else if (n <= 5) buckets["1-5"]++;
    else if (n <= 15) buckets["6-15"]++;
    else if (n <= 30) buckets["16-30"]++;
    else buckets["31+"]++;
  }

  console.log(`\n═══ TIER-A ${DRY_RUN ? "DRY-RUN" : "LIVE"} SUMMARY ═══`);
  console.log(
    `Target colleges (University→Program, no school layer): ${colleges.length}`,
  );
  console.log(`  processed:            ${summary.processed}`);
  console.log(`  no unitid (skipped):  ${summary.noUnitid}`);
  console.log(`  with ≥1 whitelisted:  ${summary.withMatches}`);
  console.log(`  with 0 whitelisted:   ${summary.zeroMatch.length}`);
  console.log(`  errors:               ${summary.errors.length}`);
  console.log(
    `PROGRAM ROWS ${DRY_RUN ? "TO INSERT" : "INSERTED"}: ${summary.programsToInsert} (degree=null, school_id=null, cip verified)`,
  );
  console.log(`Majors-per-college distribution: ${JSON.stringify(buckets)}`);
  if (summary.zeroMatch.length)
    console.log(
      `\n0-match colleges (specialized/edge — expected):\n  ${summary.zeroMatch.slice(0, 40).join("\n  ")}${summary.zeroMatch.length > 40 ? `\n  …and ${summary.zeroMatch.length - 40} more` : ""}`,
    );
  if (summary.errors.length)
    console.log(`\nErrors:\n  ${summary.errors.slice(0, 20).join("\n  ")}`);

  // A few concrete examples so the mapping is reviewable.
  const examples = summary.perCollege.filter((p) => p.matched > 0).slice(0, 8);
  if (examples.length)
    console.log(
      `\nExamples: ${examples.map((e) => `${e.name} (${e.matched})`).join(", ")}`,
    );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
