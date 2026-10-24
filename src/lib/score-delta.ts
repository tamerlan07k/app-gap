// Score-change classification for the Profile Overview reassessment flow.
//
// The AppGap diagnostic is scored by an LLM (profileAnalysis / profileReassessment
// run at temperature 0.3), so re-running it on an UNCHANGED profile can drift a
// point or two purely from model nondeterminism. To keep the product honest — "a
// typo must not change the score" — we treat sub-threshold movement as noise and
// report it as "no material change" rather than inventing a rise or a fall.
//
// Everything here is deterministic and pure so it can be unit-tested and reused by
// both the Overview UI (what to animate / what copy to show) and any server code
// that wants to summarize a reassessment.

import type { Analysis, ComponentScores } from "~/lib/ai/schema";

/**
 * Minimum absolute overall-score movement we treat as a REAL change. Movement
 * smaller than this is within the model's run-to-run noise floor at temperature
 * 0.3, so we surface it as "unchanged" instead of a misleading up/down animation.
 */
export const SCORE_NOISE_DEADBAND = 2;

export type ScoreDirection = "up" | "down" | "same";

export interface ScoreChange {
  /** Signed overall delta (next − previous); 0 when there is no previous score. */
  delta: number;
  /** "up" / "down" only when the move clears the noise deadband; else "same". */
  direction: ScoreDirection;
  /** True only when there is a previous score AND |delta| ≥ the deadband. */
  material: boolean;
  previous: number | null;
  next: number;
}

/**
 * Classify the overall-score movement between a previous and a newly computed
 * score. With no previous score (first analysis), the change is never "material"
 * — there is nothing to animate from.
 */
export function classifyScoreChange(
  previous: number | null,
  next: number,
): ScoreChange {
  if (previous == null) {
    return { delta: 0, direction: "same", material: false, previous, next };
  }
  const delta = next - previous;
  const material = Math.abs(delta) >= SCORE_NOISE_DEADBAND;
  const direction: ScoreDirection = !material
    ? "same"
    : delta > 0
      ? "up"
      : "down";
  return { delta, direction, material, previous, next };
}

const COMPONENT_LABELS: Record<keyof ComponentScores, string> = {
  academics: "academics",
  activities: "activities",
  awards: "awards",
  personalStatement: "personal statement",
};

/** The component whose score moved the most between two analyses, if any moved. */
function largestComponentMove(
  previous: Analysis,
  next: Analysis,
): { label: string; delta: number } | null {
  const prevC = previous.componentScores;
  const nextC = next.componentScores;
  if (!prevC || !nextC) return null;

  let best: { label: string; delta: number } | null = null;
  for (const key of Object.keys(
    COMPONENT_LABELS,
  ) as (keyof ComponentScores)[]) {
    const p = prevC[key]?.score;
    const n = nextC[key]?.score;
    if (typeof p !== "number" || typeof n !== "number") continue;
    const d = n - p;
    if (best == null || Math.abs(d) > Math.abs(best.delta)) {
      best = { label: COMPONENT_LABELS[key], delta: d };
    }
  }
  // Only meaningful if it actually moved.
  return best && best.delta !== 0 ? best : null;
}

/**
 * A concise, TRUTHFUL one-liner for what the reassessment found — grounded only in
 * the real score movement and, when available, the component that actually shifted
 * the most in the SAME direction as the overall change. Never fabricates a reason:
 * a sub-threshold change always reads as "stayed the same".
 */
export function describeScoreChange(
  previous: Analysis | null,
  next: Analysis,
): string {
  const change = classifyScoreChange(previous?.gapScore ?? null, next.gapScore);

  if (!change.material) {
    return previous == null
      ? "Your diagnostic has been calculated."
      : "Your score stayed the same — this change didn't materially affect your evaluation.";
  }

  const points = Math.abs(change.delta);
  const noun = points === 1 ? "point" : "points";
  const dir = change.direction === "up" ? "increased" : "decreased";

  // Attribute to a driving component only when it moved the same way as the
  // overall score (so we never claim "activities strengthened" on a score drop).
  const driver = previous && largestComponentMove(previous, next);
  if (
    driver &&
    ((change.direction === "up" && driver.delta > 0) ||
      (change.direction === "down" && driver.delta < 0))
  ) {
    const verb = change.direction === "up" ? "strengthened" : "weakened";
    return `Your profile score ${dir} by ${points} ${noun} — your updated ${driver.label} ${verb} your assessment.`;
  }

  return `Your profile score ${dir} by ${points} ${noun}.`;
}
