// Coursework catalog — PURE reference data for classification and the school
// opportunity checklist. No DB, no network, no React.
//
// Two things live here:
//   1. SUBJECT_KEYWORDS — keyword → subject/topic hints the classifier uses to
//      place a free-text course name into a SubjectArea (+ finer topic).
//   2. COMMON_ADVANCED_COURSES — a SHORT, curated list of meaningful advanced /
//      relevant courses. This is deliberately NOT an attempt to recreate a full
//      high-school catalog; it is the focused set the student self-reports
//      availability for (School Opportunity Context). Each entry maps to a
//      SubjectArea (+ topic) so availability can be resolved for a preparation
//      area, and carries keywords so a matching TAKEN course implies the course
//      is offered.

import type { SubjectArea } from "./types";

// ─── Subject / topic keyword taxonomy ─────────────────────────────────────────
// Ordered most-specific first within each subject; the classifier scans topics
// before falling back to broad subject keywords. All matching is lowercase,
// word-ish substring.

export type TopicRule = {
  topic: string;
  subjectArea: SubjectArea;
  keywords: string[];
};

// Finer topics checked first (so "computer science" → CS, not science).
export const TOPIC_RULES: TopicRule[] = [
  // Computer science (before "science")
  {
    topic: "computer-science",
    subjectArea: "computer-science",
    keywords: [
      "computer science",
      "comp sci",
      "compsci",
      "cs principles",
      "programming",
      "coding",
      "software",
      "data structures",
      "web development",
      "app development",
      "cybersecurity",
      "information technology",
    ],
  },
  // Math topics
  {
    topic: "calculus",
    subjectArea: "math",
    keywords: ["calculus", "calc ab", "calc bc", "ab calc", "bc calc"],
  },
  {
    topic: "multivariable-calculus",
    subjectArea: "math",
    keywords: [
      "multivariable",
      "multivariate",
      "calculus iii",
      "calc 3",
      "calc iii",
      "linear algebra",
      "differential equations",
    ],
  },
  {
    topic: "statistics",
    subjectArea: "math",
    keywords: ["statistics", "stats", "probability"],
  },
  {
    topic: "precalculus",
    subjectArea: "math",
    keywords: ["precalculus", "pre-calculus", "pre calc", "precalc"],
  },
  {
    topic: "algebra-geometry",
    subjectArea: "math",
    keywords: ["algebra", "geometry", "trigonometry", "trig"],
  },
  // Sciences
  {
    topic: "physics",
    subjectArea: "science",
    keywords: ["physics", "physical science"],
  },
  {
    topic: "chemistry",
    subjectArea: "science",
    keywords: ["chemistry", "organic chem", "biochem"],
  },
  {
    topic: "biology",
    subjectArea: "science",
    keywords: ["biology", "anatomy", "physiology", "life science", "genetics"],
  },
  {
    topic: "environmental-science",
    subjectArea: "science",
    keywords: ["environmental"],
  },
  // English
  {
    topic: "english",
    subjectArea: "english",
    keywords: [
      "english",
      "literature",
      "composition",
      "language arts",
      "writing",
      "rhetoric",
      "lang & comp",
      "lit & comp",
    ],
  },
  // Social studies
  {
    topic: "economics",
    subjectArea: "social-studies",
    keywords: ["economics", "econ", "microeconomics", "macroeconomics"],
  },
  {
    topic: "government",
    subjectArea: "social-studies",
    keywords: ["government", "politics", "civics", "gov & pol"],
  },
  {
    topic: "psychology",
    subjectArea: "social-studies",
    keywords: ["psychology", "psych"],
  },
  {
    topic: "history",
    subjectArea: "social-studies",
    keywords: [
      "history",
      "world history",
      "us history",
      "u.s. history",
      "human geography",
      "geography",
      "social studies",
      "sociology",
    ],
  },
  // World languages
  {
    topic: "world-language",
    subjectArea: "world-language",
    keywords: [
      "spanish",
      "french",
      "mandarin",
      "chinese",
      "latin",
      "german",
      "japanese",
      "italian",
      "arabic",
      "korean",
      "language and culture",
      "world language",
      "foreign language",
    ],
  },
  // Arts
  {
    topic: "arts",
    subjectArea: "arts",
    keywords: [
      "art",
      "studio art",
      "drawing",
      "painting",
      "music",
      "music theory",
      "band",
      "orchestra",
      "choir",
      "theater",
      "theatre",
      "drama",
      "dance",
      "photography",
      "design",
      "ceramics",
    ],
  },
];

// ─── Curated advanced-course checklist (School Opportunity Context) ────────────
// SHORT and meaningful. Keyed by course_key (stored in school_course_availability).
// `topic` links each item to the preparation areas in field-requirements.ts.

export type CatalogCourse = {
  key: string;
  label: string;
  subjectArea: SubjectArea;
  topic: string | null;
  /** Keywords that mark a TAKEN course as this catalog course (⇒ offered). */
  keywords: string[];
};

export const COMMON_ADVANCED_COURSES: CatalogCourse[] = [
  // Mathematics
  {
    key: "ap-calculus-ab",
    label: "AP Calculus AB",
    subjectArea: "math",
    topic: "calculus",
    keywords: ["calculus ab", "calc ab", "ab calculus"],
  },
  {
    key: "ap-calculus-bc",
    label: "AP Calculus BC",
    subjectArea: "math",
    topic: "calculus",
    keywords: ["calculus bc", "calc bc", "bc calculus"],
  },
  {
    key: "ap-statistics",
    label: "AP Statistics",
    subjectArea: "math",
    topic: "statistics",
    keywords: ["statistics", "ap stats"],
  },
  {
    key: "multivariable-calculus",
    label: "Multivariable Calculus / Linear Algebra (post-AP)",
    subjectArea: "math",
    topic: "multivariable-calculus",
    keywords: ["multivariable", "linear algebra", "differential equations"],
  },
  // Sciences
  {
    key: "ap-biology",
    label: "AP Biology",
    subjectArea: "science",
    topic: "biology",
    keywords: ["ap biology", "ap bio"],
  },
  {
    key: "ap-chemistry",
    label: "AP Chemistry",
    subjectArea: "science",
    topic: "chemistry",
    keywords: ["ap chemistry", "ap chem"],
  },
  {
    key: "ap-physics-1",
    label: "AP Physics 1 / 2",
    subjectArea: "science",
    topic: "physics",
    keywords: ["ap physics 1", "ap physics 2", "ap physics i"],
  },
  {
    key: "ap-physics-c",
    label: "AP Physics C",
    subjectArea: "science",
    topic: "physics",
    keywords: ["physics c"],
  },
  {
    key: "ap-environmental-science",
    label: "AP Environmental Science",
    subjectArea: "science",
    topic: "environmental-science",
    keywords: ["environmental science", "apes"],
  },
  // Computer science
  {
    key: "ap-csa",
    label: "AP Computer Science A",
    subjectArea: "computer-science",
    topic: "computer-science",
    keywords: ["computer science a", "cs a", "ap csa"],
  },
  {
    key: "ap-csp",
    label: "AP Computer Science Principles",
    subjectArea: "computer-science",
    topic: "computer-science",
    keywords: ["computer science principles", "cs principles", "ap csp"],
  },
  // English
  {
    key: "ap-english-lang",
    label: "AP English Language",
    subjectArea: "english",
    topic: "english",
    keywords: ["english language", "lang & comp", "language and composition"],
  },
  {
    key: "ap-english-lit",
    label: "AP English Literature",
    subjectArea: "english",
    topic: "english",
    keywords: [
      "english literature",
      "lit & comp",
      "literature and composition",
    ],
  },
  // Social studies
  {
    key: "ap-us-history",
    label: "AP U.S. History",
    subjectArea: "social-studies",
    topic: "history",
    keywords: ["us history", "u.s. history", "apush"],
  },
  {
    key: "ap-world-history",
    label: "AP World History",
    subjectArea: "social-studies",
    topic: "history",
    keywords: ["world history"],
  },
  {
    key: "ap-government",
    label: "AP Government & Politics",
    subjectArea: "social-studies",
    topic: "government",
    keywords: ["government", "gov & pol", "politics"],
  },
  {
    key: "ap-economics",
    label: "AP Economics (Micro / Macro)",
    subjectArea: "social-studies",
    topic: "economics",
    keywords: ["economics", "microeconomics", "macroeconomics"],
  },
  {
    key: "ap-psychology",
    label: "AP Psychology",
    subjectArea: "social-studies",
    topic: "psychology",
    keywords: ["psychology"],
  },
  // World language
  {
    key: "ap-world-language",
    label: "AP World Language (any)",
    subjectArea: "world-language",
    topic: "world-language",
    keywords: ["language and culture", "ap spanish", "ap french", "ap latin"],
  },
  // Arts
  {
    key: "ap-arts",
    label: "AP Art / Music Theory",
    subjectArea: "arts",
    topic: "arts",
    keywords: ["studio art", "art and design", "music theory", "art history"],
  },
];

/** Human-readable label for a subject area. */
export const SUBJECT_AREA_LABELS: Record<SubjectArea, string> = {
  math: "Mathematics",
  science: "Science",
  "computer-science": "Computer Science",
  english: "English / Writing",
  "social-studies": "Social Studies",
  "world-language": "World Language",
  arts: "Arts",
  other: "Other",
};

/** Curated checklist grouped by subject area, in display order. */
export function checklistBySubject(): Array<{
  subjectArea: SubjectArea;
  label: string;
  courses: CatalogCourse[];
}> {
  const order: SubjectArea[] = [
    "math",
    "science",
    "computer-science",
    "english",
    "social-studies",
    "world-language",
    "arts",
  ];
  return order
    .map((subjectArea) => ({
      subjectArea,
      label: SUBJECT_AREA_LABELS[subjectArea],
      courses: COMMON_ADVANCED_COURSES.filter(
        (c) => c.subjectArea === subjectArea,
      ),
    }))
    .filter((g) => g.courses.length > 0);
}
