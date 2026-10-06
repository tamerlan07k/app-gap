// Tests for the Personal Statement scoring helpers. Focused on isEvaluationStale,
// the guard that stops an edited draft from showing a score that was computed
// from its previous text (the stale-score UI bug). Pure logic — no DOM needed.

import { describe, expect, it } from "vitest";
import { isEvaluationStale, overallScore } from "./scoring";

describe("overallScore", () => {
  it("averages the four category scores and rounds", () => {
    expect(
      overallScore([
        { score: 70 },
        { score: 60 },
        { score: 80 },
        { score: 65 },
      ]),
    ).toBe(69); // 275/4 = 68.75 -> 69
  });

  it("returns 0 for no categories", () => {
    expect(overallScore([])).toBe(0);
  });
});

describe("isEvaluationStale", () => {
  const SCORED = "My first draft of the essay.";

  it("is not stale when there is no evaluation to display", () => {
    expect(
      isEvaluationStale({
        hasEvaluation: false,
        scoredContent: undefined,
        currentContent: "anything the student has typed",
      }),
    ).toBe(false);
  });

  it("is not stale when the current text matches the scored text", () => {
    expect(
      isEvaluationStale({
        hasEvaluation: true,
        scoredContent: SCORED,
        currentContent: SCORED,
      }),
    ).toBe(false);
  });

  // The core regression: editing the draft must stop the previous evaluation
  // from being treated as the current essay's score.
  it("becomes stale once the draft is edited away from the scored text", () => {
    const edited = `${SCORED} And one more revised sentence.`;
    expect(
      isEvaluationStale({
        hasEvaluation: true,
        scoredContent: SCORED,
        currentContent: edited,
      }),
    ).toBe(true);
  });

  // Simulates "Re-score after editing": once the snapshot is updated to the new
  // persisted text, the score is current again.
  it("is current again after re-scoring the edited text", () => {
    const edited = `${SCORED} And one more revised sentence.`;
    // After runEvaluation pins the snapshot to the scored text:
    expect(
      isEvaluationStale({
        hasEvaluation: true,
        scoredContent: edited,
        currentContent: edited,
      }),
    ).toBe(false);
  });

  it("ignores leading/trailing whitespace (the scorer trims before grading)", () => {
    expect(
      isEvaluationStale({
        hasEvaluation: true,
        scoredContent: SCORED,
        currentContent: `  ${SCORED}\n`,
      }),
    ).toBe(false);
  });

  it("treats an unknown scored snapshot as current until edited", () => {
    // A server-loaded score whose source text we haven't recorded: not stale
    // on its own, only once an edit makes currentContent diverge.
    expect(
      isEvaluationStale({
        hasEvaluation: true,
        scoredContent: null,
        currentContent: SCORED,
      }),
    ).toBe(false);
  });
});
