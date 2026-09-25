// Essay lifecycle status + the qualitative college-level signal shown in My
// Colleges. Client-safe (no server imports).
//
// The My Colleges signal is intentionally QUALITATIVE ("Strong / Developing /
// Needs Revision") and derived only from essay STATUS — it never touches the
// chancing math, the AppGap Score, or any admission probability. It is a
// progress indicator, not a prediction.

export type EssayStatus =
  | "not_started"
  | "drafting"
  | "needs_revision"
  | "finalized";

export const ESSAY_STATUS_LABELS: Record<EssayStatus, string> = {
  not_started: "Not started",
  drafting: "Drafting",
  needs_revision: "Needs revision",
  finalized: "Finalized",
};

/** Tailwind classes for a status pill (foreground + subtle background). */
export const ESSAY_STATUS_CLASSES: Record<EssayStatus, string> = {
  not_started: "text-muted-foreground bg-muted",
  drafting: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  needs_revision: "text-red-600 dark:text-red-400 bg-red-500/10",
  finalized: "text-brand-teal bg-brand-teal/10",
};

// ─── College-level qualitative signal (for My Colleges) ───────────────────────

export type CollegeEssaySignal =
  | "not_started"
  | "developing"
  | "needs_revision"
  | "strong";

export const COLLEGE_SIGNAL_LABELS: Record<CollegeEssaySignal, string> = {
  not_started: "Not started",
  developing: "Developing",
  needs_revision: "Needs revision",
  strong: "Strong",
};

export const COLLEGE_SIGNAL_CLASSES: Record<CollegeEssaySignal, string> = {
  not_started: "text-muted-foreground bg-muted",
  developing: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  needs_revision: "text-red-600 dark:text-red-400 bg-red-500/10",
  strong: "text-brand-teal bg-brand-teal/10",
};

export type EssayProgress = {
  total: number;
  finalized: number;
  needsRevision: number;
  drafting: number;
  notStarted: number;
};

/** Tally a college's essays by status. */
export function summarizeProgress(statuses: EssayStatus[]): EssayProgress {
  return {
    total: statuses.length,
    finalized: statuses.filter((s) => s === "finalized").length,
    needsRevision: statuses.filter((s) => s === "needs_revision").length,
    drafting: statuses.filter((s) => s === "drafting").length,
    notStarted: statuses.filter((s) => s === "not_started").length,
  };
}

/**
 * Derive the qualitative My Colleges signal from a college's essay statuses.
 * Priority: any essay needing revision → "Needs revision"; otherwise all present
 * essays finalized → "Strong"; otherwise anything underway → "Developing"; no
 * essays or all untouched → "Not started".
 */
export function deriveCollegeSignal(
  statuses: EssayStatus[],
): CollegeEssaySignal {
  if (statuses.length === 0) return "not_started";
  if (statuses.some((s) => s === "needs_revision")) return "needs_revision";
  if (statuses.every((s) => s === "finalized")) return "strong";
  if (statuses.every((s) => s === "not_started")) return "not_started";
  return "developing";
}
