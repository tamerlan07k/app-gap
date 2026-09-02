// Ingest VERIFIED application tracks into `college_application_tracks`.
//
// An "application track" is an application-relevant distinction that is NOT a
// separately-admitting undergraduate school — e.g. an audition/portfolio-gated
// entry, an honors college/program, a competitive direct-admit-to-major, a
// coordinated dual-degree, or an A.B.-vs-B.S.E.-style degree track. Modeling
// these as their own type (see 20260901120000_add_program_provenance_and_tracks
// .sql) keeps the University → School hierarchy honest and gives the future
// Supplemental Essays system a real key to target:
//   college_id → optional school_id → optional program_id → optional track_id.
//
// STRICT DATA RULES (mirrors ingest-schools-programs.mjs):
//   • Only real, publicly-documented tracks. Do NOT invent honors colleges,
//     auditions, or dual-degree programs. Where the granting degree isn't
//     verified, `degree` is left NULL (never fabricated).
//   • NOTHING here touches college_admission_stats or the chance engine. Tracks
//     are descriptive/routing only — they never synthesize an admit rate or
//     multiplier (assessment.ts / strength.ts read only admission stats).
//   • A track may be scoped to a school (when one exists) via `schoolName`;
//     otherwise it is college-wide (school_id = null).
//   • Every row is written PENDING: verified_at = null. Like current
//     rounds/deadlines, the app should only trust tracks a human has verified.
//   • Idempotent: upserts by natural key (college_id, name, school scope). A
//     re-run inserts only genuinely new tracks and never duplicates.
//
//   Dry run (reads the live schema, writes NOTHING — safe anywhere):
//     node scripts/college-ingest/ingest-tracks.mjs --dry-run
//   Live ingest (writes via the service role) — run AFTER the colleges +
//   (for school-scoped tracks) their schools are ingested:
//     node scripts/college-ingest/ingest-tracks.mjs
//
// Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (both in .env.local).

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Track type enum values (must match public.college_track_type).
const TRACK_TYPES = new Set([
  "degree_track",
  "honors",
  "audition_portfolio",
  "direct_admit_major",
  "coordinated_dual_degree",
]);

// Curated, verified application tracks, keyed by the college SLUG the Scorecard
// ingester assigns (slugify(canonical_name)). If a slug isn't present yet (the
// college hasn't been ingested, or its canonical name — hence slug — differs),
// the entry is SKIPPED with a warning; nothing is fabricated. Re-run after the
// --dry-run scorecard report confirms the canonical names.
//
// This V7 batch adds the audition/portfolio entry that gates admission at the
// conservatories and independent art & design colleges added alongside it — the
// clearest, most-verifiable use of the tracks layer. `schoolName` scopes a track
// to a school when the college has one (Juilliard's divisions); the others are
// single-admission, so their audition/portfolio track is college-wide.
const DATA = {
  "the-juilliard-school": [
    {
      name: "Music — Audition",
      trackType: "audition_portfolio",
      schoolName: "Music",
      notes:
        "Admission to the Music division requires a pre-screening recording and a live/recorded audition on the applicant's instrument or voice.",
      sourceUrl: "https://www.juilliard.edu/",
    },
    {
      name: "Dance — Audition",
      trackType: "audition_portfolio",
      schoolName: "Dance",
      notes:
        "Admission to the Dance division requires an in-person or video audition.",
      sourceUrl: "https://www.juilliard.edu/",
    },
    {
      name: "Drama — Audition",
      trackType: "audition_portfolio",
      schoolName: "Drama",
      notes:
        "Admission to the Drama (Acting) division requires prepared monologues and an audition.",
      sourceUrl: "https://www.juilliard.edu/",
    },
  ],
  "curtis-institute-of-music": [
    {
      name: "Audition",
      trackType: "audition_portfolio",
      notes:
        "Admission is by competitive audition; enrollment is limited to sustain a full-scholarship model.",
      sourceUrl: "https://www.curtis.edu/",
    },
  ],
  "manhattan-school-of-music": [
    {
      name: "Audition",
      trackType: "audition_portfolio",
      notes:
        "Admission requires a pre-screening recording and an audition on the applicant's instrument or voice.",
      sourceUrl: "https://www.msmnyc.edu/",
    },
  ],
  "san-francisco-conservatory-of-music": [
    {
      name: "Audition",
      trackType: "audition_portfolio",
      notes: "Admission requires a pre-screening recording and an audition.",
      sourceUrl: "https://sfcm.edu/",
    },
  ],
  "california-college-of-the-arts": [
    {
      name: "Portfolio",
      trackType: "audition_portfolio",
      notes:
        "Applicants to art & design programs submit a portfolio as part of the application.",
      sourceUrl: "https://www.cca.edu/",
    },
  ],
  "otis-college-of-art-and-design": [
    {
      name: "Portfolio",
      trackType: "audition_portfolio",
      notes: "Admission to art & design programs requires a portfolio.",
      sourceUrl: "https://www.otis.edu/",
    },
  ],
  "massachusetts-college-of-art-and-design": [
    {
      name: "Portfolio",
      trackType: "audition_portfolio",
      notes: "Admission to art & design programs requires a portfolio.",
      sourceUrl: "https://massart.edu/",
    },
  ],
  "cleveland-institute-of-art": [
    {
      name: "Portfolio",
      trackType: "audition_portfolio",
      notes: "Admission requires a portfolio review.",
      sourceUrl: "https://www.cia.edu/",
    },
  ],
};

// --dry-run: READ the live schema to compute exactly what WOULD be inserted, but
// write NOTHING.
const DRY_RUN = process.argv.slice(2).includes("--dry-run");

function loadEnv() {
  const env = {};
  try {
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {}
  return env;
}

const today = () => new Date().toISOString().slice(0, 10);

async function main() {
  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      "Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.",
    );
    process.exit(1);
  }
  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Validate track types up front (fail fast on a typo, before any DB call).
  for (const [slug, tracks] of Object.entries(DATA)) {
    for (const t of tracks) {
      if (!TRACK_TYPES.has(t.trackType)) {
        console.error(
          `Invalid track_type "${t.trackType}" for ${slug} / ${t.name}.`,
        );
        process.exit(1);
      }
    }
  }

  let tracksAdded = 0;
  let skippedNoCollege = 0;
  const summary = [];

  for (const [slug, tracks] of Object.entries(DATA)) {
    const { data: college, error: cErr } = await sb
      .from("colleges")
      .select("id, canonical_name")
      .eq("slug", slug)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!college) {
      console.warn(`SKIP: no college for slug ${slug} (not ingested yet?)`);
      skippedNoCollege += tracks.length;
      continue;
    }

    // Schools for optional scoping.
    const { data: schools } = await sb
      .from("college_schools")
      .select("id, name")
      .eq("college_id", college.id);
    const schoolIdByName = new Map((schools ?? []).map((s) => [s.name, s.id]));

    // Existing tracks for idempotent skip, keyed by name + school scope.
    const { data: existing } = await sb
      .from("college_application_tracks")
      .select("id, name, school_id")
      .eq("college_id", college.id);
    const existingKey = new Set(
      (existing ?? []).map((r) => `${r.name}::${r.school_id ?? ""}`),
    );

    let uni = 0;
    for (const t of tracks) {
      let schoolId = null;
      if (t.schoolName) {
        schoolId = schoolIdByName.get(t.schoolName) ?? null;
        if (!schoolId) {
          console.warn(
            `  note: school "${t.schoolName}" not found for ${slug}; writing "${t.name}" college-wide.`,
          );
        }
      }
      const dedupeKey = `${t.name}::${schoolId ?? ""}`;
      if (existingKey.has(dedupeKey)) continue; // idempotent

      if (!DRY_RUN) {
        const { error } = await sb.from("college_application_tracks").insert({
          college_id: college.id,
          school_id: schoolId,
          name: t.name,
          track_type: t.trackType,
          degree: t.degree ?? null,
          notes: t.notes ?? null,
          source_type: "official_site",
          source_url: t.sourceUrl ?? null,
          source_date: today(),
          verified_at: null, // pending human verification
          confidence: "medium",
        });
        if (error) throw error;
      }
      existingKey.add(dedupeKey);
      tracksAdded++;
      uni++;
    }

    summary.push(`  ${college.canonical_name}: +${uni} tracks`);
  }

  console.log(
    DRY_RUN ? "[DRY RUN] no writes performed." : "Ingestion complete.",
  );
  if (summary.length) console.log(summary.join("\n"));
  console.log(
    `TOTAL: ${tracksAdded} tracks ${DRY_RUN ? "would be added" : "added"}` +
      (skippedNoCollege
        ? `; ${skippedNoCollege} skipped (college not ingested yet).`
        : "."),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
