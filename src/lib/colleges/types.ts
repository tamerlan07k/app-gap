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

export interface AdmissionFit {
  category: MatchCategory;
  /** Estimated personal admission chance (0..1), or null if unrated. */
  chance: number | null;
  rationale: string;
  /** Lower confidence when the profile lacks test scores. */
  lowConfidence: boolean;
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
