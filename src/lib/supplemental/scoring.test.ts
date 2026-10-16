import { describe, expect, it } from "vitest";
import {
  coverageAdjustmentFactor,
  directiveCoverageRatio,
  directivesAddressed,
  type GradedDirective,
  LENIENT_COVERAGE_FLOOR,
  scoreBand,
  weightedOverall,
} from "./scoring";

describe("weightedOverall", () => {
  it("computes a weighted average of dimension scores", () => {
    const scores = {
      alignment: 80,
      reflection: 60,
      specificity: 100,
      voice: 40,
    };
    const weights = {
      alignment: 40,
      reflection: 10,
      specificity: 40,
      voice: 10,
    };
    // (80*40 + 60*10 + 100*40 + 40*10) / 100 = (3200+600+4000+400)/100 = 82
    expect(weightedOverall(scores, weights)).toBe(82);
  });

  it("ignores dimensions with no score and renormalizes by used weight", () => {
    const scores = { alignment: 90, specificity: 70 };
    const weights = {
      alignment: 30,
      reflection: 25,
      specificity: 25,
      voice: 20,
    };
    // only alignment(30) + specificity(25) count → (90*30 + 70*25)/55 = 80.9 → 81
    expect(weightedOverall(scores, weights)).toBe(81);
  });

  it("returns 0 when no weighted scores are present", () => {
    expect(
      weightedOverall(
        {},
        { alignment: 25, reflection: 25, specificity: 25, voice: 25 },
      ),
    ).toBe(0);
  });
});

describe("coverageAdjustmentFactor", () => {
  it("strict (default) returns the ratio unchanged", () => {
    expect(coverageAdjustmentFactor(1)).toBe(1);
    expect(coverageAdjustmentFactor(0)).toBe(0);
    expect(coverageAdjustmentFactor(0.5)).toBe(0.5);
    expect(coverageAdjustmentFactor(2 / 3, "strict")).toBeCloseTo(2 / 3, 5);
  });

  it("lenient maps [0,1] into [FLOOR,1]", () => {
    expect(coverageAdjustmentFactor(1, "lenient")).toBe(1);
    expect(coverageAdjustmentFactor(0, "lenient")).toBe(LENIENT_COVERAGE_FLOOR);
    // 0.7 + 0.3 * (2/3) = 0.9
    expect(coverageAdjustmentFactor(2 / 3, "lenient")).toBeCloseTo(0.9, 5);
  });

  it("lenient is always >= strict (never harsher)", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      expect(coverageAdjustmentFactor(r, "lenient")).toBeGreaterThanOrEqual(
        coverageAdjustmentFactor(r, "strict"),
      );
    }
  });
});

describe("directiveCoverageRatio", () => {
  const mk = (statuses: GradedDirective["status"][]): GradedDirective[] =>
    statuses.map((status, i) => ({ directive: `d${i}`, status }));

  it("returns 1 when there are no directives", () => {
    expect(directiveCoverageRatio([])).toBe(1);
  });

  it("counts partial as half", () => {
    // 2 of 3: addressed + partial + missing = 1.5/3 = 0.5
    expect(
      directiveCoverageRatio(mk(["addressed", "partial", "missing"])),
    ).toBe(0.5);
  });

  it("is 1 when all addressed", () => {
    expect(directiveCoverageRatio(mk(["addressed", "addressed"]))).toBe(1);
  });

  it("counts non-missing directives", () => {
    expect(directivesAddressed(mk(["addressed", "partial", "missing"]))).toBe(
      2,
    );
  });
});

describe("scoreBand", () => {
  it("bands scores", () => {
    expect(scoreBand(95)).toBe("Exceptional");
    expect(scoreBand(82)).toBe("Strong");
    expect(scoreBand(72)).toBe("Solid");
    expect(scoreBand(61)).toBe("Developing");
    expect(scoreBand(50)).toBe("Building");
    expect(scoreBand(20)).toBe("Early");
  });
});
