// Ingest VERIFIED undergraduate school/college + program structure (and the
// verified degree each grants) for a meaningful initial set of universities
// where the undergraduate school genuinely matters for the application.
//
// STRICT DATA RULES (per product requirements):
//   • Only real, publicly-documented undergraduate colleges/schools, majors, and
//     the degree they grant. Where a degree isn't verified, it is left NULL and
//     the UI falls back to a manual choice + "Not sure yet" — never fabricated.
//   • NO school-level admission statistics are written here — school/program
//     admit rates aren't publicly standardized, so the institution-level chance
//     model remains the fallback (see assessment.ts). NO chance multipliers.
//   • Idempotent: re-running upserts by natural key (college+school name,
//     college+school+program name) and updates the degree in place.
//
// A program offered by more than one school (e.g. Computer Science at Cornell —
// B.A. in Arts & Sciences vs B.S. in Engineering) is listed under EACH school,
// because the school determines the degree + the application. Each school may
// declare a `defaultDegree`; individual programs can override with an object
// { name, degree }. A program with no verified degree is a bare string.
//
// Run: node scripts/college-ingest/ingest-schools-programs.mjs

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DATA = {
  "cornell-university": [
    {
      school: "College of Arts and Sciences",
      defaultDegree: "B.A.",
      programs: [
        "Computer Science",
        "Information Science",
        "Mathematics",
        "Statistical Science",
        "Physics",
        "Chemistry",
        "Biological Sciences",
        "Economics",
        "Government",
        "Psychology",
        "English",
        "History",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Environmental Engineering",
        "Chemical and Biomolecular Engineering",
        "Biomedical Engineering",
        "Materials Science and Engineering",
        "Operations Research and Engineering",
        "Information Science, Systems, and Technology",
      ],
    },
    {
      school: "College of Agriculture and Life Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Biological Sciences",
        "Biological Engineering",
        "Environmental and Sustainability Sciences",
        "Nutritional Sciences",
        "Information Science",
        "Animal Science",
        "Plant Sciences",
      ],
    },
    {
      school: "College of Human Ecology",
      defaultDegree: "B.S.",
      programs: [
        "Human Development",
        "Human Centered Design",
        "Nutritional Sciences",
        "Fashion Design and Management",
        "Global and Public Health Sciences",
      ],
    },
    {
      school: "School of Industrial and Labor Relations",
      defaultDegree: "B.S.",
      programs: ["Industrial and Labor Relations"],
    },
    {
      school: "College of Architecture, Art, and Planning",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        { name: "Fine Arts", degree: "B.F.A." },
        { name: "Urban and Regional Studies", degree: "B.S." },
      ],
    },
    {
      school: "Cornell SC Johnson College of Business",
      defaultDegree: "B.S.",
      programs: [
        "Applied Economics and Management (Dyson)",
        "Hotel Administration (Nolan)",
      ],
    },
  ],

  "university-of-pennsylvania": [
    {
      school: "College of Arts and Sciences",
      defaultDegree: "B.A.",
      programs: [
        "Economics",
        "Mathematics",
        "Physics",
        "Biology",
        "Chemistry",
        "Cognitive Science",
        "Political Science",
        "Psychology",
        "English",
        "History",
        "Philosophy, Politics and Economics",
      ],
    },
    {
      school: "School of Engineering and Applied Science",
      defaultDegree: "B.S.E.",
      programs: [
        "Computer Science",
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering and Applied Mechanics",
        "Bioengineering",
        "Chemical and Biomolecular Engineering",
        "Materials Science and Engineering",
        "Systems Science and Engineering",
        "Digital Media Design",
      ],
    },
    {
      school: "The Wharton School",
      programs: [{ name: "Business (Economics)", degree: "B.S. in Economics" }],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
  ],

  "columbia-university-in-the-city-of-new-york": [
    {
      school: "Columbia College",
      defaultDegree: "B.A.",
      programs: [
        "Computer Science",
        "Mathematics",
        "Statistics",
        "Physics",
        "Biology",
        "Economics",
        "Political Science",
        "Psychology",
        "English",
        "History",
      ],
    },
    {
      school: "The Fu Foundation School of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical Engineering",
        "Computer Engineering",
        "Mechanical Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Industrial Engineering and Operations Research",
        "Applied Physics and Applied Mathematics",
        "Materials Science and Engineering",
      ],
    },
  ],

  "university-of-michigan-ann-arbor": [
    {
      school: "College of Literature, Science, and the Arts",
      // LSA majors grant B.A. or B.S. depending on the major, so no blanket
      // default — only the ones we can verify carry a degree.
      programs: [
        { name: "Computer Science", degree: "B.S." },
        { name: "Data Science", degree: "B.S." },
        "Mathematics",
        "Statistics",
        "Physics",
        "Chemistry",
        "Biology",
        "Economics",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.E.",
      programs: [
        "Computer Science",
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Industrial and Operations Engineering",
        "Materials Science and Engineering",
        "Robotics",
        "Data Science",
      ],
    },
    {
      school: "Stephen M. Ross School of Business",
      programs: [{ name: "Business Administration", degree: "B.B.A." }],
    },
    {
      school: "School of Music, Theatre & Dance",
      programs: ["Music", "Theatre", "Dance"],
    },
    {
      school: "Penny W. Stamps School of Art & Design",
      programs: [{ name: "Art and Design", degree: "B.F.A." }],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Kinesiology",
      defaultDegree: "B.S.",
      programs: ["Kinesiology", "Sport Management"],
    },
  ],

  "the-university-of-texas-at-austin": [
    {
      school: "College of Natural Sciences",
      // CNS grants B.S. or B.S.A. by major; left unset where unverified.
      programs: [
        "Computer Science",
        "Mathematics",
        "Statistics and Data Sciences",
        "Physics",
        "Chemistry",
        "Biology",
        "Neuroscience",
        "Astronomy",
      ],
    },
    {
      school: "Cockrell School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Chemical Engineering",
        "Civil Engineering",
        "Environmental Engineering",
        "Petroleum Engineering",
      ],
    },
    {
      school: "McCombs School of Business",
      defaultDegree: "B.B.A.",
      programs: [
        "Finance",
        "Accounting",
        "Management",
        "Marketing",
        "Management Information Systems",
      ],
    },
    {
      school: "Moody College of Communication",
      programs: [
        "Communication and Leadership",
        "Journalism",
        "Advertising",
        "Radio-Television-Film",
      ],
    },
    {
      school: "College of Liberal Arts",
      defaultDegree: "B.A.",
      programs: [
        "Economics",
        "Government",
        "History",
        "English",
        "Psychology",
        "Philosophy",
        "International Relations and Global Studies",
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Architecture",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        "Interior Design",
      ],
    },
  ],

  "new-york-university": [
    {
      school: "College of Arts and Science",
      defaultDegree: "B.A.",
      programs: [
        "Computer Science",
        "Mathematics",
        "Economics",
        "Biology",
        "Politics",
        "Psychology",
        "English",
        "History",
      ],
    },
    {
      school: "Tandon School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical and Biomolecular Engineering",
        "Biomolecular Science",
        "Data Science",
      ],
    },
    {
      school: "Leonard N. Stern School of Business",
      programs: [{ name: "Business", degree: "B.S." }],
    },
    {
      school: "Tisch School of the Arts",
      defaultDegree: "B.F.A.",
      programs: [
        "Film and Television",
        "Drama",
        "Dance",
        "Photography and Imaging",
      ],
    },
    {
      school: "Steinhardt School of Culture, Education, and Human Development",
      programs: [
        "Media, Culture, and Communication",
        "Applied Psychology",
        "Nutrition and Food Studies",
        "Music",
      ],
    },
    {
      school: "Rory Meyers College of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "Gallatin School of Individualized Study",
      programs: [{ name: "Individualized Study", degree: "B.A." }],
    },
  ],
};

function loadEnv() {
  const env = {};
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return env;
}

/** Normalize a program entry to { name, degree|null }, applying school default. */
function normalizeProgram(entry, defaultDegree) {
  if (typeof entry === "string") {
    return { name: entry, degree: defaultDegree ?? null };
  }
  return { name: entry.name, degree: entry.degree ?? defaultDegree ?? null };
}

async function main() {
  const env = loadEnv();
  const sb = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  let schoolsAdded = 0;
  let programsAdded = 0;
  let degreesSet = 0;
  const summary = [];

  for (const [slug, schools] of Object.entries(DATA)) {
    const { data: college, error: cErr } = await sb
      .from("colleges")
      .select("id, canonical_name")
      .eq("slug", slug)
      .maybeSingle();
    if (cErr) throw cErr;
    if (!college) {
      console.warn(`SKIP: no college for slug ${slug}`);
      continue;
    }

    const { data: existingSchools } = await sb
      .from("college_schools")
      .select("id, name")
      .eq("college_id", college.id);
    const schoolIdByName = new Map(
      (existingSchools ?? []).map((s) => [s.name, s.id]),
    );

    let uniSchools = 0;
    let uniPrograms = 0;

    for (const entry of schools) {
      const { school, defaultDegree, programs } = entry;
      let schoolId = schoolIdByName.get(school);
      if (!schoolId) {
        const { data: ins, error } = await sb
          .from("college_schools")
          .insert({
            college_id: college.id,
            name: school,
            admits_separately: true,
          })
          .select("id")
          .single();
        if (error) throw error;
        schoolId = ins.id;
        schoolIdByName.set(school, schoolId);
        schoolsAdded++;
        uniSchools++;
      }

      const { data: existingPrograms } = await sb
        .from("college_programs")
        .select("id, name, degree")
        .eq("college_id", college.id)
        .eq("school_id", schoolId);
      const existingByName = new Map(
        (existingPrograms ?? []).map((p) => [p.name, p]),
      );

      for (const raw of programs) {
        const { name, degree } = normalizeProgram(raw, defaultDegree);
        const existing = existingByName.get(name);
        if (!existing) {
          const { error } = await sb.from("college_programs").insert({
            college_id: college.id,
            school_id: schoolId,
            name,
            degree,
            offered: true,
          });
          if (error) throw error;
          programsAdded++;
          uniPrograms++;
          if (degree) degreesSet++;
        } else if ((existing.degree ?? null) !== (degree ?? null)) {
          // Backfill/correct the degree on an already-ingested program.
          const { error } = await sb
            .from("college_programs")
            .update({ degree })
            .eq("id", existing.id);
          if (error) throw error;
          if (degree) degreesSet++;
        }
      }
    }

    summary.push(
      `  ${college.canonical_name}: +${uniSchools} schools, +${uniPrograms} programs`,
    );
  }

  console.log("Ingestion complete.");
  console.log(summary.join("\n"));
  console.log(
    `TOTAL: ${schoolsAdded} schools, ${programsAdded} programs added; ${degreesSet} degrees written.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
