// Academic-direction taxonomy — the single source of truth for the hierarchical
// major picker (onboarding Step 3, My Profile) and for representing a student's
// academic direction across the app.
//
// THREE LEVELS:
//   Broad area  →  Specific major  →  Optional specialization/interest
//
// Design rules:
//   • Genuinely distinct fields are SEPARATE majors (Mathematics ≠ Statistics ≠
//     Physics ≠ Astronomy; Computer Science ≠ Data Science ≠ Software Engineering
//     ≠ Computer Engineering; each engineering discipline is its own major).
//   • Closely-related specializations live UNDERNEATH the appropriate major.
//   • Not padded with meaningless micro-majors.
//
// BACKWARD COMPATIBILITY: every major carries a `fieldKey`, which maps to the
// pre-existing coarse taxonomy stored in `profiles.major_category` and used by
// the college field-fit layer (`college_field_strengths.field_key`) and the AI
// prompt's label maps. When a student picks a specific major we auto-derive
// `major_category = fieldKey`, so ALL existing readers keep working unchanged
// while `profiles.academic_major` carries the precise, granular direction.
//
// The taxonomy is NEVER used to fabricate admission multipliers — only verified
// college/program admission data drives college-specific chance estimates.

/** The coarse field-fit keys (pre-existing `profiles.major_category` values). */
export type FieldKey =
  | "cs"
  | "engineering"
  | "bio-premed"
  | "business"
  | "math-physics"
  | "polisci"
  | "psych"
  | "humanities"
  | "design"
  | "education"
  | "law"
  | "undecided"
  | "other";

export interface Specialization {
  key: string;
  label: string;
}

export interface Major {
  key: string;
  label: string;
  /** Coarse field-fit key; auto-written to `profiles.major_category`. */
  fieldKey: FieldKey;
  specializations?: Specialization[];
}

export interface AcademicArea {
  key: string;
  label: string;
  majors: Major[];
}

// ─── The taxonomy ─────────────────────────────────────────────────────────────

export const ACADEMIC_AREAS: AcademicArea[] = [
  {
    key: "computing",
    label: "Computing & Information",
    majors: [
      {
        key: "computer-science",
        label: "Computer Science",
        fieldKey: "cs",
        specializations: [
          { key: "ai", label: "Artificial Intelligence" },
          { key: "machine-learning", label: "Machine Learning" },
          { key: "software-development", label: "Software Development" },
          { key: "algorithms", label: "Algorithms & Theory" },
          { key: "cybersecurity", label: "Cybersecurity" },
          { key: "hci", label: "Human–Computer Interaction" },
          { key: "computer-graphics", label: "Computer Graphics" },
          { key: "systems-networks", label: "Systems & Networks" },
          { key: "databases", label: "Databases" },
        ],
      },
      {
        key: "software-engineering",
        label: "Software Engineering",
        fieldKey: "cs",
        specializations: [
          { key: "web-mobile", label: "Web & Mobile" },
          { key: "devops", label: "DevOps & Cloud" },
          { key: "distributed-systems", label: "Distributed Systems" },
        ],
      },
      {
        key: "data-science",
        label: "Data Science",
        fieldKey: "cs",
        specializations: [
          { key: "machine-learning", label: "Machine Learning" },
          { key: "data-engineering", label: "Data Engineering" },
          { key: "analytics", label: "Analytics" },
          { key: "nlp", label: "Natural Language Processing" },
        ],
      },
      {
        key: "ai-ml",
        label: "Artificial Intelligence / Machine Learning",
        fieldKey: "cs",
        specializations: [
          { key: "nlp", label: "Natural Language Processing" },
          { key: "computer-vision", label: "Computer Vision" },
          { key: "robotics-rl", label: "Robotics & Reinforcement Learning" },
          { key: "deep-learning", label: "Deep Learning" },
        ],
      },
      {
        key: "cybersecurity",
        label: "Cybersecurity",
        fieldKey: "cs",
        specializations: [
          { key: "network-security", label: "Network Security" },
          { key: "cryptography", label: "Cryptography" },
          { key: "digital-forensics", label: "Digital Forensics" },
        ],
      },
      {
        key: "information-systems",
        label: "Information Systems / IT",
        fieldKey: "cs",
      },
    ],
  },
  {
    key: "engineering",
    label: "Engineering",
    majors: [
      {
        key: "mechanical-engineering",
        label: "Mechanical Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "robotics", label: "Robotics" },
          { key: "thermofluids", label: "Thermofluids" },
          { key: "manufacturing", label: "Design & Manufacturing" },
          { key: "automotive", label: "Automotive" },
        ],
      },
      {
        key: "electrical-engineering",
        label: "Electrical Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "signals", label: "Signals & Systems" },
          { key: "power-systems", label: "Power Systems" },
          { key: "microelectronics", label: "Microelectronics" },
          { key: "communications", label: "Communications" },
        ],
      },
      {
        key: "computer-engineering",
        label: "Computer Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "embedded-systems", label: "Embedded Systems" },
          { key: "vlsi", label: "VLSI & Chip Design" },
          { key: "hardware-software", label: "Hardware–Software Co-design" },
        ],
      },
      {
        key: "civil-engineering",
        label: "Civil Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "structural", label: "Structural" },
          { key: "transportation", label: "Transportation" },
          { key: "geotechnical", label: "Geotechnical" },
        ],
      },
      {
        key: "chemical-engineering",
        label: "Chemical Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "process", label: "Process Engineering" },
          { key: "biomolecular", label: "Biomolecular" },
          { key: "materials", label: "Materials" },
        ],
      },
      {
        key: "biomedical-engineering",
        label: "Biomedical Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "bioinstrumentation", label: "Bioinstrumentation" },
          { key: "tissue-engineering", label: "Tissue Engineering" },
          { key: "medical-devices", label: "Medical Devices" },
        ],
      },
      {
        key: "aerospace-engineering",
        label: "Aerospace Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "aeronautics", label: "Aeronautics" },
          { key: "astronautics", label: "Astronautics" },
          { key: "propulsion", label: "Propulsion" },
        ],
      },
      {
        key: "environmental-engineering",
        label: "Environmental Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "water-resources", label: "Water Resources" },
          { key: "energy", label: "Energy" },
          { key: "sustainability", label: "Sustainability" },
        ],
      },
      {
        key: "materials-science",
        label: "Materials Science & Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "nanomaterials", label: "Nanomaterials" },
          { key: "polymers", label: "Polymers" },
          { key: "metallurgy", label: "Metallurgy" },
        ],
      },
      {
        key: "industrial-systems-engineering",
        label: "Industrial & Systems Engineering",
        fieldKey: "engineering",
        specializations: [
          { key: "operations-research", label: "Operations Research" },
          { key: "manufacturing-systems", label: "Manufacturing Systems" },
        ],
      },
      {
        key: "general-engineering",
        label: "General / Undecided Engineering",
        fieldKey: "engineering",
      },
    ],
  },
  {
    key: "math-stats",
    label: "Mathematics & Statistics",
    majors: [
      {
        key: "mathematics",
        label: "Mathematics",
        fieldKey: "math-physics",
        specializations: [
          { key: "pure-math", label: "Pure Mathematics" },
          { key: "applied-math", label: "Applied Mathematics" },
          { key: "probability", label: "Probability" },
        ],
      },
      {
        key: "applied-mathematics",
        label: "Applied Mathematics",
        fieldKey: "math-physics",
      },
      {
        key: "statistics",
        label: "Statistics",
        fieldKey: "math-physics",
        specializations: [
          { key: "biostatistics", label: "Biostatistics" },
          { key: "data-analysis", label: "Data Analysis" },
        ],
      },
      {
        key: "actuarial-science",
        label: "Actuarial Science",
        fieldKey: "math-physics",
      },
    ],
  },
  {
    key: "physical-sciences",
    label: "Physical Sciences",
    majors: [
      {
        key: "physics",
        label: "Physics",
        fieldKey: "math-physics",
        specializations: [
          { key: "astrophysics", label: "Astrophysics" },
          { key: "quantum", label: "Quantum Physics" },
          { key: "particle", label: "Particle Physics" },
          { key: "condensed-matter", label: "Condensed Matter" },
        ],
      },
      {
        key: "astronomy",
        label: "Astronomy / Astrophysics",
        fieldKey: "math-physics",
      },
      {
        key: "chemistry",
        label: "Chemistry",
        fieldKey: "math-physics",
        specializations: [
          { key: "organic", label: "Organic" },
          { key: "physical-chem", label: "Physical Chemistry" },
          { key: "analytical", label: "Analytical" },
        ],
      },
      {
        key: "earth-sciences",
        label: "Earth & Geological Sciences",
        fieldKey: "math-physics",
        specializations: [
          { key: "geology", label: "Geology" },
          { key: "oceanography", label: "Oceanography" },
          { key: "atmospheric", label: "Atmospheric Science" },
        ],
      },
    ],
  },
  {
    key: "life-sciences",
    label: "Life Sciences",
    majors: [
      {
        key: "biology",
        label: "Biology",
        fieldKey: "bio-premed",
        specializations: [
          { key: "molecular", label: "Molecular Biology" },
          { key: "ecology", label: "Ecology" },
          { key: "physiology", label: "Physiology" },
        ],
      },
      { key: "biochemistry", label: "Biochemistry", fieldKey: "bio-premed" },
      {
        key: "molecular-cell-biology",
        label: "Molecular & Cell Biology",
        fieldKey: "bio-premed",
      },
      { key: "genetics", label: "Genetics", fieldKey: "bio-premed" },
      { key: "microbiology", label: "Microbiology", fieldKey: "bio-premed" },
      {
        key: "ecology-evolution",
        label: "Ecology & Evolutionary Biology",
        fieldKey: "bio-premed",
      },
    ],
  },
  {
    key: "health",
    label: "Health & Medicine",
    majors: [
      { key: "pre-med", label: "Pre-Med Track", fieldKey: "bio-premed" },
      { key: "nursing", label: "Nursing", fieldKey: "bio-premed" },
      {
        key: "public-health",
        label: "Public Health",
        fieldKey: "bio-premed",
        specializations: [
          { key: "epidemiology", label: "Epidemiology" },
          { key: "health-policy", label: "Health Policy" },
          { key: "global-health", label: "Global Health" },
        ],
      },
      {
        key: "kinesiology",
        label: "Kinesiology / Exercise Science",
        fieldKey: "bio-premed",
      },
      {
        key: "nutrition",
        label: "Nutrition & Dietetics",
        fieldKey: "bio-premed",
      },
      { key: "pharmacy", label: "Pharmacy (Pre)", fieldKey: "bio-premed" },
      { key: "allied-health", label: "Allied Health", fieldKey: "bio-premed" },
    ],
  },
  {
    key: "mind",
    label: "Psychology & Cognitive Science",
    majors: [
      {
        key: "psychology",
        label: "Psychology",
        fieldKey: "psych",
        specializations: [
          { key: "clinical", label: "Clinical" },
          { key: "developmental", label: "Developmental" },
          { key: "social-psych", label: "Social Psychology" },
          { key: "io-psych", label: "Industrial/Organizational" },
        ],
      },
      {
        key: "neuroscience",
        label: "Neuroscience",
        fieldKey: "psych",
        specializations: [
          { key: "cognitive-neuro", label: "Cognitive Neuroscience" },
          { key: "behavioral-neuro", label: "Behavioral Neuroscience" },
        ],
      },
      {
        key: "cognitive-science",
        label: "Cognitive Science",
        fieldKey: "psych",
      },
    ],
  },
  {
    key: "business",
    label: "Business & Economics",
    majors: [
      {
        key: "economics",
        label: "Economics",
        fieldKey: "business",
        specializations: [
          { key: "microeconomics", label: "Microeconomics" },
          { key: "macroeconomics", label: "Macroeconomics" },
          { key: "econometrics", label: "Econometrics" },
        ],
      },
      { key: "finance", label: "Finance", fieldKey: "business" },
      { key: "accounting", label: "Accounting", fieldKey: "business" },
      {
        key: "business-administration",
        label: "Business Administration / Management",
        fieldKey: "business",
        specializations: [
          { key: "management", label: "Management" },
          { key: "strategy", label: "Strategy" },
        ],
      },
      { key: "marketing", label: "Marketing", fieldKey: "business" },
      {
        key: "entrepreneurship",
        label: "Entrepreneurship",
        fieldKey: "business",
      },
      {
        key: "operations-supply-chain",
        label: "Operations / Supply Chain",
        fieldKey: "business",
      },
      {
        key: "international-business",
        label: "International Business",
        fieldKey: "business",
      },
    ],
  },
  {
    key: "social-sciences",
    label: "Social Sciences",
    majors: [
      {
        key: "political-science",
        label: "Political Science",
        fieldKey: "polisci",
        specializations: [
          { key: "american-politics", label: "American Politics" },
          { key: "comparative-politics", label: "Comparative Politics" },
          { key: "political-theory", label: "Political Theory" },
        ],
      },
      {
        key: "international-relations",
        label: "International Relations",
        fieldKey: "polisci",
      },
      { key: "sociology", label: "Sociology", fieldKey: "polisci" },
      { key: "anthropology", label: "Anthropology", fieldKey: "polisci" },
      { key: "geography", label: "Geography", fieldKey: "polisci" },
      {
        key: "criminology",
        label: "Criminology / Criminal Justice",
        fieldKey: "polisci",
      },
    ],
  },
  {
    key: "humanities",
    label: "Humanities",
    majors: [
      { key: "english", label: "English", fieldKey: "humanities" },
      {
        key: "comparative-literature",
        label: "Comparative Literature",
        fieldKey: "humanities",
      },
      { key: "history", label: "History", fieldKey: "humanities" },
      { key: "philosophy", label: "Philosophy", fieldKey: "humanities" },
      { key: "linguistics", label: "Linguistics", fieldKey: "humanities" },
      {
        key: "religious-studies",
        label: "Religious Studies",
        fieldKey: "humanities",
      },
      { key: "classics", label: "Classics", fieldKey: "humanities" },
      {
        key: "languages-literatures",
        label: "Languages & Literatures",
        fieldKey: "humanities",
      },
      {
        key: "area-ethnic-gender-studies",
        label: "Area / Ethnic / Gender Studies",
        fieldKey: "humanities",
      },
    ],
  },
  {
    key: "communication",
    label: "Communication & Media",
    majors: [
      {
        key: "communications",
        label: "Communications",
        fieldKey: "humanities",
      },
      { key: "journalism", label: "Journalism", fieldKey: "humanities" },
      { key: "media-studies", label: "Media Studies", fieldKey: "humanities" },
      {
        key: "public-relations",
        label: "Public Relations / Advertising",
        fieldKey: "humanities",
      },
      {
        key: "film-media-production",
        label: "Film & Media Production",
        fieldKey: "design",
      },
    ],
  },
  {
    key: "arts-design",
    label: "Arts & Design",
    majors: [
      {
        key: "architecture",
        label: "Architecture",
        fieldKey: "design",
        specializations: [
          { key: "sustainable-design", label: "Sustainable Design" },
          { key: "urban-design", label: "Urban Design" },
        ],
      },
      { key: "fine-arts", label: "Fine Arts", fieldKey: "design" },
      {
        key: "graphic-design",
        label: "Graphic / Visual Design",
        fieldKey: "design",
      },
      {
        key: "industrial-design",
        label: "Industrial Design",
        fieldKey: "design",
      },
      {
        key: "music",
        label: "Music",
        fieldKey: "design",
        specializations: [
          { key: "performance", label: "Performance" },
          { key: "composition", label: "Composition" },
          { key: "music-tech", label: "Music Technology" },
        ],
      },
      { key: "theater", label: "Theater / Drama", fieldKey: "design" },
      { key: "dance", label: "Dance", fieldKey: "design" },
      { key: "art-history", label: "Art History", fieldKey: "humanities" },
      { key: "fashion-design", label: "Fashion Design", fieldKey: "design" },
    ],
  },
  {
    key: "education",
    label: "Education",
    majors: [
      {
        key: "elementary-education",
        label: "Elementary Education",
        fieldKey: "education",
      },
      {
        key: "secondary-education",
        label: "Secondary Education",
        fieldKey: "education",
      },
      {
        key: "special-education",
        label: "Special Education",
        fieldKey: "education",
      },
      {
        key: "educational-studies",
        label: "Educational Studies",
        fieldKey: "education",
      },
    ],
  },
  {
    key: "public-affairs",
    label: "Public & Environmental Affairs",
    majors: [
      { key: "public-policy", label: "Public Policy", fieldKey: "education" },
      {
        key: "public-administration",
        label: "Public Administration",
        fieldKey: "education",
      },
      {
        key: "urban-planning",
        label: "Urban & Regional Planning",
        fieldKey: "education",
      },
      {
        key: "environmental-studies",
        label: "Environmental Studies",
        fieldKey: "education",
      },
      { key: "sustainability", label: "Sustainability", fieldKey: "education" },
      {
        key: "international-development",
        label: "International Development",
        fieldKey: "polisci",
      },
    ],
  },
  {
    key: "law",
    label: "Law & Legal (Pre-Law)",
    majors: [
      { key: "pre-law", label: "Pre-Law", fieldKey: "law" },
      { key: "legal-studies", label: "Legal Studies", fieldKey: "law" },
    ],
  },
  {
    key: "undecided",
    label: "Interdisciplinary / Undecided",
    majors: [
      {
        key: "undecided",
        label: "Not sure yet / Undecided",
        fieldKey: "undecided",
      },
      {
        key: "liberal-arts-general",
        label: "Liberal Arts (General)",
        fieldKey: "other",
      },
      {
        key: "interdisciplinary-studies",
        label: "Interdisciplinary Studies",
        fieldKey: "other",
      },
    ],
  },
];

// ─── Lookups (built once) ─────────────────────────────────────────────────────

const MAJOR_INDEX: Map<string, { area: AcademicArea; major: Major }> =
  new Map();
for (const area of ACADEMIC_AREAS) {
  for (const major of area.majors) {
    MAJOR_INDEX.set(major.key, { area, major });
  }
}

/** Resolve a major key to its area + major, or null if unknown. */
export function findMajor(
  majorKey: string | null | undefined,
): { area: AcademicArea; major: Major } | null {
  if (!majorKey) return null;
  return MAJOR_INDEX.get(majorKey) ?? null;
}

/** The broad-area key that contains a given major, or null. */
export function areaForMajor(
  majorKey: string | null | undefined,
): string | null {
  return findMajor(majorKey)?.area.key ?? null;
}

/**
 * The coarse field-fit key for a major — auto-written to `profiles.major_category`
 * so the college field-fit layer and AI prompt keep working. Unknown majors fall
 * back to "undecided" (never fabricated).
 */
export function fieldKeyForMajor(
  majorKey: string | null | undefined,
): FieldKey {
  return findMajor(majorKey)?.major.fieldKey ?? "undecided";
}

/** Display label for a major key, or the raw key if unknown. */
export function majorLabel(majorKey: string | null | undefined): string {
  if (!majorKey) return "";
  return findMajor(majorKey)?.major.label ?? majorKey;
}

/** The specializations offered under a major (empty if none / unknown). */
export function specializationsForMajor(
  majorKey: string | null | undefined,
): Specialization[] {
  return findMajor(majorKey)?.major.specializations ?? [];
}

/** Display label for a specialization key WITHIN a given major, or the raw key. */
export function specializationLabel(
  majorKey: string | null | undefined,
  specKey: string,
): string {
  const specs = specializationsForMajor(majorKey);
  return specs.find((s) => s.key === specKey)?.label ?? specKey;
}

/** Majors for a broad-area key (empty if unknown). */
export function majorsForArea(areaKey: string | null | undefined): Major[] {
  if (!areaKey) return [];
  return ACADEMIC_AREAS.find((a) => a.key === areaKey)?.majors ?? [];
}
