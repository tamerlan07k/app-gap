// The Prompt Coverage Checklist — assembled in CODE from the cached analyses so
// it's deterministic and transparent. One of the most useful parts of the
// product: before finalizing, the student sees exactly which prompt directives
// are answered, whether they're within the word limit, whether the essay is
// specific to the college, and whether it repeats the rest of their application.
//
// Client-safe: imports only the client-safe scoring helpers.

import {
  directiveCoverageRatio,
  directivesAddressed,
  type GradedDirective,
} from "./scoring";

export type ChecklistState = "ok" | "warn" | "missing" | "unknown";

export type ChecklistItem = {
  label: string;
  state: ChecklistState;
  detail: string;
};

export type ChecklistInput = {
  /** Directives from the parse, graded by the evaluation (empty when not run). */
  directives: GradedDirective[];
  wordCount: number;
  wordLimit: number | null;
  /**
   * College-specificity signal from the evaluation, when the essay is a Why-Us /
   * institutional-fit type. null when not applicable or not evaluated.
   */
  collegeSpecificity?: "strong" | "adequate" | "weak" | null;
  /**
   * Application-repetition signal from the redundancy pass. null when not run.
   */
  repetition?: "distinct" | "some_overlap" | "repetitive" | null;
};

// ─── Word count ───────────────────────────────────────────────────────────────

export function wordCountItem(
  wordCount: number,
  wordLimit: number | null,
): ChecklistItem {
  if (wordLimit == null || wordLimit <= 0) {
    return {
      label: "Word count",
      state: "unknown",
      detail: `${wordCount} words · no limit detected on this prompt`,
    };
  }
  if (wordCount === 0) {
    return {
      label: "Word count",
      state: "warn",
      detail: `Nothing written yet · limit ${wordLimit} words`,
    };
  }
  if (wordCount > wordLimit) {
    return {
      label: "Word count",
      state: "missing",
      detail: `${wordCount} / ${wordLimit} words — ${wordCount - wordLimit} over the limit`,
    };
  }
  // Within limit; nudge if far under (using very little of the space).
  const ratio = wordCount / wordLimit;
  if (ratio < 0.6) {
    return {
      label: "Word count",
      state: "warn",
      detail: `${wordCount} / ${wordLimit} words — well under; there's room to go deeper`,
    };
  }
  return {
    label: "Word count",
    state: "ok",
    detail: `${wordCount} / ${wordLimit} words — within the limit`,
  };
}

// ─── Directive coverage ───────────────────────────────────────────────────────

export function directiveItems(directives: GradedDirective[]): ChecklistItem[] {
  return directives.map((d) => ({
    label: d.directive,
    state:
      d.status === "addressed"
        ? "ok"
        : d.status === "partial"
          ? "warn"
          : "missing",
    detail: d.note ?? "",
  }));
}

export function coverageSummaryItem(
  directives: GradedDirective[],
): ChecklistItem {
  if (directives.length === 0) {
    return {
      label: "Prompt directives",
      state: "unknown",
      detail: "Run an evaluation to check directive coverage",
    };
  }
  const addressed = directivesAddressed(directives);
  const ratio = directiveCoverageRatio(directives);
  const state: ChecklistState =
    ratio >= 0.999 ? "ok" : ratio >= 0.5 ? "warn" : "missing";
  return {
    label: "Prompt directives",
    state,
    detail: `${addressed} of ${directives.length} addressed`,
  };
}

// ─── College specificity & repetition ─────────────────────────────────────────

export function collegeSpecificityItem(
  signal: ChecklistInput["collegeSpecificity"],
): ChecklistItem {
  if (signal == null) {
    return {
      label: "College specificity",
      state: "unknown",
      detail: "Not applicable, or not yet evaluated",
    };
  }
  const map: Record<
    NonNullable<ChecklistInput["collegeSpecificity"]>,
    { state: ChecklistState; detail: string }
  > = {
    strong: { state: "ok", detail: "Clearly specific to this college" },
    adequate: {
      state: "warn",
      detail: "Some specifics, but the connection could be stronger",
    },
    weak: {
      state: "missing",
      detail: "Could apply to many colleges — needs a real, specific bridge",
    },
  };
  return { label: "College specificity", ...map[signal] };
}

export function repetitionItem(
  signal: ChecklistInput["repetition"],
): ChecklistItem {
  if (signal == null) {
    return {
      label: "Application repetition",
      state: "unknown",
      detail: "Run the application check to compare with the rest of your app",
    };
  }
  const map: Record<
    NonNullable<ChecklistInput["repetition"]>,
    { state: ChecklistState; detail: string }
  > = {
    distinct: {
      state: "ok",
      detail: "Adds a genuinely new dimension to your application",
    },
    some_overlap: {
      state: "warn",
      detail: "Overlaps with other parts of your application in places",
    },
    repetitive: {
      state: "missing",
      detail: "Mostly repeats what your application already shows",
    },
  };
  return { label: "Application repetition", ...map[signal] };
}

/** Assemble the full checklist from whatever analyses are available. */
export function buildChecklist(input: ChecklistInput): {
  directives: ChecklistItem[];
  summary: ChecklistItem[];
} {
  return {
    directives: directiveItems(input.directives),
    summary: [
      coverageSummaryItem(input.directives),
      wordCountItem(input.wordCount, input.wordLimit),
      collegeSpecificityItem(input.collegeSpecificity ?? null),
      repetitionItem(input.repetition ?? null),
    ],
  };
}
