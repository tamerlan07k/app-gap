// AppGap overall-score tests — locks in that the score is a pure function of the
// student's own components and is COLLEGE-AGNOSTIC by construction: none of these
// functions accept college data, so adding/removing/reordering colleges in My
// Colleges cannot change the score. Also covers the coherence-gate caps (which
// previously had no test coverage).

import { describe, expect, it } from "vitest";
import {
  type CategoryKey,
  computeComponentScore,
  computeOverallScore,
} from "./score";

describe("computeComponentScore (V2 component model)", () => {
  it("renormalizes over the three core components when PS is absent", () => {
    const s = computeComponentScore({
      academics: 80,
      activities: 80,
      awards: 80,
    });
    expect(s).toBe(80);
  });

  it("includes the Personal Statement when present", () => {
    const s = computeComponentScore({
      academics: 80,
      activities: 80,
      awards: 80,
      personalStatement: 100,
    });
    // (80*85 + 100*15) / 100 = 83
    expect(s).toBe(83);
  });

  it("is deterministic and college-agnostic (same inputs → same score)", () => {
    const input = { academics: 71, activities: 64, awards: 58 };
    expect(computeComponentScore(input)).toBe(computeComponentScore(input));
  });
});

describe("computeOverallScore coherence gate", () => {
  const strong: Record<CategoryKey, number> = {
    academicStrength: 90,
    narrativeCohesion: 90,
    applicationDepth: 90,
    sustainedImpact: 90,
    majorAlignment: 90,
    memorability: 90,
  };

  it("does not cap a strong, deep profile", () => {
    const r = computeOverallScore(strong, { activityCount: 5 });
    expect(r.appliedCap).toBeNull();
    expect(r.score).toBe(r.rawWeighted);
    expect(r.score).toBeGreaterThan(85);
  });

  it("caps a profile with too few activities", () => {
    const r = computeOverallScore(strong, { activityCount: 1 });
    expect(r.appliedCap).toBe(55);
    expect(r.score).toBe(55);
  });

  it("caps a weak-story profile even with enough activities", () => {
    const weakStory: Record<CategoryKey, number> = {
      ...strong,
      narrativeCohesion: 40,
      applicationDepth: 40,
      sustainedImpact: 40,
    };
    const r = computeOverallScore(weakStory, { activityCount: 5 });
    expect(r.appliedCap).toBe(62);
    expect(r.score).toBe(62);
  });

  it("takes the most restrictive applicable cap", () => {
    const weakStory: Record<CategoryKey, number> = {
      ...strong,
      narrativeCohesion: 40,
      applicationDepth: 40,
      sustainedImpact: 40,
    };
    // thin profile (cap 55) AND weak story (cap 62) → 55 wins.
    const r = computeOverallScore(weakStory, { activityCount: 1 });
    expect(r.score).toBe(55);
  });
});
