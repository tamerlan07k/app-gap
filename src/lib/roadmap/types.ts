// My Roadmap — shared types for the milestone library, the generation context,
// and the persisted roadmap. The library (milestones.ts) defines TEMPLATES; a
// saved roadmap (stored in the roadmaps table) references them by stable id and
// carries only per-user state + an optional personalized note.

/** The four roadmap branches. Order here is the canonical display order. */
export const BRANCHES = [
  "academics",
  "essays",
  "awards",
  "activities",
] as const;
export type Branch = (typeof BRANCHES)[number];

/** Whether a task is a hard requirement, a strong suggestion, or optional. */
export type Importance = "required" | "recommended" | "optional";

/**
 * Per-milestone state. `locked` = a prerequisite is incomplete; `upcoming` = a
 * future step; `current` = the single recommended next step; `in_progress` =
 * started (from workspace state, when available); `complete` = done; `skipped` =
 * not applicable to this student (e.g. obsolete after a profile change).
 */
export type MilestoneState =
  | "locked"
  | "upcoming"
  | "current"
  | "in_progress"
  | "complete"
  | "skipped";

/** A milestone template in the approved library. Content is maintained here, not
 *  in the database, so saved roadmaps never need rewriting when a template
 *  changes. */
export type MilestoneTemplate = {
  /** Stable id — persisted in saved roadmaps; never reuse for a different task. */
  id: string;
  branch: Branch;
  title: string;
  /** Short task description (what to do). */
  description: string;
  /** Why this matters for the application (honest, no admissions guarantees). */
  why: string;
  /** Real in-app destination route; validated against KNOWN_ROUTES. */
  href: string;
  /** Label for the primary action button. */
  actionLabel: string;
  /** Milestone ids that must be complete before this unlocks. */
  prerequisites: string[];
  importance: Importance;
  /** True when the task is time-sensitive relative to application deadlines. */
  deadlineSensitive: boolean;
  /**
   * Grades this milestone applies to (9–12; 13 = gap year / already applying).
   * Empty = applies to any grade.
   */
  grades: number[];
  /** How to describe completion. */
  completionCriteria: string;
  /** Base ordering hint within the branch (lower = earlier). */
  order: number;
  /**
   * Optional deterministic eligibility predicate. Returns false when the
   * milestone does not apply to this student (e.g. "retake SAT" when they have
   * no score and no time). Absent = always eligible for its grades.
   */
  eligible?: (ctx: RoadmapContext) => boolean;
};

/** The deterministic, code-computed view of a student used for selection,
 *  ordering, and adaptation. Built from the profile — never from AI. */
export type RoadmapContext = {
  /** Numeric grade: 9–12, or 13 for a gap year / post-submission. */
  grade: number;
  /** Coarse application stage derived from grade. */
  stage: "underclassman" | "junior" | "senior" | "applying";
  /** Current month (0–11) — drives deadline urgency. */
  month: number;
  /** True when the student is in the active fall application window (senior, Aug–Jan). */
  inApplicationWindow: boolean;
  /** Rough urgency of the next application deadline. */
  urgency: "none" | "low" | "medium" | "high";
  hasSat: boolean;
  hasAct: boolean;
  satScore: number | null;
  actScore: number | null;
  hasGpa: boolean;
  courseCount: number;
  activityCount: number;
  awardCount: number;
  hasPersonalStatementDraft: boolean;
  /** Number of saved target colleges, when known. */
  targetCollegeCount: number;
};

/** A milestone reference stored in a saved roadmap (state + optional note). The
 *  structural content is looked up from the library by id at render time. */
export type SavedMilestone = {
  id: string;
  branch: Branch;
  state: MilestoneState;
  /** One-sentence personalization from the generation call (optional). */
  note?: string;
};

/** A fully-hydrated milestone: template content + per-user state + note. */
// A fully-hydrated milestone for rendering. The template's `eligible` PREDICATE
// (a function) is intentionally omitted — these objects cross the server→client
// boundary as props, and functions are not serializable. Only plain, displayable
// fields remain.
export type RoadmapMilestone = Omit<MilestoneTemplate, "eligible"> & {
  state: MilestoneState;
  note?: string;
};

/** The persisted roadmap row shape the app works with. */
export type StoredRoadmap = {
  status: "generating" | "ready" | "failed";
  milestones: SavedMilestone[];
  nextStepId: string | null;
  error?: string | null;
};
