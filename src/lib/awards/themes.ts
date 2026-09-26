// Recognition theme taxonomy — the evidence dimensions a student's awards and
// activities can demonstrate. This is the shared vocabulary that CONNECTS the
// three Awards experiences: the Recognition Map classifies awards + activities
// into these themes to find strengths and gaps; opportunities are tagged with the
// same theme keys (opportunities.evidence_dimensions), so the Opportunity Finder
// can tell "adds a new dimension" from "reinforces what you already have"; and the
// Opportunity Experiment is given the same profile so its verdict stays consistent.
//
// Classification here is DETERMINISTIC (keyword heuristics), never AI — matching
// the project convention of keeping categorization/filtering in code and reserving
// AI for interpretation.

export const RECOGNITION_THEMES = [
  "cs-ai",
  "quantitative",
  "leadership",
  "service",
  "athletics",
  "entrepreneurship",
  "research",
  "creativity",
  "academic",
] as const;

export type RecognitionTheme = (typeof RECOGNITION_THEMES)[number];

export const THEME_LABELS: Record<RecognitionTheme, string> = {
  "cs-ai": "CS / AI",
  quantitative: "Quantitative ability",
  leadership: "Leadership",
  service: "Service",
  athletics: "Athletics",
  entrepreneurship: "Entrepreneurship",
  research: "Research",
  creativity: "Creativity",
  academic: "Academic achievement",
};

export const THEME_BLURBS: Record<RecognitionTheme, string> = {
  "cs-ai": "Software, computing, and AI/ML work.",
  quantitative: "Math, competition problem-solving, and analytical rigor.",
  leadership: "Leading teams, organizations, or initiatives.",
  service: "Community impact and volunteering.",
  athletics: "Competitive sports and physical achievement.",
  entrepreneurship: "Building ventures, products, or businesses.",
  research: "Original inquiry and scholarly investigation.",
  creativity: "Art, writing, design, music, and performance.",
  academic: "Subject mastery and academic distinction.",
};

const isTheme = (v: string): v is RecognitionTheme =>
  (RECOGNITION_THEMES as readonly string[]).includes(v);

/** Keep only valid theme keys from a raw string array (e.g. a DB column). */
export function coerceThemes(
  values: string[] | null | undefined,
): RecognitionTheme[] {
  const out: RecognitionTheme[] = [];
  for (const v of values ?? []) if (isTheme(v) && !out.includes(v)) out.push(v);
  return out;
}

// ─── Keyword heuristics ──────────────────────────────────────────────────────
// Additive: an award can demonstrate several themes at once. Each keyword is
// matched as a WHOLE WORD / PHRASE (word boundaries on both sides), never a raw
// substring — so "design" does not match "designed", "art" does not match
// "artificial", and "app" does not match "apply". Interior spaces match a run of
// spaces/hyphens/slashes. Keywords are kept SPECIFIC on purpose: short,
// cross-domain tokens (e.g. "tournament", "medal", bare "championship") are
// deliberately avoided, because a debate tournament is not athletics. Where a
// word has several forms (leader/leadership, entrepreneur/entrepreneurship) the
// needed forms are listed explicitly rather than relying on prefix matching.

const THEME_KEYWORDS: Record<RecognitionTheme, string[]> = {
  "cs-ai": [
    "computer science",
    "coding",
    "code",
    "programming",
    "software",
    "app",
    "apps",
    "app challenge",
    "hackathon",
    "cyber",
    "cybersecurity",
    "cyberpatriot",
    "informatics",
    "usaco",
    "ai",
    "artificial intelligence",
    "machine learning",
    "data science",
    "robotics",
    "web development",
    "game jam",
  ],
  quantitative: [
    "math",
    "maths",
    "mathematics",
    "mathematical",
    "amc",
    "aime",
    "olympiad",
    "physics olympiad",
    "calculus",
    "statistics",
    "quantitative",
    "actuarial",
    "mathcounts",
    "putnam",
  ],
  leadership: [
    "president",
    "captain",
    "founder",
    "co-founder",
    "cofounder",
    "chair",
    "chairman",
    "chairperson",
    "leadership",
    "leader",
    "officer",
    "student government",
    "student council",
    "ambassador",
    "director",
  ],
  service: [
    "volunteer",
    "volunteering",
    "service",
    "community service",
    "philanthropy",
    "charity",
    "congressional award",
    "nonprofit",
    "non-profit",
    "outreach",
    "fundraiser",
    "fundraising",
    "humanitarian",
  ],
  athletics: [
    "athletic",
    "athletics",
    "athlete",
    "athletes",
    "varsity",
    "sport",
    "sports",
    "all-state",
    "all-american",
    "state champion",
    "mvp",
    "swim",
    "swimming",
    "soccer",
    "basketball",
    "tennis",
    "lacrosse",
    "volleyball",
    "baseball",
    "wrestling",
    "cross country",
    "track and field",
  ],
  entrepreneurship: [
    "entrepreneur",
    "entrepreneurship",
    "entrepreneurial",
    "startup",
    "start-up",
    "business plan",
    "pitch competition",
    "venture",
    "deca",
    "fbla",
    "diamond challenge",
    "conrad challenge",
    "shark tank",
    "business competition",
  ],
  research: [
    "research",
    "researcher",
    "research paper",
    "science fair",
    "isef",
    "regeneron",
    "science talent",
    "journal",
    "publication",
    "published",
    "davidson fellows",
    "siemens competition",
    "laboratory",
    "thesis",
    "symposium",
  ],
  creativity: [
    "art",
    "arts",
    "artwork",
    "artist",
    "painting",
    "drawing",
    "sculpture",
    "writing",
    "creative writing",
    "poetry",
    "poem",
    "scholastic art",
    "scholastic writing",
    "music",
    "band",
    "orchestra",
    "choir",
    "film",
    "filmmaking",
    "design",
    "graphic design",
    "fashion design",
    "photography",
    "theater",
    "theatre",
    "dance",
    "ceramics",
    "animation",
    "youngarts",
    "portfolio",
  ],
  academic: [
    "honor roll",
    "honor society",
    "national honor society",
    "nhs",
    "national merit",
    "ap scholar",
    "valedictorian",
    "salutatorian",
    "dean's list",
    "academic",
    "scholar",
    "scholars",
    "scholarship",
    "subject award",
    "spelling bee",
    "quiz bowl",
    "academic decathlon",
    "knowledge bowl",
  ],
};

// Compile each keyword to a whole-word/phrase matcher once at module load. The
// lookbehind/lookahead treat only [a-z0-9] as "inside a word", so hyphens in
// "all-state" / "co-founder" are fine, but "designed" no longer matches "design".
function keywordToRegex(kw: string): RegExp {
  const escaped = kw
    .trim()
    .toLowerCase()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, "[\\s\\-/]+");
  return new RegExp(`(?<![a-z0-9])${escaped}(?![a-z0-9])`);
}

const THEME_PATTERNS: Record<RecognitionTheme, RegExp[]> = Object.fromEntries(
  RECOGNITION_THEMES.map((t) => [t, THEME_KEYWORDS[t].map(keywordToRegex)]),
) as Record<RecognitionTheme, RegExp[]>;

/**
 * Deterministically infer the themes an award demonstrates from its free text.
 * Returns [] when nothing recognizable matches (the caller treats that honestly —
 * "uncategorized", never a fabricated theme).
 */
export function themesForAwardText(text: string): RecognitionTheme[] {
  const hay = text.toLowerCase();
  const out: RecognitionTheme[] = [];
  for (const theme of RECOGNITION_THEMES) {
    if (THEME_PATTERNS[theme].some((re) => re.test(hay))) out.push(theme);
  }
  return out;
}

// Activity category (activities.category slug) → themes it can support. Used to
// find "recognition gaps": a theme an activity supports but no award recognizes.
const ACTIVITY_CATEGORY_THEMES: Record<string, RecognitionTheme[]> = {
  sports: ["athletics"],
  clubs: [],
  volunteering: ["service"],
  research: ["research", "academic"],
  internship: [],
  work: [],
  "personal-project": [],
  business: ["entrepreneurship"],
  arts: ["creativity"],
  competitions: [],
  cultural: [],
  "student-gov": ["leadership"],
  other: [],
};

/**
 * Themes an activity supports, from its category PLUS keyword scan of its
 * name/role/description (so a "Robotics Club" reads as cs-ai even though "clubs"
 * carries no theme, and a club president reads as leadership).
 */
export function themesForActivity(a: {
  name: string;
  category: string;
  leadershipRole?: string;
  description?: string;
}): RecognitionTheme[] {
  const out = new Set<RecognitionTheme>(
    ACTIVITY_CATEGORY_THEMES[a.category] ?? [],
  );
  const text = [a.name, a.leadershipRole ?? "", a.description ?? ""].join(" ");
  for (const t of themesForAwardText(text)) out.add(t);
  // A named leadership role is leadership evidence regardless of keywords.
  if (a.leadershipRole && a.leadershipRole.trim().length > 0)
    out.add("leadership");
  return [...out];
}
