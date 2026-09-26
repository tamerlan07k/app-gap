// Domain types for the Awards section (Recognition Map + Opportunity Finder +
// Opportunity Experiment). Kept framework-agnostic so both server loaders and the
// deterministic engines share one shape.

import type { RecognitionTheme } from "./themes";

// ─── Awards (Recognition Map records) ─────────────────────────────────────────

export type AwardRecord = {
  id: string;
  name: string;
  organization: string;
  year: string;
  /** Scope of the award; reuses AWARD_LEVEL_LABELS keys. */
  level: string;
  category: string;
  /** Result / placement, e.g. "1st place", "Finalist", "Honorable mention". */
  placement: string;
  grade: string;
  selectivityContext: string;
  description: string;
  evidenceUrl: string | null;
  studentExplanation: string;
};

/** A theme with the awards that demonstrate it. */
export type ThemeCoverage = {
  theme: RecognitionTheme;
  /** Award ids that demonstrate this theme (external recognition). */
  awardIds: string[];
  /** Strength band derived deterministically from award count + scope. */
  strength: "strong" | "present" | "emerging" | "none";
};

/**
 * A recognition gap: a theme the student's intended field values but their AWARDS
 * don't cover yet. Scoped to awards + direction (activities are the Activities
 * section's concern). This is the deterministic bridge into the Opportunity Finder.
 */
export type RecognitionGap = {
  theme: RecognitionTheme;
  /** True when this is one of the student's intended-field themes. */
  isIntendedField: boolean;
};

/**
 * The deterministic recognition profile — computed in code from the student's
 * AWARDS and intended field only. Fed to the UI directly AND to the AI as ground
 * truth (so the model interprets, it never re-derives coverage).
 */
export type RecognitionProfile = {
  totalAwards: number;
  /** Coverage per theme, only for themes with any evidence (sorted strongest first). */
  demonstrated: ThemeCoverage[];
  /** Themes with supporting activity evidence but no/weak recognition. */
  gaps: RecognitionGap[];
  /** Award ids whose theme(s) are all already strongly recognized elsewhere. */
  redundantAwardIds: string[];
  /** The intended field key (profiles.major_category), or null. */
  fieldKey: string | null;
  /** Themes the intended field typically values that have no evidence at all. */
  uncoveredFieldThemes: RecognitionTheme[];
};

// ─── Opportunities ────────────────────────────────────────────────────────────

export type OpportunityCategory =
  | "competition"
  | "hackathon"
  | "olympiad"
  | "research"
  | "conference"
  | "fellowship"
  | "entrepreneurship"
  | "pitch"
  | "academic_challenge"
  | "publication"
  | "selective_program"
  | "service"
  | "scholarship"
  | "other";

export type OpportunityEffort =
  | "quick"
  | "moderate"
  | "substantial"
  | "intensive";

export type Opportunity = {
  id: string;
  name: string;
  organization: string;
  category: OpportunityCategory;
  description: string;
  eligibleGrades: string[];
  eligibilityNotes: string;
  costNote: string;
  fieldKeys: string[];
  evidenceDimensions: RecognitionTheme[];
  effort: OpportunityEffort;
  estPrepTime: string;
  estPrepDaysMin: number | null;
  deadlineMonth: number | null;
  deadlineDay: number | null;
  deadlineNote: string;
  isRolling: boolean;
  applicationUrl: string | null;
  sourceUrl: string | null;
};

/** Deterministic status for an opportunity relative to a student + the clock. */
export type OpportunityStatus =
  | "good_fit"
  | "worth_exploring"
  | "time_sensitive"
  | "low_priority"
  | "not_enough_time";

export type OpportunityFit = {
  opportunity: Opportunity;
  status: OpportunityStatus;
  /** Whether the student's grade meets the opportunity's grade eligibility. */
  eligible: boolean;
  /** Themes this opportunity would ADD that the student lacks recognition for. */
  addsThemes: RecognitionTheme[];
  /** Themes this opportunity reinforces that the student already has. */
  reinforcesThemes: RecognitionTheme[];
  /** True when it aligns with the student's intended field. */
  matchesField: boolean;
  /** Resolved timing (next deadline occurrence + feasibility), if datable. */
  timing: OpportunityTiming | null;
  /** Short deterministic reasons composing the "why AppGap thinks it fits". */
  reasons: string[];
  /** Internal rank score (higher = surfaced first). Not shown to the user. */
  score: number;
};

export type OpportunityTiming = {
  /** Days until the next occurrence of the deadline, or null if not datable. */
  daysUntil: number | null;
  /** Whether there is realistically enough prep time before that deadline. */
  feasible: boolean;
  /** True when the deadline is close (but still feasible). */
  urgent: boolean;
  /** Whether the exact day is known (false → show deadlineNote, not a date). */
  exactDay: boolean;
  /** The resolved next-occurrence date (assumed day when exactDay is false). */
  nextDate: Date;
};
