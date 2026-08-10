// Human-readable display labels for the stored onboarding values. Used by the My
// Profile Overview to render the student's saved application data. Kept separate
// from the onboarding form option lists and the AI prompt maps so display can
// evolve without touching those code paths.

export const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade",
  "10": "10th grade",
  "11": "11th grade",
  "12": "12th grade",
  gap: "Graduated / Gap year",
};

export const SCHOOL_TYPE_LABELS: Record<string, string> = {
  public: "Public High School",
  private: "Private High School",
  "early-college": "Early College",
  "magnet-stem": "Magnet / STEM",
  homeschool: "Homeschool",
  other: "Other",
};

export const MAJOR_LABELS: Record<string, string> = {
  cs: "Computer Science / Software / Data",
  engineering: "Engineering",
  "bio-premed": "Biology / Pre-Med / Health Sciences",
  business: "Business / Finance / Economics",
  "math-physics": "Math / Physics / Statistics",
  polisci: "Political Science / International Relations",
  psych: "Psychology / Neuroscience",
  humanities: "English / History / Humanities",
  design: "Architecture / Design / Arts",
  education: "Education / Social Work / Public Policy",
  law: "Pre-Law / Legal Studies",
  undecided: "Undecided",
  other: "Other",
};

export const SELECTIVITY_LABELS: Record<string, string> = {
  "highly-selective": "Highly selective (top 10–20)",
  competitive: "Competitive (top 30–50)",
  balanced: "Balanced reach/target/safety",
  safer: "Mostly safer / likely schools",
  unsure: "Unsure",
};

export const COURSE_TYPE_LABELS: Record<string, string> = {
  ap: "AP",
  honors: "Honors",
  ib: "IB",
  "dual-enrollment": "Dual Enrollment",
  other: "Regular",
};

export const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports / Athletics",
  clubs: "Clubs & Organizations",
  volunteering: "Community Service",
  research: "Research",
  internship: "Internship",
  work: "Work / Employment",
  "personal-project": "Personal Project",
  business: "Business / Startup",
  arts: "Arts & Performance",
  competitions: "Competitions",
  cultural: "Cultural / Religious",
  "student-gov": "Student Government",
  other: "Other",
};

export const AWARD_LEVEL_LABELS: Record<string, string> = {
  school: "School",
  regional: "Regional / District",
  "state-national": "State / National",
  international: "International",
};

/** Look up a label, falling back to the raw value (then a dash) when unknown. */
export function labelFor(
  map: Record<string, string>,
  key: string | null | undefined,
  fallback = "—",
): string {
  if (!key) return fallback;
  return map[key] ?? key;
}
