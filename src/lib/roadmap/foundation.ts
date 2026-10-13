// My Roadmap — the FOUNDATION phase. Before the four application branches are
// revealed, every student passes through a shared, four-step setup:
//   1. Application Diagnostic   (reuses the existing AppGap Analysis)
//   2. Career Path Assessment   (deterministic major/field suggestion)
//   3. Personalized Calendar    (deterministic application schedule)
//   4. Begin Your Journey       (unlocks the branches)
//
// Completion is derived deterministically from existing data + explicit
// confirmations — never from grade alone (a junior may already have a clear
// major; another may be undecided). All logic here is pure and AI-free.

export type FoundationStepId = "diagnostic" | "career" | "calendar" | "begin";

/** Per-step status. `ready` = actionable now; `attention` = partially done /
 *  needs info (e.g. diagnostic missing profile fields); `complete` = done;
 *  `locked` = a prerequisite step isn't complete yet. */
export type FoundationStepStatus =
  | "complete"
  | "ready"
  | "attention"
  | "locked";

export type FoundationStep = {
  id: FoundationStepId;
  title: string;
  description: string;
  why: string;
  actionLabel: string;
};

export const FOUNDATION_STEPS: FoundationStep[] = [
  {
    id: "diagnostic",
    title: "Application Diagnostic",
    description:
      "Run your AppGap Analysis so your roadmap is built on a real read of where you stand.",
    why: "Everything downstream — your priorities, your calendar, your branches — is more accurate when it starts from your diagnostic.",
    actionLabel: "Open diagnostic",
  },
  {
    id: "career",
    title: "Career Path Assessment",
    description:
      "Clarify the majors and fields that fit you, or confirm the direction you already have.",
    why: "A clear direction focuses your essays, activities, and college fit. It doesn't lock you in — it just gives the roadmap something to aim at.",
    actionLabel: "Start assessment",
  },
  {
    id: "calendar",
    title: "Personalized Calendar",
    description:
      "Generate a realistic application schedule spread across the time you actually have.",
    why: "A dated plan turns a long to-do list into manageable steps, with room for revisions and no last-minute cram.",
    actionLabel: "Build calendar",
  },
  {
    id: "begin",
    title: "Begin Your Application Journey",
    description:
      "Unlock your four application branches and start working through your personalized plan.",
    why: "With your diagnostic, direction, and calendar in place, you're set up to work the plan — not guess at it.",
    actionLabel: "Begin journey",
  },
];

/** The signals that determine foundation progress. All computed from existing
 *  data (ai_analyses, profile, career_assessments, calendars, roadmaps). */
export type FoundationInputs = {
  /** A valid AppGap Analysis exists. */
  hasAnalysis: boolean;
  /** Enough profile data exists to run the diagnostic at all. */
  profileReadyForDiagnostic: boolean;
  /** Human labels for what's missing when the profile isn't diagnostic-ready. */
  diagnosticMissing: string[];
  /** The student explicitly confirmed their career direction (assessment or profile). */
  careerConfirmed: boolean;
  /** The student already has a clear intended major on their profile. */
  hasClearMajor: boolean;
  /** A calendar has been generated AND confirmed. */
  calendarConfirmed: boolean;
  /** The roadmap branches have been generated (journey started). */
  journeyStarted: boolean;
};

export type FoundationState = {
  steps: Record<FoundationStepId, FoundationStepStatus>;
  /** Extra context for the diagnostic step when it needs info. */
  diagnosticMissing: string[];
  /** True when the student can confirm an existing major instead of assessing. */
  careerCanConfirmExisting: boolean;
  /** Diagnostic + career + calendar are all complete → "Begin" is actionable. */
  readyToBegin: boolean;
  /** Everything (incl. journey) is done. */
  journeyStarted: boolean;
};

export function computeFoundationState(
  input: FoundationInputs,
): FoundationState {
  // 1. Diagnostic.
  let diagnostic: FoundationStepStatus;
  if (input.hasAnalysis) diagnostic = "complete";
  else if (!input.profileReadyForDiagnostic) diagnostic = "attention";
  else diagnostic = "ready";

  // 2. Career direction — complete only on explicit confirmation.
  const career: FoundationStepStatus = input.careerConfirmed
    ? "complete"
    : "ready";

  // 3. Calendar.
  const calendar: FoundationStepStatus = input.calendarConfirmed
    ? "complete"
    : "ready";

  const priorComplete =
    diagnostic === "complete" &&
    career === "complete" &&
    calendar === "complete";

  // 4. Begin — locked until the first three are complete.
  let begin: FoundationStepStatus;
  if (input.journeyStarted) begin = "complete";
  else if (priorComplete) begin = "ready";
  else begin = "locked";

  return {
    steps: { diagnostic, career, calendar, begin },
    diagnosticMissing: input.hasAnalysis ? [] : input.diagnosticMissing,
    careerCanConfirmExisting: !input.careerConfirmed && input.hasClearMajor,
    readyToBegin: priorComplete && !input.journeyStarted,
    journeyStarted: input.journeyStarted,
  };
}

/** Whether a stored major counts as a "clear" direction (not undecided/empty). */
export function hasClearMajor(
  majorCategory: string | null | undefined,
  academicMajor: string | null | undefined,
): boolean {
  const cat = (majorCategory ?? "").trim();
  const major = (academicMajor ?? "").trim();
  if (!cat && !major) return false;
  if (cat === "undecided" || major === "undecided") return false;
  return cat !== "" || major !== "";
}
