// Coursework analysis — shared types for the deterministic engine.
//
// PURE, no DB, no network, no React. This engine is an ANALYSIS engine, not a
// course recommender, and it is fully isolated from the AppGap Score / chancing
// system: nothing here imports from ~/lib/ai/{prompt,score,schema,analyze-profile}
// or ~/lib/colleges/{assessment,strength,matching}, and nothing here feeds them.
//
// The single most important idea in these types is the FindingStatus five-state
// framework, which lets AppGap distinguish an actual weakness from a missed
// opportunity from a course that simply was not available from a course that is
// not relevant to the student's field. A student is NEVER penalized for a course
// their school did not offer, or for one whose availability is unknown.

import type { FieldKey } from "~/lib/academic-interests";

// ─── Course classification ────────────────────────────────────────────────────

/** Broad subject area a course belongs to. "other" = could not be classified. */
export type SubjectArea =
  | "math"
  | "science"
  | "computer-science"
  | "english"
  | "social-studies"
  | "world-language"
  | "arts"
  | "other";

/** Rigor level of a single course, from the stored `type` + name heuristics. */
export type CourseLevel =
  | "regular"
  | "honors"
  | "ap"
  | "ib"
  | "dual-enrollment";

/** Whether the course is being/has been/will be taken (from courses.status). */
export type CourseStatus = "current" | "completed" | "planned" | "unknown";

/** A single course after deterministic classification. */
export type ClassifiedCourse = {
  name: string;
  subjectArea: SubjectArea;
  /** Finer topic when detectable (e.g. "calculus", "physics"); null otherwise. */
  topic: string | null;
  level: CourseLevel;
  /** True for AP/IB/dual-enrollment — college-level or college-credit-bearing. */
  isCollegeLevel: boolean;
  /** Internal deterministic rigor weight (regular 1 → ap/ib/dual 3). */
  rigorWeight: number;
  gradeLevel: string;
  status: CourseStatus;
  apExamScore: string;
  /** False when no subject keyword matched (subjectArea falls back to "other"). */
  classified: boolean;
};

// ─── Rigor profile ────────────────────────────────────────────────────────────

/** Qualitative preparation band — never a numeric score (see the philosophy). */
export type PreparationBand = "limited" | "developing" | "solid" | "strong";

/** Direction of rigor across grades 9 → 12. */
export type TrajectoryDirection =
  | "increasing"
  | "steady"
  | "decreasing"
  | "insufficient-data";

export type SubjectRigor = {
  subjectArea: SubjectArea;
  courseCount: number;
  highestLevel: CourseLevel;
  /** Advanced = at least one AP/IB/dual-enrollment course in the subject. */
  hasAdvanced: boolean;
  band: PreparationBand;
};

export type RigorProfile = {
  totalCourses: number;
  advancedCount: number; // AP + IB + dual-enrollment
  apCount: number;
  ibCount: number;
  honorsCount: number;
  dualEnrollmentCount: number;
  bySubject: SubjectRigor[];
  trajectory: TrajectoryDirection;
  quantitativePrep: PreparationBand;
  stemPrep: PreparationBand;
  humanitiesPrep: PreparationBand;
  overallChallenge: PreparationBand;
};

// ─── Field preparation areas (general patterns, NEVER college requirements) ────

/** How central a preparation area is to a field, in GENERAL (not per-college). */
export type Importance = "core" | "recommended" | "supporting";

export type PreparationArea = {
  key: string;
  label: string;
  subjectArea: SubjectArea;
  /** Finer topic the area is really about (e.g. "calculus"), when applicable. */
  topic: string | null;
  importance: Importance;
  /**
   * True when this preparation is a broadly-universal foundation offered at
   * essentially every high school (core math, English). Only for such areas can
   * an absence with UNKNOWN availability be a potential gap — because access is
   * not realistically in question. Specific advanced courses are never assumed
   * available.
   */
  universallyAvailable: boolean;
  /**
   * General, field-based reason this preparation matters. MUST NOT reference a
   * specific college's requirements — AppGap has no verified requirement data.
   */
  whyGeneral: string;
};

// ─── Availability (school opportunity context) ────────────────────────────────

export type AvailabilityState = "offered" | "not_offered" | "unsure";

/** Map of catalog course_key → the student's self-reported availability. */
export type AvailabilityMap = Record<string, AvailabilityState>;

// ─── Findings (the five-state gap/opportunity framework) ──────────────────────

/**
 * 🟢 strength      — genuinely well-prepared here.
 * 🟡 opportunity   — not taken, but the course is (or is likely) available: an
 *                    option to consider, NOT an automatic deficiency.
 * 🟠 developing    — some preparation present, but shallow / could go further.
 * 🔴 potential-gap — a genuine preparation gap. Reserved for absent, field-core,
 *                    universally-available foundations — never for a course the
 *                    school may not offer.
 * ⚪ unavailable   — the school does not offer it; explicitly NOT counted against
 *                    the student.
 * ⚪ unknown       — availability is unknown; treated as unknown context, NOT a
 *                    gap.
 */
export type FindingStatus =
  | "strength"
  | "opportunity"
  | "developing"
  | "potential-gap"
  | "unavailable"
  | "unknown";

export type Finding = {
  key: string;
  status: FindingStatus;
  title: string;
  subjectArea: SubjectArea;
  importance: Importance;
  /** Availability that drove the classification, when relevant. */
  availability: AvailabilityState | null;
  /** Deterministic factual detail (what the coursework shows for this area). */
  detail: string;
  /** General, field-based "why this matters" — never a college requirement. */
  whyItMatters: string;
  /**
   * Additive annotation (Phase 2): a VERIFIED requirement from the student's
   * exact target that matches this area, when one exists. Purely contextual — it
   * NEVER changes `status`, so an unavailable/unknown area can never become a gap
   * because a requirement matched it. Null/absent whenever there is no verified
   * requirement for the target (the case for every target until data is added).
   */
  verifiedExpectation?: VerifiedExpectation | null;
};

// ─── Target context (future-ready: University → School → Program → Track) ──────

/** How central a scoped requirement is — derived from its requirement_type. */
export type RequirementScope = "university" | "school" | "program" | "track";

/**
 * A single VERIFIED academic expectation resolved for the student's exact target.
 * Populated only from human-verified `college_academic_requirements` rows, scoped
 * by the resolver so a requirement for one school/program/track can never appear
 * for a different one. Empty for every target until such data is ingested — a
 * missing requirement is "unknown", never fabricated. The same scoping powers the
 * future Coursework → Program → Requirements → Supplemental Essays chain.
 */
export type VerifiedExpectation = {
  scope: RequirementScope;
  requirementType: "required" | "recommended";
  label: string;
  subjectArea: SubjectArea;
  /** Optional finer topic (e.g. "calculus") for precise area matching. */
  topic: string | null;
  importance: Importance;
  sourceUrl: string;
};

/** Verified rating of how strong a college is in the student's intended field. */
export type FieldStrengthRating =
  | "excellent"
  | "strong"
  | "moderate"
  | "limited"
  | "unknown";

/**
 * University-level field strength for the target college in the student's field,
 * from the verified `college_field_strengths` data. This is a FIELD-STRENGTH
 * signal ("how strong this college is in your field"), explicitly NOT a coursework
 * requirement. Scoped to (college, field) only — it cannot yet distinguish
 * schools/programs within a university.
 */
export type FieldStrength = {
  fieldKey: string;
  rating: FieldStrengthRating;
  headline: string | null;
};

/**
 * The student's exact target, carrying the existing hierarchy IDs so requirement
 * analysis is scoped precisely — the hierarchy is NEVER flattened. `fieldStrength`
 * is verified context available today; `verifiedExpectations` is the resolved,
 * scope-correct requirement set (empty until requirement data is ingested).
 */
export type TargetContext = {
  hasTarget: boolean;
  collegeId: string | null;
  schoolId: string | null;
  programId: string | null;
  trackId: string | null;
  collegeName: string | null;
  programLabel: string | null;
  fieldStrength: FieldStrength | null;
  verifiedExpectations: VerifiedExpectation[];
};

// ─── The assembled coursework profile ─────────────────────────────────────────

export type CourseworkInput = {
  courses: Array<{
    name: string;
    type: string;
    status: string;
    gradeLevel: string;
    apExamScore: string;
  }>;
  gradeLevel: string;
  fieldKey: FieldKey;
  academicMajor: string;
  academicInterests: string[];
  availability: AvailabilityMap;
  target?: TargetContext;
};

export type CourseworkProfile = {
  classified: ClassifiedCourse[];
  rigor: RigorProfile;
  fieldKey: FieldKey;
  preparationAreas: PreparationArea[];
  findings: Finding[];
  target: TargetContext;
  /** Convenience counts for the UI, computed from findings. */
  summary: {
    strengths: number;
    opportunities: number;
    developing: number;
    potentialGaps: number;
    unavailable: number;
    unknown: number;
  };
};

// ─── What-If simulator ────────────────────────────────────────────────────────

/**
 * The primary qualitative effect of adding one hypothetical course. Deterministic
 * — NEVER an admission-point/percentage claim.
 *   strengthen-existing  — reinforces an area that is already solid/strong
 *   add-depth            — pushes a present-but-shallow area to a higher level
 *   broaden-preparation  — adds a subject area the student didn't cover before
 *   address-opportunity  — improves a finding that was an opportunity/developing/
 *                          unknown/potential-gap
 *   limited-relevance    — little marginal effect for this student's field/profile
 */
export type WhatIfEffect =
  | "strengthen-existing"
  | "add-depth"
  | "broaden-preparation"
  | "address-opportunity"
  | "limited-relevance";

/** A before→after band change for one rigor dimension. */
export type BandDelta = {
  before: PreparationBand;
  after: PreparationBand;
  improved: boolean;
};

/** A finding whose status improved because of the hypothetical course. */
export type FindingChange = {
  key: string;
  title: string;
  from: FindingStatus;
  to: FindingStatus;
};

export type WhatIfResult = {
  /** The hypothetical course, classified the same way real courses are. */
  course: ClassifiedCourse;
  primaryEffect: WhatIfEffect;
  /** Deterministic one-line summary (no numbers, no admission claims). */
  summary: string;
  rigor: {
    overall: BandDelta;
    quantitative: BandDelta;
    stem: BandDelta;
    humanities: BandDelta;
  };
  /** Depth in the course's own subject area, before vs after. */
  subjectDepth: {
    subjectArea: SubjectArea;
    beforeCount: number;
    afterCount: number;
    deepened: boolean;
  };
  /** True when the course adds a subject area not previously represented. */
  addsBreadth: boolean;
  /** How the course aligns with the intended field's preparation areas. */
  majorAlignment: {
    relevant: boolean;
    importance: Importance | null;
    areaLabel: string | null;
  };
  /** Findings that improved (e.g. an opportunity/gap that this would address). */
  addressedFindings: FindingChange[];
  /** Honest trade-offs / opportunity-cost notes (may be empty). */
  tradeoffs: string[];
};
