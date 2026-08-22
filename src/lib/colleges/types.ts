// Shared types for the My Colleges matching/chancing feature.
//
// Recommendations have TWO independent dimensions:
//   1. Admission fit  (AdmissionFit)  — safety / target / reach from chancing.
//   2. Field fit       (FieldFit)      — how strong the college is for the
//      student's intended field, from the source-attributed field-data layer.
// They are computed by separate modules and merged into a CollegeMatch, so
// either can be improved without touching the other.

/** The current application cycle these rounds/deadlines belong to. */
export const CURRENT_CYCLE_YEAR = "2026-2027";

export type MatchCategory = "safety" | "target" | "reach" | "unrated";

// ─── Admission dimension ──────────────────────────────────────────────────────

/** Standardized, historical admission stats used by the matching engine. */
export interface CollegeStats {
  admitRate: number | null; // 0..1
  satEbrw25: number | null;
  satEbrw75: number | null;
  satMath25: number | null;
  satMath75: number | null;
  satTotal25: number | null;
  satTotal75: number | null;
  actComposite25: number | null;
  actComposite75: number | null;
  gpaAvg: number | null;
}

/** The subset of a user's profile the matching engine consumes. */
export interface MatchProfile {
  unweightedGpa: number | null;
  satScore: number | null;
  actScore: number | null;
}

/** A college's test-score policy for the current cycle, when known. */
export type TestPolicy =
  | "required"
  | "optional"
  | "blind"
  | "considered"
  | "unknown";

/** How confident the assessment is, driven by data completeness — never by how
 * strong the applicant is. */
export type Confidence = "high" | "medium" | "low";

/** A bounded personal-chance range (0..1 fractions). We present a range, never a
 * lone precise percentage, to avoid false precision at selective schools. */
export interface ChanceRange {
  low: number;
  high: number;
}

/** A short human-readable factor explaining the assessment. */
export interface AdmissionDriver {
  kind: "positive" | "caution" | "info";
  text: string;
}

export interface AdmissionFit {
  category: MatchCategory;
  /**
   * A finer-grained display label layered on top of `category`. "reach" splits
   * into "Reach" vs "High Reach" for ultra-selective schools. `category` stays
   * canonical (safety/target/reach/unrated) so grouping and list-building are
   * unaffected.
   */
  displayCategory: string;
  /**
   * Representative point estimate (0..1) — the MIDPOINT of `chanceRange`. Kept
   * for sorting and backward compatibility only; never shown alone in the UI.
   */
  chance: number | null;
  /** The bounded chance range shown to the user, or null if unrated. */
  chanceRange: ChanceRange | null;
  /** Confidence from data completeness, or null if unrated. */
  confidence: Confidence | null;
  /** Concise factors explaining WHY (in-range academics, selectivity, etc.). */
  drivers: AdmissionDriver[];
  /** The college's overall admit rate (0..1), surfaced alongside the estimate. */
  collegeAdmitRate: number | null;
  /** 0..1 fraction of the signals we'd want that were actually available. */
  dataCompleteness: number;
  rationale: string;
  /** Lower confidence when the profile lacks test scores (back-compat flag). */
  lowConfidence: boolean;
  /** Which version of the admission model produced this, for auditability. */
  modelVersion: string;
}

/**
 * Normalized applicant-strength vector (Layer 2), all fields on a 0..1 scale.
 * Derived ONCE from the cached LLM component scores and reused everywhere so a
 * given student is consistently strong across all colleges. This is absolute
 * strength — it says nothing about any specific college.
 */
export interface ApplicantStrength {
  /** Absolute academic quality (LLM). Used as a fallback signal, not stacked on
   * top of the college-relative academic position. */
  academics: number | null;
  activities: number | null;
  awards: number | null;
  /** Placeholder for essays/personal narrative — 0-weight until essays exist. */
  narrative: number;
  /** The holistic lift signal (activities + awards + narrative), 0..1. */
  holistic: number;
  /** True only when real cached component scores backed this vector. */
  hasHolistic: boolean;
}

// ─── Field dimension ──────────────────────────────────────────────────────────

export type FieldRating =
  | "excellent"
  | "strong"
  | "moderate"
  | "limited"
  | "unknown"
  | "not_applicable";

export interface FieldStrengthRecord {
  fieldKey: string;
  strength: Exclude<FieldRating, "not_applicable">;
  headline: string | null;
  notes: string | null;
  verified: boolean;
  sourceUrl: string | null;
}

export interface FieldResource {
  resourceType: string;
  title: string;
  description: string | null;
  url: string | null;
  verified: boolean;
}

export interface FieldFit {
  /** The intended-field key this was scored against (null if none selected). */
  fieldKey: string | null;
  rating: FieldRating;
  rationale: string;
  /** True only when a real, ingested strength record backs the rating. */
  hasData: boolean;
  /** True when the backing record is human-verified. */
  verified: boolean;
  resources: FieldResource[];
}

// ─── College reference data ───────────────────────────────────────────────────

export interface CollegeRecord {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  state: string | null;
  institutionType: string | null;
  logoAssetPath: string | null;
  logoVariant: string | null;
  officialWebsite: string | null;
  stats: CollegeStats | null;
}

/** One offered application round for the current cycle. */
export interface ApplicationRound {
  id: string;
  roundType: string; // EA | REA | ED | ED_II | RD | ROLLING | PRIORITY
  name: string | null;
  deadlineDate: string | null; // ISO yyyy-mm-dd or null (pending)
  decisionReleaseDate: string | null;
  isBinding: boolean;
  isRestrictive: boolean;
  isRolling: boolean;
  verified: boolean; // verified_at is set → confirmed against official source
}

export interface CollegeCycle {
  cycleYear: string;
  testPolicy: string | null;
  verified: boolean;
  rounds: ApplicationRound[];
}

/** A college joined with the current-cycle application data. */
export interface CollegeWithData extends CollegeRecord {
  cycle: CollegeCycle | null;
}

// ─── Composed match ───────────────────────────────────────────────────────────

/** A saved college evaluated on both dimensions, plus the user's plan choice. */
export interface CollegeMatch {
  college: CollegeWithData;
  admission: AdmissionFit;
  fieldFit: FieldFit;
  /** How it entered the list: 'recommended' | 'manual'. */
  source: string;
  /** The application_rounds.id the user selected (finalized phase), or null. */
  selectedRoundId: string | null;
}
