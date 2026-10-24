// Tests for the reassessment score-change classifier — it must treat sub-threshold
// movement as model noise ("typo must not change the score") and only attribute a
// change to a component that genuinely moved the same way as the overall score.

import { describe, expect, it } from "vitest";
import type { Analysis, ComponentScores } from "~/lib/ai/schema";
import {
  classifyScoreChange,
  describeScoreChange,
  SCORE_NOISE_DEADBAND,
} from "./score-delta";

function analysis(
  gapScore: number,
  components?: Partial<Record<keyof ComponentScores, number>>,
): Analysis {
  const componentScores = components
    ? (Object.fromEntries(
        Object.entries(components).map(([k, v]) => [
          k,
          { score: v, explanation: "" },
        ]),
      ) as ComponentScores)
    : undefined;
  return { gapScore, componentScores } as unknown as Analysis;
}

describe("classifyScoreChange", () => {
  it("is never material when there is no previous score", () => {
    const c = classifyScoreChange(null, 72);
    expect(c.material).toBe(false);
    expect(c.direction).toBe("same");
    expect(c.delta).toBe(0);
  });

  it("treats sub-deadband movement as noise (unchanged)", () => {
    const c = classifyScoreChange(64, 64 + (SCORE_NOISE_DEADBAND - 1));
    expect(c.material).toBe(false);
    expect(c.direction).toBe("same");
  });

  it("reports a real increase at or above the deadband", () => {
    const c = classifyScoreChange(64, 64 + SCORE_NOISE_DEADBAND);
    expect(c.material).toBe(true);
    expect(c.direction).toBe("up");
    expect(c.delta).toBe(SCORE_NOISE_DEADBAND);
  });

  it("reports a real decrease below the deadband", () => {
    const c = classifyScoreChange(70, 64);
    expect(c.material).toBe(true);
    expect(c.direction).toBe("down");
    expect(c.delta).toBe(-6);
  });
});

describe("describeScoreChange", () => {
  it("announces a first-ever calculation when there is no previous", () => {
    expect(describeScoreChange(null, analysis(70))).toMatch(/calculated/i);
  });

  it("says unchanged for a sub-threshold move", () => {
    expect(describeScoreChange(analysis(64), analysis(65))).toMatch(
      /stayed the same/i,
    );
  });

  it("attributes a rise to the component that moved the most upward", () => {
    const prev = analysis(64, { academics: 70, activities: 60, awards: 55 });
    const next = analysis(69, { academics: 71, activities: 72, awards: 55 });
    const msg = describeScoreChange(prev, next);
    expect(msg).toMatch(/increased by 5 points/i);
    expect(msg).toMatch(/activities/i);
    expect(msg).toMatch(/strengthened/i);
  });

  it("does not credit a component that moved opposite the overall change", () => {
    // Overall drops, but activities rose — we must not say activities strengthened.
    const prev = analysis(70, { academics: 80, activities: 50, awards: 60 });
    const next = analysis(64, { academics: 68, activities: 55, awards: 60 });
    const msg = describeScoreChange(prev, next);
    expect(msg).toMatch(/decreased by 6 points/i);
    expect(msg).not.toMatch(/activities/i);
  });
});
