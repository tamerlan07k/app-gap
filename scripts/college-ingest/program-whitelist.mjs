// Curated whitelist of common undergraduate majors, keyed by 4-digit CIP family
// (the grain the College Scorecard `latest.programs.cip_4_digit` array returns).
//
// PURPOSE: Tier-A program ingest maps an institution's ACTUAL bachelor's-level
// CIP families (from IPEDS via Scorecard) onto student-facing major names, but
// ONLY for CIPs on this list — so every ingested program is (a) verified by a
// federal source to exist at that institution, and (b) a recognizable applied
// major, not a hyper-granular or graduate-only code. Nothing is invented: a
// college gets a program row ONLY if its Scorecard record reports that CIP at
// bachelor's level.
//
// Degree is intentionally NOT encoded here — IPEDS confirms a bachelor's program
// exists in a CIP but not whether it is a B.A. vs B.S. (a local catalog fact).
// Tier-A therefore leaves college_programs.degree NULL ("Not sure yet"); the
// verified degree is layered on later per-institution (Tier B).
//
// Keys are the 4-character CIP-family code exactly as Scorecard returns it
// (leading zero preserved). Tune this list freely — it is the single lever that
// controls program breadth across all institutions.

export const CIP_WHITELIST = {
  // ── Agriculture & natural resources ──────────────────────────────────────
  "0101": "Agricultural Business & Economics",
  "0109": "Animal Sciences",
  "0110": "Food Science",
  "0111": "Plant & Soil Sciences",
  "0301": "Environmental Science",
  "0305": "Forestry & Natural Resources",

  // ── Architecture & design ────────────────────────────────────────────────
  "0402": "Architecture",
  "0403": "City & Regional Planning",
  "0404": "Environmental Design",
  "0406": "Landscape Architecture",

  // ── Area, ethnic & gender studies ────────────────────────────────────────
  "0501": "Area & Cultural Studies",
  "0502": "Ethnic, Gender & Group Studies",

  // ── Communication & media ────────────────────────────────────────────────
  "0901": "Communication Studies",
  "0904": "Journalism",
  "0907": "Radio, Television & Digital Media",
  "0909": "Public Relations & Advertising",

  // ── Computer & information sciences ───────────────────────────────────────
  1101: "Computer & Information Sciences",
  1102: "Computer Programming",
  1104: "Information Science",
  1107: "Computer Science",
  1108: "Data Processing",
  1109: "Computer Systems Networking",
  1110: "Information Technology & Cybersecurity",

  // ── Education ─────────────────────────────────────────────────────────────
  1301: "Education",
  1310: "Special Education",
  1312: "Teacher Education",

  // ── Engineering ───────────────────────────────────────────────────────────
  1401: "Engineering (General)",
  1402: "Aerospace Engineering",
  1405: "Biomedical Engineering",
  1407: "Chemical Engineering",
  1408: "Civil Engineering",
  1409: "Computer Engineering",
  1410: "Electrical & Electronics Engineering",
  1411: "Environmental Engineering",
  1413: "Engineering Science",
  1419: "Mechanical Engineering",
  1420: "Materials Engineering",
  1421: "Mining & Mineral Engineering",
  1422: "Naval Architecture & Marine Engineering",
  1425: "Petroleum Engineering",
  1427: "Systems Engineering",
  1435: "Industrial Engineering",
  1439: "Materials Science & Engineering",

  // ── Engineering technology ────────────────────────────────────────────────
  1503: "Electrical Engineering Technology",
  1506: "Industrial Technology",
  1508: "Mechanical Engineering Technology",

  // ── Languages & linguistics ───────────────────────────────────────────────
  1601: "Linguistics",
  1612: "Classics & Classical Languages",
  1603: "East Asian Languages",
  1605: "Germanic Languages",
  1609: "Romance Languages (French / Spanish / Italian)",

  // ── Family & consumer sciences ────────────────────────────────────────────
  1901: "Family & Consumer Sciences",
  1905: "Nutrition Sciences",
  1907: "Human Development & Family Studies",

  // ── Legal, English, liberal arts ──────────────────────────────────────────
  2201: "Legal Studies (Pre-Law)",
  2301: "English Language & Literature",
  2313: "Writing & Rhetoric",
  2401: "Liberal Arts & General Studies",

  // ── Biological sciences ───────────────────────────────────────────────────
  2601: "Biology",
  2602: "Biochemistry & Molecular Biology",
  2604: "Cell & Molecular Biology",
  2605: "Microbiology",
  2607: "Zoology",
  2608: "Genetics",
  2611: "Bioinformatics & Computational Biology",
  2613: "Ecology & Evolutionary Biology",
  2615: "Neuroscience",

  // ── Mathematics & statistics ──────────────────────────────────────────────
  2701: "Mathematics",
  2703: "Applied Mathematics",
  2705: "Statistics",

  // ── Interdisciplinary / emerging ──────────────────────────────────────────
  3001: "Biological & Physical Sciences",
  3011: "Gerontology",
  3017: "Behavioral Sciences",
  3020: "International & Global Studies",
  3022: "Classical & Ancient Studies",
  3025: "Cognitive Science",
  3070: "Data Science",
  3071: "Data Analytics",

  // ── Fitness, recreation & sport ───────────────────────────────────────────
  3101: "Parks, Recreation & Leisure",
  3105: "Kinesiology & Exercise Science",

  // ── Philosophy & religion ─────────────────────────────────────────────────
  3801: "Philosophy",
  3802: "Religious Studies",

  // ── Physical sciences ─────────────────────────────────────────────────────
  4001: "Physical Sciences (General)",
  4002: "Astronomy & Astrophysics",
  4004: "Atmospheric Sciences & Meteorology",
  4005: "Chemistry",
  4006: "Geological & Earth Sciences",
  4008: "Physics",

  // ── Psychology ────────────────────────────────────────────────────────────
  4201: "Psychology",

  // ── Security & criminal justice ───────────────────────────────────────────
  4301: "Criminal Justice",
  4303: "Homeland Security & Cybersecurity",
  4504: "Criminology",

  // ── Public administration & social service ────────────────────────────────
  4404: "Public Administration",
  4405: "Public Policy Analysis",
  4407: "Social Work",

  // ── Social sciences ───────────────────────────────────────────────────────
  4502: "Anthropology",
  4506: "Economics",
  4507: "Geography",
  4509: "International Relations",
  4510: "Political Science",
  4511: "Sociology",
  4512: "Urban Studies",

  // ── Transportation ────────────────────────────────────────────────────────
  4901: "Aviation & Aeronautics",

  // ── Visual & performing arts ──────────────────────────────────────────────
  5001: "Visual & Performing Arts (General)",
  5003: "Dance",
  5004: "Graphic & Applied Design",
  5005: "Drama & Theatre Arts",
  5006: "Film, Video & Photography",
  5007: "Fine & Studio Arts",
  5009: "Music",
  5010: "Arts & Entertainment Management",

  // ── Health professions ────────────────────────────────────────────────────
  5100: "Health Sciences (General)",
  5102: "Communication Sciences & Disorders",
  5107: "Health & Medical Administration",
  5120: "Pharmacy",
  5122: "Public Health",
  5138: "Nursing",

  // ── Business & management ─────────────────────────────────────────────────
  5202: "Business Administration & Management",
  5203: "Accounting",
  5206: "Business Economics",
  5207: "Entrepreneurship",
  5208: "Finance",
  5209: "Hospitality & Tourism Management",
  5210: "Human Resources Management",
  5211: "International Business",
  5212: "Management Information Systems",
  5213: "Business Analytics & Management Science",
  5214: "Marketing",
  5219: "Supply Chain & Logistics",

  // ── History ───────────────────────────────────────────────────────────────
  5401: "History",
};

/** "1107" → "11.07" for human-readable storage in college_programs.cip_code. */
export function dottedCip(code4) {
  return `${code4.slice(0, 2)}.${code4.slice(2)}`;
}
