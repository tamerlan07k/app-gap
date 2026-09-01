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

  // ═══════════════════════════════════════════════════════════════════════════
  // V2 STRUCTURE EXPANSION — universities whose undergraduates APPLY INTO a
  // specific school/college (or a school with a distinct degree), so the school
  // is a real application target (future supplemental-essay key). Same STRICT
  // rules as above:
  //   • Only schools that genuinely admit separately / are chosen at application.
  //     Universities with a single undergraduate admission (most publics, LACs,
  //     regional publics, HBCUs, art/music specialists, service academies, and
  //     each CUNY/CSU/SUNY campus, which are their own `colleges` rows) get NO
  //     entry here — absence of school rows IS the University → Program model.
  //   • Degrees only where verified. Arts-&-Sciences / Liberal-Arts colleges that
  //     grant B.A. OR B.S. by major carry NO defaultDegree (programs fall back to
  //     "Not sure yet"). Professional schools carry their real single degree.
  //   • No school-level admit rates, no multipliers (see assessment.ts).
  // Keys are slugify(canonical_name) — the same slug the Scorecard ingester wrote.
  // ═══════════════════════════════════════════════════════════════════════════

  "duke-university": [
    {
      school: "Trinity College of Arts & Sciences",
      // Grants A.B. or B.S. by major — no blanket default.
      programs: [
        "Computer Science",
        "Economics",
        "Public Policy",
        "Biology",
        "Political Science",
        "Psychology",
        "English",
        "History",
      ],
    },
    {
      school: "Pratt School of Engineering",
      defaultDegree: "B.S.E.",
      programs: [
        "Biomedical Engineering",
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Civil and Environmental Engineering",
      ],
    },
  ],

  "northwestern-university": [
    {
      school: "Weinberg College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Mathematics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "McCormick School of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Industrial Engineering",
        "Materials Science and Engineering",
      ],
    },
    {
      school:
        "Medill School of Journalism, Media, Integrated Marketing Communications",
      programs: [{ name: "Journalism", degree: "B.S.J." }],
    },
    {
      school: "School of Communication",
      programs: [
        "Communication Studies",
        "Radio/Television/Film",
        "Theatre",
        "Human Communication Sciences",
      ],
    },
    {
      school: "Bienen School of Music",
      defaultDegree: "B.Mus.",
      programs: ["Music Performance", "Composition", "Music Education"],
    },
    {
      school: "School of Education and Social Policy",
      defaultDegree: "B.S.",
      programs: [
        "Social Policy",
        "Human Development in Context",
        "Learning Sciences",
      ],
    },
  ],

  "johns-hopkins-university": [
    {
      school: "Krieger School of Arts and Sciences",
      programs: [
        "Computer Science",
        "Public Health Studies",
        "Neuroscience",
        "International Studies",
        "Economics",
        "Molecular and Cellular Biology",
        "Political Science",
        "Writing Seminars",
      ],
    },
    {
      school: "Whiting School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Biomedical Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Chemical and Biomolecular Engineering",
        "Applied Mathematics and Statistics",
        "Civil and Systems Engineering",
      ],
    },
  ],

  "vanderbilt-university": [
    {
      school: "College of Arts and Science",
      programs: [
        "Computer Science",
        "Economics",
        "Political Science",
        "Neuroscience",
        "Biological Sciences",
        "Mathematics",
        "English",
        "Psychology",
      ],
    },
    {
      school: "School of Engineering",
      defaultDegree: "B.E.",
      programs: [
        "Computer Science",
        "Biomedical Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
      ],
    },
    {
      school: "Peabody College of Education and Human Development",
      defaultDegree: "B.S.",
      programs: [
        "Human and Organizational Development",
        "Child Studies",
        "Cognitive Studies",
        "Special Education",
      ],
    },
    {
      school: "Blair School of Music",
      defaultDegree: "B.Mus.",
      programs: ["Musical Arts", "Music Performance", "Composition"],
    },
  ],

  "georgetown-university": [
    {
      school: "Georgetown College of Arts & Sciences",
      // Grants A.B. or B.S. by major.
      programs: [
        "Government",
        "Economics",
        "Computer Science",
        "Biology",
        "History",
        "English",
        "Mathematics",
        "Psychology",
      ],
    },
    {
      school: "Walsh School of Foreign Service",
      defaultDegree: "B.S.F.S.",
      programs: [
        "International Politics",
        "International Economics",
        "Culture and Politics",
        "Regional and Comparative Studies",
        "Science, Technology, and International Affairs",
      ],
    },
    {
      school: "McDonough School of Business",
      defaultDegree: "B.S.B.A.",
      programs: [
        "Finance",
        "Management",
        "Marketing",
        "Operations and Information Management",
        "Accounting",
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Health",
      defaultDegree: "B.S.",
      programs: [
        "Global Health",
        "Health Care Management and Policy",
        "Human Science",
      ],
    },
  ],

  "carnegie-mellon-university": [
    {
      school: "School of Computer Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Artificial Intelligence",
        "Computational Biology",
        "Human-Computer Interaction",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Chemical Engineering",
        "Biomedical Engineering",
        "Civil and Environmental Engineering",
        "Materials Science and Engineering",
      ],
    },
    {
      school: "Mellon College of Science",
      defaultDegree: "B.S.",
      programs: [
        "Mathematical Sciences",
        "Physics",
        "Chemistry",
        "Biological Sciences",
      ],
    },
    {
      school: "Dietrich College of Humanities and Social Sciences",
      programs: [
        "Statistics and Machine Learning",
        "Economics",
        "Psychology",
        "Cognitive Science",
        "English",
        "History",
      ],
    },
    {
      school: "Tepper School of Business",
      defaultDegree: "B.S.",
      programs: [
        { name: "Business Administration", degree: "B.S." },
        "Economics and Statistics",
      ],
    },
    {
      school: "College of Fine Arts",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        { name: "Art", degree: "B.F.A." },
        { name: "Design", degree: "B.Des." },
        { name: "Drama", degree: "B.F.A." },
        { name: "Music", degree: "B.F.A." },
      ],
    },
  ],

  "university-of-southern-california": [
    {
      school: "Dornsife College of Letters, Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Political Science",
        "Biological Sciences",
        "Psychology",
        "International Relations",
        "English",
      ],
    },
    {
      school: "Viterbi School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Biomedical Engineering",
        "Industrial and Systems Engineering",
        "Astronautical Engineering",
      ],
    },
    {
      school: "Marshall School of Business",
      defaultDegree: "B.S.",
      programs: [
        "Business Administration",
        "Accounting",
        "World Bachelor in Business",
      ],
    },
    {
      school: "School of Cinematic Arts",
      programs: [
        { name: "Film and Television Production", degree: "B.F.A." },
        { name: "Writing for Screen and Television", degree: "B.F.A." },
        { name: "Cinema and Media Studies", degree: "B.A." },
        { name: "Interactive Media and Games", degree: "B.A." },
      ],
    },
    {
      school: "Annenberg School for Communication and Journalism",
      defaultDegree: "B.A.",
      programs: ["Communication", "Journalism", "Public Relations"],
    },
    {
      school: "Thornton School of Music",
      programs: [
        { name: "Music Performance", degree: "B.M." },
        { name: "Popular Music", degree: "B.M." },
      ],
    },
    {
      school: "Roski School of Art and Design",
      defaultDegree: "B.F.A.",
      programs: ["Fine Arts", "Design"],
    },
    {
      school: "Iovine and Young Academy",
      programs: [
        {
          name: "Arts, Technology and the Business of Innovation",
          degree: "B.S.",
        },
      ],
    },
  ],

  "tufts-university": [
    {
      school: "School of Arts and Sciences",
      programs: [
        "Computer Science",
        "International Relations",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Chemical Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "School of the Museum of Fine Arts at Tufts",
      programs: [{ name: "Fine Arts", degree: "B.F.A." }],
    },
  ],

  "university-of-california-berkeley": [
    {
      school: "College of Letters and Science",
      programs: [
        "Computer Science",
        "Economics",
        "Data Science",
        "Molecular and Cell Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Electrical Engineering and Computer Sciences",
        "Mechanical Engineering",
        "Bioengineering",
        "Civil Engineering",
        "Industrial Engineering and Operations Research",
        "Materials Science and Engineering",
      ],
    },
    {
      school: "College of Chemistry",
      defaultDegree: "B.S.",
      programs: ["Chemistry", "Chemical Engineering", "Chemical Biology"],
    },
    {
      school: "College of Environmental Design",
      defaultDegree: "B.A.",
      programs: ["Architecture", "Landscape Architecture", "Urban Studies"],
    },
    {
      school: "Haas School of Business",
      programs: [{ name: "Business Administration", degree: "B.S." }],
    },
    {
      school: "Rausser College of Natural Resources",
      defaultDegree: "B.S.",
      programs: [
        "Environmental Sciences",
        "Molecular Environmental Biology",
        "Nutritional Sciences",
      ],
    },
  ],

  "university-of-california-los-angeles": [
    {
      school: "College of Letters and Science",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "Psychobiology",
        "English",
      ],
    },
    {
      school: "Samueli School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Bioengineering",
        "Civil Engineering",
        "Computer Science and Engineering",
      ],
    },
    {
      school: "School of the Arts and Architecture",
      defaultDegree: "B.A.",
      programs: [
        "Architectural Studies",
        "Art",
        "Design Media Arts",
        "World Arts and Cultures",
      ],
    },
    {
      school: "School of Theater, Film and Television",
      defaultDegree: "B.A.",
      programs: ["Film and Television", "Theater"],
    },
    {
      school: "Herb Alpert School of Music",
      programs: [
        { name: "Music Performance", degree: "B.M." },
        { name: "Music History and Industry", degree: "B.A." },
        { name: "Ethnomusicology", degree: "B.A." },
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S." }],
    },
  ],

  "university-of-virginia-main-campus": [
    {
      school: "College of Arts and Sciences",
      // A.B. or B.S. by major.
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Politics",
        "Psychology",
        "English",
        "History",
        "Mathematics",
      ],
    },
    {
      school: "School of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Systems Engineering",
        "Aerospace Engineering",
      ],
    },
    {
      school: "School of Architecture",
      programs: [
        { name: "Architecture", degree: "B.S.Arch." },
        "Urban and Environmental Planning",
        "Architectural History",
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Education and Human Development",
      defaultDegree: "B.S.Ed.",
      programs: [
        "Kinesiology",
        "Youth and Social Innovation",
        "Speech Communication Disorders",
      ],
    },
  ],

  "georgia-institute-of-technology-main-campus": [
    {
      school: "College of Computing",
      defaultDegree: "B.S.",
      programs: ["Computer Science", "Computational Media"],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Industrial Engineering",
        "Civil Engineering",
        "Chemical and Biomolecular Engineering",
      ],
    },
    {
      school: "College of Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Mathematics",
        "Physics",
        "Biology",
        "Chemistry",
        "Neuroscience",
      ],
    },
    {
      school: "Scheller College of Business",
      programs: [{ name: "Business Administration", degree: "B.S." }],
    },
    {
      school: "College of Design",
      defaultDegree: "B.S.",
      programs: ["Architecture", "Industrial Design", "Music Technology"],
    },
    {
      school: "Ivan Allen College of Liberal Arts",
      defaultDegree: "B.S.",
      programs: [
        "Economics",
        "International Affairs",
        "Public Policy",
        "Computational Media",
      ],
    },
  ],

  "university-of-illinois-urbana-champaign": [
    {
      school: "Grainger College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Computer Engineering",
        "Aerospace Engineering",
        "Bioengineering",
        "Civil Engineering",
        "Materials Science and Engineering",
      ],
    },
    {
      school: "College of Liberal Arts and Sciences",
      programs: [
        "Mathematics and Computer Science",
        "Economics",
        "Statistics",
        "Molecular and Cellular Biology",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "Gies College of Business",
      defaultDegree: "B.S.",
      programs: ["Accountancy", "Finance", "Information Systems", "Management"],
    },
    {
      school: "College of Media",
      defaultDegree: "B.S.",
      programs: ["Journalism", "Advertising", "Media and Cinema Studies"],
    },
    {
      school: "College of Fine and Applied Arts",
      programs: [
        { name: "Architecture", degree: "B.S." },
        { name: "Music", degree: "B.Mus." },
        { name: "Graphic Design", degree: "B.F.A." },
        "Urban Planning",
      ],
    },
    {
      school: "College of Agricultural, Consumer and Environmental Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Food Science",
        "Agricultural and Consumer Economics",
        "Animal Sciences",
      ],
    },
  ],

  "boston-college": [
    {
      school: "Morrissey College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "English",
        "Communication",
      ],
    },
    {
      school: "Carroll School of Management",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Management",
        "Business Analytics",
      ],
    },
    {
      school: "Lynch School of Education and Human Development",
      programs: [
        "Applied Psychology and Human Development",
        "Elementary Education",
        "Secondary Education",
      ],
    },
    {
      school: "Connell School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
  ],

  "boston-university": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Biomedical Engineering",
      ],
    },
    {
      school: "Questrom School of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "College of Communication",
      defaultDegree: "B.S.",
      programs: [
        "Journalism",
        "Film and Television",
        "Public Relations",
        "Advertising",
      ],
    },
    {
      school: "Sargent College of Health and Rehabilitation Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Health Science",
        "Human Physiology",
        "Speech, Language and Hearing Sciences",
      ],
    },
    {
      school: "College of Fine Arts",
      programs: [
        { name: "Music", degree: "B.M." },
        { name: "Theatre Arts", degree: "B.F.A." },
        { name: "Visual Arts", degree: "B.F.A." },
      ],
    },
    {
      school: "College of Communication and Data Sciences",
      programs: [{ name: "Data Science", degree: "B.S." }],
    },
  ],

  "northeastern-university": [
    {
      school: "Khoury College of Computer Sciences",
      defaultDegree: "B.S.",
      programs: ["Computer Science", "Data Science", "Cybersecurity"],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Bioengineering",
        "Chemical Engineering",
        "Civil Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "D'Amore-McKim School of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "College of Science",
      defaultDegree: "B.S.",
      programs: [
        "Biology",
        "Behavioral Neuroscience",
        "Mathematics",
        "Physics",
        "Chemistry",
      ],
    },
    {
      school: "College of Social Sciences and Humanities",
      programs: [
        "Economics",
        "Political Science",
        "International Affairs",
        "Criminal Justice",
      ],
    },
    {
      school: "College of Arts, Media and Design",
      programs: [
        { name: "Architecture", degree: "B.S." },
        { name: "Game Design", degree: "B.S." },
        { name: "Journalism", degree: "B.A." },
        { name: "Design", degree: "B.F.A." },
      ],
    },
    {
      school: "Bouvé College of Health Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Health Science",
        "Pharmacy",
        "Nursing",
        "Behavioral Neuroscience",
      ],
    },
  ],

  "villanova-university": [
    {
      school: "College of Liberal Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Communication",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
      ],
    },
    {
      school: "Villanova School of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "M. Louise Fitzpatrick College of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
  ],

  "lehigh-university": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "P.C. Rossin College of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science and Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Industrial and Systems Engineering",
        "Chemical Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "College of Business",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Business Analytics",
        "Supply Chain Management",
      ],
    },
    {
      school: "College of Health",
      defaultDegree: "B.S.",
      programs: ["Population Health"],
    },
  ],

  "rutgers-university-new-brunswick": [
    {
      school: "School of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Engineering",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "Rutgers Business School",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Supply Chain Management",
      ],
    },
    {
      school: "School of Environmental and Biological Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Environmental Science",
        "Food Science",
        "Biotechnology",
        "Animal Science",
      ],
    },
    {
      school: "Mason Gross School of the Arts",
      programs: [
        { name: "Music", degree: "B.Mus." },
        { name: "Visual Arts", degree: "B.F.A." },
        { name: "Dance", degree: "B.F.A." },
        { name: "Theater", degree: "B.F.A." },
      ],
    },
    {
      school: "Ernest Mario School of Pharmacy",
      programs: [{ name: "Pharmacy", degree: "Pharm.D." }],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Communication and Information",
      programs: [
        "Communication",
        "Journalism and Media Studies",
        "Information Technology and Informatics",
      ],
    },
  ],

  "syracuse-university": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Biology",
        "Economics",
        "Political Science",
        "Psychology",
        "English",
        "Mathematics",
      ],
    },
    {
      school: "S.I. Newhouse School of Public Communications",
      defaultDegree: "B.S.",
      programs: [
        "Broadcast and Digital Journalism",
        "Advertising",
        "Public Relations",
        "Television, Radio and Film",
        "Magazine, News and Digital Journalism",
      ],
    },
    {
      school: "Martin J. Whitman School of Management",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Supply Chain Management",
      ],
    },
    {
      school: "College of Engineering and Computer Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical Engineering",
        "Mechanical Engineering",
        "Aerospace Engineering",
        "Bioengineering",
        "Civil Engineering",
      ],
    },
    {
      school: "College of Visual and Performing Arts",
      programs: [
        { name: "Music", degree: "B.Mus." },
        { name: "Film", degree: "B.F.A." },
        { name: "Studio Arts", degree: "B.F.A." },
        { name: "Drama", degree: "B.F.A." },
      ],
    },
    {
      school: "School of Architecture",
      programs: [{ name: "Architecture", degree: "B.Arch." }],
    },
    {
      school: "David B. Falk College of Sport and Human Dynamics",
      defaultDegree: "B.S.",
      programs: ["Sport Management", "Public Health", "Nutrition Science"],
    },
    {
      school: "School of Information Studies",
      defaultDegree: "B.S.",
      programs: ["Information Management and Technology"],
    },
  ],

  "george-washington-university": [
    {
      school: "Columbian College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Political Science",
        "Biology",
        "Psychology",
        "English",
      ],
    },
    {
      school: "School of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "School of Business",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "International Business",
        "Accountancy",
        "Business Analytics",
      ],
    },
    {
      school: "Elliott School of International Affairs",
      programs: [{ name: "International Affairs", degree: "B.A." }],
    },
    {
      school: "Corcoran School of the Arts and Design",
      programs: [
        { name: "Fine Art", degree: "B.F.A." },
        { name: "Interior Architecture", degree: "B.F.A." },
        { name: "Art History", degree: "B.A." },
      ],
    },
  ],

  "american-university": [
    {
      school: "School of International Service",
      programs: [{ name: "International Studies", degree: "B.A." }],
    },
    {
      school: "Kogod School of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "School of Communication",
      defaultDegree: "B.A.",
      programs: ["Journalism", "Film and Media Arts", "Communication Studies"],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Psychology",
        "Environmental Science",
      ],
    },
    {
      school: "School of Public Affairs",
      programs: ["Political Science", "Justice and Law", "Public Policy"],
    },
  ],

  "fordham-university": [
    {
      school: "Fordham College at Rose Hill",
      programs: [
        "Computer Science",
        "Economics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "Fordham College at Lincoln Center",
      programs: [
        "Communication and Media Studies",
        "Dance",
        "Theatre",
        "Psychology",
        "Political Science",
      ],
    },
    {
      school: "Gabelli School of Business",
      defaultDegree: "B.S.",
      programs: ["Finance", "Accounting", "Marketing", "Business Analytics"],
    },
  ],

  "the-cooper-union-for-the-advancement-of-science-and-art": [
    {
      school: "Albert Nerken School of Engineering",
      defaultDegree: "B.E.",
      programs: [
        "Electrical Engineering",
        "Mechanical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
      ],
    },
    {
      school: "Irwin S. Chanin School of Architecture",
      programs: [{ name: "Architecture", degree: "B.Arch." }],
    },
    {
      school: "School of Art",
      programs: [{ name: "Fine Arts", degree: "B.F.A." }],
    },
  ],

  "purdue-university-main-campus": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Aerospace Engineering",
        "Industrial Engineering",
        "Civil Engineering",
        "Chemical Engineering",
      ],
    },
    {
      school: "College of Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Data Science",
        "Mathematics",
        "Physics",
        "Biology",
      ],
    },
    {
      school: "Mitch Daniels School of Business",
      defaultDegree: "B.S.",
      programs: [
        "Management",
        "Finance",
        "Accounting",
        "Business Analytics and Information Management",
      ],
    },
    {
      school: "Purdue Polytechnic Institute",
      defaultDegree: "B.S.",
      programs: [
        "Cybersecurity",
        "Aviation Technology",
        "Construction Management",
        "UX Design",
      ],
    },
    {
      school: "College of Agriculture",
      defaultDegree: "B.S.",
      programs: ["Agricultural Economics", "Animal Sciences", "Food Science"],
    },
    {
      school: "College of Liberal Arts",
      programs: ["Economics", "Political Science", "Psychology", "English"],
    },
  ],

  "virginia-polytechnic-institute-and-state-university": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Computer Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Aerospace Engineering",
        "Civil Engineering",
        "Industrial and Systems Engineering",
      ],
    },
    {
      school: "Pamplin College of Business",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting and Information Systems",
        "Marketing",
        "Business Information Technology",
      ],
    },
    {
      school: "College of Science",
      defaultDegree: "B.S.",
      programs: [
        "Biological Sciences",
        "Mathematics",
        "Physics",
        "Chemistry",
        "Statistics",
      ],
    },
    {
      school: "College of Architecture, Arts, and Design",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        { name: "Industrial Design", degree: "B.S." },
        { name: "Building Construction", degree: "B.S." },
      ],
    },
    {
      school: "College of Agriculture and Life Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Animal and Poultry Sciences",
        "Food Science and Technology",
        "Agricultural Sciences",
      ],
    },
    {
      school: "College of Liberal Arts and Human Sciences",
      programs: [
        "Economics",
        "Political Science",
        "Psychology",
        "Communication",
      ],
    },
  ],

  "north-carolina-state-university-at-raleigh": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "College of Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Statistics",
        "Biological Sciences",
        "Physics",
        "Chemistry",
        "Mathematics",
      ],
    },
    {
      school: "Poole College of Management",
      defaultDegree: "B.S.",
      programs: ["Business Administration", "Accounting", "Economics"],
    },
    {
      school: "College of Design",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        { name: "Graphic and Experience Design", degree: "B.Design" },
        { name: "Industrial Design", degree: "B.Design" },
      ],
    },
    {
      school: "College of Humanities and Social Sciences",
      programs: ["Political Science", "Psychology", "Communication", "English"],
    },
    {
      school: "Wilson College of Textiles",
      defaultDegree: "B.S.",
      programs: [
        "Textile Engineering",
        "Fashion and Textile Design",
        "Textile Technology",
      ],
    },
    {
      school: "College of Agriculture and Life Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Animal Science",
        "Agricultural Business Management",
        "Biological Sciences",
      ],
    },
  ],

  "texas-aandm-university-college-station": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Aerospace Engineering",
        "Civil Engineering",
        "Industrial Engineering",
        "Petroleum Engineering",
      ],
    },
    {
      school: "Mays Business School",
      defaultDegree: "B.B.A.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Management",
        "Supply Chain Management",
      ],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Economics",
        "Biology",
        "Mathematics",
        "Political Science",
        "Psychology",
      ],
    },
    {
      school: "College of Agriculture and Life Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Animal Science",
        "Agricultural Economics",
        "Biomedical Sciences",
      ],
    },
    {
      school: "School of Architecture",
      programs: [
        { name: "Environmental Design", degree: "B.E.D." },
        { name: "Landscape Architecture", degree: "B.L.A." },
        { name: "Construction Science", degree: "B.S." },
      ],
    },
  ],

  "indiana-university-bloomington": [
    {
      school: "Kelley School of Business",
      programs: [{ name: "Business", degree: "B.S.B." }],
    },
    {
      school: "Luddy School of Informatics, Computing, and Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Informatics",
        "Intelligent Systems Engineering",
        "Data Science",
      ],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "The Media School",
      programs: ["Journalism", "Media", "Game Design"],
    },
    {
      school: "School of Public and Environmental Affairs (O'Neill)",
      defaultDegree: "B.S.",
      programs: [
        "Public Affairs",
        "Environmental Management",
        "Policy Analysis",
      ],
    },
    {
      school: "Jacobs School of Music",
      defaultDegree: "B.Mus.",
      programs: ["Music Performance", "Composition", "Music Education"],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
  ],

  "university-of-colorado-boulder": [
    {
      school: "College of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Aerospace Engineering",
        "Electrical Engineering",
        "Civil Engineering",
        "Chemical and Biological Engineering",
      ],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Economics",
        "Molecular, Cellular, and Developmental Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
      ],
    },
    {
      school: "Leeds School of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "College of Media, Communication and Information",
      defaultDegree: "B.S.",
      programs: [
        "Journalism",
        "Media Studies",
        "Communication",
        "Information Science",
      ],
    },
    {
      school: "College of Music",
      programs: [{ name: "Music", degree: "B.Mus." }],
    },
    {
      school: "Program in Environmental Design",
      programs: [{ name: "Environmental Design", degree: "B.E.D." }],
    },
  ],

  "university-of-washington-seattle-campus": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical and Computer Engineering",
        "Bioengineering",
        "Civil Engineering",
        "Aeronautics and Astronautics",
        "Industrial and Systems Engineering",
      ],
    },
    {
      school: "Paul G. Allen School of Computer Science & Engineering",
      defaultDegree: "B.S.",
      programs: ["Computer Science", "Computer Engineering"],
    },
    {
      school: "Michael G. Foster School of Business",
      programs: [{ name: "Business Administration", degree: "B.A." }],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
  ],

  "university-of-wisconsin-madison": [
    {
      school: "College of Letters & Science",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Biomedical Engineering",
        "Industrial Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "Wisconsin School of Business",
      programs: [{ name: "Business", degree: "B.B.A." }],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "College of Agricultural and Life Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Biochemistry",
        "Food Science",
        "Agricultural Business Management",
        "Genetics",
      ],
    },
  ],

  "university-of-pittsburgh-pittsburgh-campus": [
    {
      school: "Kenneth P. Dietrich School of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "Swanson School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Bioengineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "College of Business Administration",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "School of Computing and Information",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Information Science",
        "Computational Biology",
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "School of Health and Rehabilitation Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Rehabilitation Science",
        "Health Information Management",
        "Emergency Medicine",
      ],
    },
  ],

  "california-polytechnic-state-university-san-luis-obispo": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Aerospace Engineering",
        "Civil Engineering",
        "Software Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "Orfalea College of Business",
      defaultDegree: "B.S.",
      programs: ["Business Administration", "Economics"],
    },
    {
      school: "College of Agriculture, Food and Environmental Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Agricultural Business",
        "Food Science",
        "Animal Science",
        "Wine and Viticulture",
      ],
    },
    {
      school: "College of Architecture and Environmental Design",
      programs: [
        { name: "Architecture", degree: "B.Arch." },
        { name: "Construction Management", degree: "B.S." },
        { name: "City and Regional Planning", degree: "B.S." },
      ],
    },
    {
      school: "College of Liberal Arts",
      programs: [
        "Economics",
        "Political Science",
        "Psychology",
        "Communication Studies",
      ],
    },
    {
      school: "College of Science and Mathematics",
      defaultDegree: "B.S.",
      programs: ["Biological Sciences", "Mathematics", "Physics", "Statistics"],
    },
  ],

  "university-of-miami": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "English",
      ],
    },
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Industrial Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "Miami Herbert Business School",
      defaultDegree: "B.B.A.",
      programs: ["Finance", "Accounting", "Marketing", "Business Analytics"],
    },
    {
      school: "School of Communication",
      programs: [
        { name: "Broadcast Journalism", degree: "B.S.C." },
        { name: "Media Management", degree: "B.S.C." },
        { name: "Film", degree: "B.S.C." },
      ],
    },
    {
      school: "Frost School of Music",
      programs: [
        { name: "Music Performance", degree: "B.M." },
        { name: "Music Engineering Technology", degree: "B.S." },
      ],
    },
    {
      school: "School of Architecture",
      programs: [{ name: "Architecture", degree: "B.Arch." }],
    },
    {
      school: "School of Nursing and Health Studies",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "Rosenstiel School of Marine, Atmospheric, and Earth Science",
      defaultDegree: "B.S.",
      programs: ["Marine Science", "Meteorology", "Marine Affairs"],
    },
  ],

  "case-western-reserve-university": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Cognitive Science",
      ],
    },
    {
      school: "Case School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Engineering",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Biomedical Engineering",
        "Chemical Engineering",
        "Civil Engineering",
      ],
    },
    {
      school: "Weatherhead School of Management",
      defaultDegree: "B.S.",
      programs: ["Management", "Accounting", "Business Management"],
    },
    {
      school: "Frances Payne Bolton School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
  ],

  "drexel-university": [
    {
      school: "College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Civil Engineering",
        "Chemical Engineering",
        "Materials Science and Engineering",
      ],
    },
    {
      school: "College of Computing & Informatics",
      defaultDegree: "B.S.",
      programs: ["Computer Science", "Data Science", "Information Systems"],
    },
    {
      school: "LeBow College of Business",
      programs: [{ name: "Business Administration", degree: "B.S.B.A." }],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Biology",
        "Economics",
        "Psychology",
        "Political Science",
        "Mathematics",
      ],
    },
    {
      school: "Westphal College of Media Arts & Design",
      programs: [
        { name: "Graphic Design", degree: "B.S." },
        { name: "Game Design and Production", degree: "B.S." },
        { name: "Film and Television", degree: "B.S." },
        { name: "Fashion Design", degree: "B.S." },
      ],
    },
    {
      school: "College of Nursing and Health Professions",
      defaultDegree: "B.S.",
      programs: ["Nursing", "Health Sciences", "Nutrition and Foods"],
    },
  ],

  "santa-clara-university": [
    {
      school: "College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biology",
        "Political Science",
        "Psychology",
        "Communication",
      ],
    },
    {
      school: "School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science and Engineering",
        "Mechanical Engineering",
        "Electrical and Computer Engineering",
        "Bioengineering",
        "Civil Engineering",
      ],
    },
    {
      school: "Leavey School of Business",
      programs: [{ name: "Commerce", degree: "B.S.C." }],
    },
  ],

  "rochester-institute-of-technology": [
    {
      school: "Golisano College of Computing and Information Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Software Engineering",
        "Web and Mobile Computing",
        "Computing Security",
      ],
    },
    {
      school: "Kate Gleason College of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Mechanical Engineering",
        "Electrical Engineering",
        "Computer Engineering",
        "Biomedical Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "Saunders College of Business",
      defaultDegree: "B.S.",
      programs: ["Management", "Marketing", "Finance", "Accounting"],
    },
    {
      school: "College of Art and Design",
      programs: [
        { name: "Graphic Design", degree: "B.F.A." },
        { name: "Illustration", degree: "B.F.A." },
        { name: "Film and Animation", degree: "B.F.A." },
        { name: "Industrial Design", degree: "B.F.A." },
      ],
    },
    {
      school: "College of Science",
      defaultDegree: "B.S.",
      programs: [
        "Biotechnology",
        "Physics",
        "Applied Mathematics",
        "Imaging Science",
      ],
    },
  ],

  "university-of-rochester": [
    // Open-curriculum College (Arts, Sciences & Engineering) admits as ONE unit,
    // so it needs no school split — but Eastman is a SEPARATE application
    // (audition-based). Only the genuinely separate school is modeled.
    {
      school: "Eastman School of Music",
      defaultDegree: "B.Mus.",
      programs: [
        "Applied Music",
        "Composition",
        "Music Education",
        "Jazz Studies",
      ],
    },
  ],

  "university-of-maryland-college-park": [
    {
      school: "A. James Clark School of Engineering",
      defaultDegree: "B.S.",
      programs: [
        "Computer Engineering",
        "Mechanical Engineering",
        "Aerospace Engineering",
        "Electrical Engineering",
        "Bioengineering",
        "Civil Engineering",
      ],
    },
    {
      school: "Robert H. Smith School of Business",
      defaultDegree: "B.S.",
      programs: [
        "Finance",
        "Accounting",
        "Marketing",
        "Information Systems",
        "Supply Chain Management",
      ],
    },
  ],

  "ithaca-college": [
    {
      school: "School of Music, Theatre, and Dance",
      programs: [
        { name: "Music Performance", degree: "B.Mus." },
        { name: "Musical Theatre", degree: "B.F.A." },
        { name: "Acting", degree: "B.F.A." },
      ],
    },
    {
      school: "Roy H. Park School of Communications",
      defaultDegree: "B.S.",
      programs: [
        "Cinema and Photography",
        "Journalism",
        "Television and Digital Media Production",
        "Sport Media",
      ],
    },
    {
      school: "School of Business",
      defaultDegree: "B.S.",
      programs: ["Business Administration", "Accounting"],
    },
    {
      school: "School of Humanities and Sciences",
      programs: [
        "Computer Science",
        "Biology",
        "Psychology",
        "Politics",
        "English",
      ],
    },
    {
      school: "School of Health Sciences and Human Performance",
      defaultDegree: "B.S.",
      programs: ["Physical Therapy", "Exercise Science", "Health Sciences"],
    },
  ],

  "binghamton-university": [
    {
      school: "Harpur College of Arts and Sciences",
      programs: [
        "Computer Science",
        "Economics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "Mathematical Sciences",
        "English",
      ],
    },
    {
      school: "Thomas J. Watson College of Engineering and Applied Science",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Electrical and Computer Engineering",
        "Mechanical Engineering",
        "Biomedical Engineering",
        "Industrial and Systems Engineering",
      ],
    },
    {
      school: "School of Management",
      defaultDegree: "B.S.",
      programs: ["Business Administration", "Accounting"],
    },
    {
      school: "Decker College of Nursing and Health Sciences",
      programs: [{ name: "Nursing", degree: "B.S.N." }],
    },
    {
      school: "College of Community and Public Affairs",
      programs: ["Human Development", "Public Administration"],
    },
  ],

  "university-at-buffalo": [
    {
      school: "School of Engineering and Applied Sciences",
      defaultDegree: "B.S.",
      programs: [
        "Computer Science",
        "Mechanical Engineering",
        "Electrical Engineering",
        "Aerospace Engineering",
        "Biomedical Engineering",
        "Civil Engineering",
        "Industrial Engineering",
      ],
    },
    {
      school: "School of Management",
      defaultDegree: "B.S.",
      programs: ["Business Administration", "Accounting"],
    },
    {
      school: "College of Arts and Sciences",
      programs: [
        "Economics",
        "Biological Sciences",
        "Political Science",
        "Psychology",
        "Mathematics",
        "English",
      ],
    },
    {
      school: "School of Architecture and Planning",
      programs: [
        { name: "Architecture", degree: "B.S." },
        { name: "Environmental Design", degree: "B.A." },
      ],
    },
    {
      school: "School of Nursing",
      programs: [{ name: "Nursing", degree: "B.S." }],
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
