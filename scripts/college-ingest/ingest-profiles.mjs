// College profile ingester — structured FACTS only (founded year + setting).
//
// Fills public.college_profiles with citable, source-attributed structured data:
//   • founded_year  ← Wikidata inception (P571), matched on the IPEDS unitid
//                      (Wikidata property P1771) so it keys off the SAME id the
//                      DB uses — no fuzzy name matching, no wrong-college guesses.
//   • locale/setting ← College Scorecard `school.locale`, mapped to a plain
//                      urban/suburban/town/rural bucket.
//
// Nothing is invented: a college we can't resolve is left null and simply not
// written (never a fabricated year or setting). Because both come from citable
// structured sources, rows are written with facts_verified_at set — the page
// treats them as verified facts. PROSE (history / program strengths) is NOT
// touched here; that stays a separate human-verified step and its columns are
// left intact by this upsert.
//
//   Dry run (no DB writes; reads the college list + live sources):
//     node scripts/college-ingest/ingest-profiles.mjs --dry-run --limit 10
//   Live ingest (writes via the service role):
//     node scripts/college-ingest/ingest-profiles.mjs
//
// Flags: --dry-run  --limit N  --filter <substr>  --skip-existing
//   --skip-existing skips colleges that already have a college_profiles row.
//
// Env (read from process.env / .env.local, never hard-coded):
//   NEXT_PUBLIC_SUPABASE_URL        required
//   SUPABASE_SERVICE_ROLE_KEY       required for live writes
//   NEXT_PUBLIC_SUPABASE_ANON_KEY   used for the (read-only) college list in dry-run
//   COLLEGE_SCORECARD_API_KEY       required to read locale (dry-run falls back to DEMO_KEY)

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const SCORECARD_URL = "https://api.data.gov/ed/collegescorecard/v1/schools";
const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";
const USER_AGENT = "AppGap-college-ingest/1.0 (college profile facts)";

// ─── args + env ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_EXISTING = args.includes("--skip-existing");
const numArg = (name, dflt) => {
  const a = args.find((x) => x.startsWith(name));
  if (!a) return dflt;
  return Number(a.split("=")[1] ?? args[args.indexOf(a) + 1]);
};
const strArg = (name, dflt) => {
  const a = args.find((x) => x.startsWith(name));
  if (!a) return dflt;
  return a.split("=")[1] ?? args[args.indexOf(a) + 1];
};
const LIMIT = numArg("--limit", Infinity);
const FILTER = strArg("--filter", null);

function loadEnvLocal() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // optional when values already live in process.env
  }
  return env;
}
const fileEnv = loadEnvLocal();
const get = (k) => process.env[k] ?? fileEnv[k];

const SUPABASE_URL = get("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_KEY = get("SUPABASE_SERVICE_ROLE_KEY");
const ANON_KEY = get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const SCORECARD_KEY =
  get("COLLEGE_SCORECARD_API_KEY") ?? (DRY_RUN ? "DEMO_KEY" : null);

if (!SUPABASE_URL) {
  console.error("NEXT_PUBLIC_SUPABASE_URL is required.");
  process.exit(1);
}
if (!DRY_RUN && !SERVICE_KEY) {
  console.error("Live ingest needs SUPABASE_SERVICE_ROLE_KEY (RLS-bypassing).");
  process.exit(1);
}
if (!SCORECARD_KEY) {
  console.error(
    "COLLEGE_SCORECARD_API_KEY is not set (needed for setting/locale). " +
      "Free key: https://api.data.gov/signup/",
  );
  process.exit(1);
}
if (!DRY_RUN && SCORECARD_KEY === "DEMO_KEY") {
  console.error(
    "Refusing a LIVE run with DEMO_KEY. Set COLLEGE_SCORECARD_API_KEY.",
  );
  process.exit(1);
}

// Read client works with anon (colleges are public-select); writes need service.
const readKey = SERVICE_KEY ?? ANON_KEY;
if (!readKey) {
  console.error(
    "Need SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY to read the college list.",
  );
  process.exit(1);
}
const readDb = createClient(SUPABASE_URL, readKey, {
  auth: { persistSession: false },
});
const writeDb = DRY_RUN
  ? null
  : createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { persistSession: false },
    });

// ─── NCES locale → setting ─────────────────────────────────────────────────────

const LOCALE_LABEL = {
  11: "City: Large",
  12: "City: Midsize",
  13: "City: Small",
  21: "Suburb: Large",
  22: "Suburb: Midsize",
  23: "Suburb: Small",
  31: "Town: Fringe",
  32: "Town: Distant",
  33: "Town: Remote",
  41: "Rural: Fringe",
  42: "Rural: Distant",
  43: "Rural: Remote",
};
function settingBucket(code) {
  if (code == null) return null;
  const tens = Math.floor(code / 10);
  return { 1: "urban", 2: "suburban", 3: "town", 4: "rural" }[tens] ?? null;
}

// ─── sources ────────────────────────────────────────────────────────────────

/** Wikidata inception year for a batch of unitids → Map<unitid, year>. Keyed on
 * P1771 (IPEDS unit ID); takes the EARLIEST inception when several are stated. */
async function fetchFoundedYears(unitids) {
  const out = new Map();
  const CHUNK = 120;
  for (let i = 0; i < unitids.length; i += CHUNK) {
    const values = unitids
      .slice(i, i + CHUNK)
      .map((u) => `"${u}"`)
      .join(" ");
    const q =
      `SELECT ?unitid ?inception WHERE { VALUES ?unitid { ${values} } ` +
      `?item wdt:P1771 ?unitid . ?item wdt:P571 ?inception . }`;
    const res = await fetch(
      `${WIKIDATA_SPARQL}?format=json&query=${encodeURIComponent(q)}`,
      {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/sparql-results+json",
        },
      },
    );
    if (!res.ok) throw new Error(`Wikidata ${res.status}: ${await res.text()}`);
    const json = await res.json();
    for (const b of json.results?.bindings ?? []) {
      const unitid = b.unitid?.value;
      const m = /^(-?\d+)-/.exec(b.inception?.value ?? "");
      if (!unitid || !m) continue;
      const year = Number(m[1]);
      if (!Number.isFinite(year) || year < 1000 || year > 2100) continue;
      // Earliest stated inception wins (some items carry more than one).
      if (!out.has(unitid) || year < out.get(unitid)) out.set(unitid, year);
    }
  }
  return out;
}

/** Scorecard `school.locale` for one unitid → { locale, setting } or nulls. */
async function fetchSetting(unitid) {
  const url =
    `${SCORECARD_URL}?api_key=${encodeURIComponent(SCORECARD_KEY)}` +
    `&id=${encodeURIComponent(unitid)}&fields=id,school.locale`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Scorecard ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const code = json.results?.[0]?.["school.locale"] ?? null;
  return { locale: LOCALE_LABEL[code] ?? null, setting: settingBucket(code) };
}

// ─── persistence ──────────────────────────────────────────────────────────────

async function upsertProfile(collegeId, facts) {
  // Only the FACTS columns — history/program prose columns are untouched so a
  // re-run never clobbers human-verified prose.
  const row = {
    college_id: collegeId,
    founded_year: facts.foundedYear,
    locale: facts.locale,
    setting: facts.setting,
    facts_source_url:
      "https://collegescorecard.ed.gov/ (setting); https://www.wikidata.org/wiki/Property:P571 (founded)",
    facts_source_date: new Date().toISOString().slice(0, 10),
    facts_verified_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { error } = await writeDb
    .from("college_profiles")
    .upsert(row, { onConflict: "college_id" });
  if (error) throw new Error(`upsert profile failed: ${error.message}`);
}

// ─── main ───────────────────────────────────────────────────────────────────

async function loadColleges() {
  const all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await readDb
      .from("colleges")
      .select("id, canonical_name, ipeds_unitid")
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

async function main() {
  let colleges = await loadColleges();
  if (FILTER)
    colleges = colleges.filter((c) =>
      c.canonical_name.toLowerCase().includes(FILTER.toLowerCase()),
    );

  if (SKIP_EXISTING) {
    const have = new Set();
    let from = 0;
    for (;;) {
      const { data } = await readDb
        .from("college_profiles")
        .select("college_id")
        .range(from, from + 999);
      for (const r of data ?? []) have.add(r.college_id);
      if (!data || data.length < 1000) break;
      from += 1000;
    }
    colleges = colleges.filter((c) => !have.has(c.id));
  }

  colleges = colleges.slice(0, LIMIT);
  const withUnitid = colleges.filter((c) => c.ipeds_unitid != null);
  const noUnitid = colleges.length - withUnitid.length;

  console.log(
    `${DRY_RUN ? "[DRY RUN] " : ""}Profile facts — ${colleges.length} colleges` +
      `${noUnitid ? ` (${noUnitid} without a unitid → founded year unavailable)` : ""}` +
      `${SCORECARD_KEY === "DEMO_KEY" ? " (DEMO_KEY: low rate limit)" : ""}\n`,
  );

  // Founded years in bulk from Wikidata (by unitid).
  const founded = await fetchFoundedYears(
    withUnitid.map((c) => String(c.ipeds_unitid)),
  );

  const summary = {
    written: 0,
    foundedHits: 0,
    settingHits: 0,
    empty: 0,
    errors: [],
  };

  for (const c of colleges) {
    try {
      const foundedYear = c.ipeds_unitid
        ? (founded.get(String(c.ipeds_unitid)) ?? null)
        : null;
      let locale = null;
      let setting = null;
      if (c.ipeds_unitid) {
        const s = await fetchSetting(c.ipeds_unitid);
        locale = s.locale;
        setting = s.setting;
      }

      if (foundedYear == null && setting == null) {
        summary.empty++;
        console.log(`  – ${c.canonical_name}: no facts resolved (left null)`);
        continue;
      }
      if (foundedYear != null) summary.foundedHits++;
      if (setting != null) summary.settingHits++;

      console.log(
        `  ✓ ${c.canonical_name}: ` +
          `${foundedYear != null ? `founded ${foundedYear}` : "founded n/a"}, ` +
          `${setting ? `${setting} (${locale})` : "setting n/a"}`,
      );

      if (!DRY_RUN) await upsertProfile(c.id, { foundedYear, locale, setting });
      summary.written++;
    } catch (err) {
      summary.errors.push(`${c.canonical_name}: ${err.message}`);
      console.log(`  ! ERROR ${c.canonical_name}: ${err.message}`);
    }
  }

  console.log(
    `\nDone. ${DRY_RUN ? "would write" : "wrote"}=${summary.written} ` +
      `founded=${summary.foundedHits} setting=${summary.settingHits} ` +
      `no-facts=${summary.empty} errors=${summary.errors.length}`,
  );
  if (summary.errors.length)
    console.log(`Errors:\n  ${summary.errors.join("\n  ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
