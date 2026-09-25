// Load VERIFIED harvester results (harvest-results.json) into the DB.
//
// Only entries with verified === true are written. For has_supplements we
// reconcile the college's harvested prompt set for the cycle; for none_required
// we set the status row. Provenance is recorded as source_type 'official_site',
// verified_by 'harvest:gemini-2.5-flash' + the exact source_url, so harvested
// rows are always distinguishable from hand-verified ones.
//
// Never touches hand-verified colleges (the harvester skips them, so they never
// appear in harvest-results.json). Idempotent.
//
//   node scripts/college-ingest/load-harvest.mjs [--dry-run]

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const RESULTS_PATH = join(HERE, "harvest-results.json");
const CYCLE_YEAR = "2026-2027";
const DRY_RUN = process.argv.includes("--dry-run");
const SOURCE_DATE = "2026-09-13";

const fileEnv = {};
try {
  for (const l of readFileSync(join(process.cwd(), ".env.local"), "utf8").split(
    /\r?\n/,
  )) {
    const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) fileEnv[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
} catch {}
const get = (k) => process.env[k] ?? fileEnv[k];
const supabase = createClient(
  get("NEXT_PUBLIC_SUPABASE_URL"),
  get("SUPABASE_SERVICE_ROLE_KEY"),
  {
    auth: { persistSession: false },
  },
);

// Curated allowlist: harvested entries manually reviewed as genuine, verbatim,
// current-cycle GENERAL first-year supplements. Automated crawling drifted onto
// program-specific pages (honors/scholarship/grad/nursing/international/
// readmission/portfolio) for many schools; those are deliberately NOT loaded and
// remain pending rather than shown as wrong prompts.
const ALLOW = new Set([
  "barnard-college",
  "bentley-university",
  "biola-university",
  "bryn-mawr-college",
  "colorado-college",
  "ecclesia-college",
  "grinnell-college",
  "macalester-college",
  "maine-college-of-art-and-design",
  "moore-college-of-art-and-design",
  "occidental-college",
  "pitzer-college",
  "school-of-visual-arts",
  "seattle-pacific-university",
  "stonehill-college",
  "swarthmore-college",
  "texas-aandm-university-college-station",
  "united-states-merchant-marine-academy",
  "university-of-richmond",
  "university-of-rochester",
  "virginia-polytechnic-institute-and-state-university",
  "wake-forest-university",
  "washington-university-in-st-louis",
  "wellesley-college",
  "webb-institute",
]);

// Decode leftover HTML entities so stored prompt_text is clean human text.
function cleanText(s) {
  return s
    .replace(/&#34;|&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&#8217;|&apos;/g, "'")
    .replace(/&#38;|&amp;/g, "&")
    .replace(/&#8220;|&#8221;|&ldquo;|&rdquo;/g, '"')
    .replace(/&#8211;|&ndash;/g, "–")
    .replace(/&#8212;|&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const store = JSON.parse(readFileSync(RESULTS_PATH, "utf8"));
const entries = Object.entries(store.results).filter(
  ([, r]) => r.verified && r.status === "has_supplements" && ALLOW.has(r.slug),
);

let hasCount = 0;
let noneCount = 0;
let promptCount = 0;

for (const [collegeId, r] of entries) {
  if (r.status === "has_supplements") {
    // Dedup prompts by verbatim text.
    const seen = new Set();
    const prompts = [];
    for (const p of r.prompts ?? []) {
      const key = cleanText(p.prompt_text);
      if (key.length < 15 || seen.has(key)) continue;
      seen.add(key);
      prompts.push({ ...p, prompt_text: key });
    }
    if (prompts.length === 0) continue;

    if (!DRY_RUN) {
      // Reconcile: clear existing harvested rows for this college+cycle, insert fresh.
      await supabase
        .from("college_supplemental_prompts")
        .delete()
        .eq("college_id", collegeId)
        .eq("cycle_year", CYCLE_YEAR)
        .like("verified_by", "harvest%");
      const rows = prompts.map((p, i) => ({
        college_id: collegeId,
        cycle_year: CYCLE_YEAR,
        prompt_text: p.prompt_text.trim(),
        word_limit: Number.isFinite(p.word_limit) ? p.word_limit : null,
        is_required: p.is_required !== false,
        sort_order: i,
        source_type: "official_site",
        source_url: r.sourceUrl,
        source_date: SOURCE_DATE,
        verified_at: new Date().toISOString(),
        verified_by: "harvest:gemini-2.5-flash",
        confidence: "auto-verbatim",
      }));
      await supabase.from("college_supplemental_prompts").insert(rows);
      await supabase.from("college_supplement_status").upsert(
        {
          college_id: collegeId,
          cycle_year: CYCLE_YEAR,
          status: "has_supplements",
          notes: r.note || null,
          source_type: "official_site",
          source_url: r.sourceUrl,
          source_date: SOURCE_DATE,
          verified_at: new Date().toISOString(),
          verified_by: "harvest:gemini-2.5-flash",
          confidence: "auto-verbatim",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "college_id,cycle_year" },
      );
    }
    hasCount += 1;
    promptCount += prompts.length;
  } else if (r.status === "none_required") {
    if (!DRY_RUN) {
      await supabase.from("college_supplement_status").upsert(
        {
          college_id: collegeId,
          cycle_year: CYCLE_YEAR,
          status: "none_required",
          notes:
            r.note ||
            "No supplemental essay found on official application pages.",
          source_type: "official_site",
          source_url: r.sourceUrl,
          source_date: SOURCE_DATE,
          verified_at: new Date().toISOString(),
          verified_by: "harvest:gemini-2.5-flash",
          confidence: "auto",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "college_id,cycle_year" },
      );
    }
    noneCount += 1;
  }
}

console.log(
  `${DRY_RUN ? "[dry-run] " : ""}Loaded ${hasCount} has_supplements (${promptCount} prompts) + ${noneCount} none_required from ${entries.length} verified harvest entries.`,
);
