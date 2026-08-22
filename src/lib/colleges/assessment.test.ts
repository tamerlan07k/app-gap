import { describe, expect, it } from "vitest";
import { assessAdmission } from "./assessment";
import { deriveApplicantStrength, neutralStrength } from "./strength";
import type { CollegeStats, MatchProfile, TestPolicy } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Columbia-like: ~4% admit, ultra-selective. Real data has gpa_avg = null.
const ULTRA: CollegeStats = {
  admitRate: 0.04,
  satEbrw25: 730,
  satEbrw75: 770,
  satMath25: 760,
  satMath75: 800, // total middle-50%: 1490–1570, mid 1530
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// Selective private: ~30% admit.
const SELECTIVE: CollegeStats = {
  admitRate: 0.3,
  satEbrw25: 660,
  satEbrw75: 730,
  satMath25: 680,
  satMath75: 770, // total 1340–1500, mid 1420
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// Accessible public: ~70% admit.
const ACCESSIBLE: CollegeStats = {
  admitRate: 0.7,
  satEbrw25: 570,
  satEbrw75: 660,
  satMath25: 560,
  satMath75: 670, // total 1130–1330, mid 1230
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// A stronger holistic profile (AppGap ~89) and a weaker one (AppGap ~74),
// derived from cached LLM component scores.
const STRENGTH_89 = deriveApplicantStrength({
  academics: { score: 92 },
  activities: { score: 90 },
  awards: { score: 85 },
});
const STRENGTH_74 = deriveApplicantStrength({
  academics: { score: 78 },
  activities: { score: 62 },
  awards: { score: 55 },
});

const profileSat = (sat: number | null): MatchProfile => ({
  unweightedGpa: null,
  satScore: sat,
  actScore: null,
});

const opts = (testPolicy: TestPolicy) => ({ testPolicy });

// ─── Core bug: 74 vs 89 at a ~4% school with the SAME SAT ────────────────────

describe("74 vs 89 profile at a ~4% school (the reported bug)", () => {
  const sat = 1530; // at Columbia's median → academic position ≈ 0
  const a74 = assessAdmission(profileSat(sat), ULTRA, STRENGTH_74);
  const a89 = assessAdmission(profileSat(sat), ULTRA, STRENGTH_89);

  it("no longer collapses both to an identical 1%", () => {
    expect(a74.chance).not.toBeCloseTo(a89.chance ?? -1, 5);
    expect(a89.chance ?? 0).toBeGreaterThan(a74.chance ?? 0);
  });

  it("produces DIFFERENT ranges", () => {
    expect(a89.chanceRange).not.toEqual(a74.chanceRange);
  });

  it("keeps BOTH a High Reach (stronger profile does not buy in)", () => {
    expect(a74.category).toBe("reach");
    expect(a89.category).toBe("reach");
    expect(a74.displayCategory).toBe("High Reach");
    expect(a89.displayCategory).toBe("High Reach");
  });

  it("never awards a high probability just because AppGap is high", () => {
    // Even the strong profile stays well under the selectivity ceiling.
    expect(a89.chance ?? 1).toBeLessThan(0.25);
  });

  it("caps confidence at ultra-selective schools (inherent uncertainty)", () => {
    expect(a89.confidence).not.toBe("high");
  });
});

// ─── Same profile across the selectivity spectrum ────────────────────────────

describe("the same strong profile moves across categories as selectivity drops", () => {
  it("~30% school: an above-median strong profile is a Target with real odds", () => {
    const r = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    expect(["target", "safety"]).toContain(r.category);
    // Nothing sub-35% admit is a true safety.
    expect(r.category).toBe("target");
    expect(r.chance ?? 0).toBeGreaterThan(0.35);
  });

  it("~70% school: a well-above-median strong profile is a Safety", () => {
    const r = assessAdmission(profileSat(1400), ACCESSIBLE, STRENGTH_89);
    expect(r.category).toBe("safety");
    expect(r.chance ?? 0).toBeGreaterThan(0.75);
  });

  it("strength moves the needle far MORE at less-selective schools", () => {
    const strongUltra = assessAdmission(profileSat(1530), ULTRA, STRENGTH_89);
    const weakUltra = assessAdmission(profileSat(1530), ULTRA, STRENGTH_74);
    const strongMid = assessAdmission(profileSat(1420), SELECTIVE, STRENGTH_89);
    const weakMid = assessAdmission(profileSat(1420), SELECTIVE, STRENGTH_74);
    const ultraGap = (strongUltra.chance ?? 0) - (weakUltra.chance ?? 0);
    const midGap = (strongMid.chance ?? 0) - (weakMid.chance ?? 0);
    expect(midGap).toBeGreaterThan(ultraGap);
  });
});

// ─── Missing / partial data behaviour ────────────────────────────────────────

describe("missing SAT", () => {
  const r = assessAdmission(profileSat(null), SELECTIVE, STRENGTH_89);
  it("still produces a rating from holistic + selectivity", () => {
    expect(r.chanceRange).not.toBeNull();
    expect(r.category).not.toBe("unrated");
  });
  it("lowers confidence and flags the missing score", () => {
    expect(r.confidence).not.toBe("high");
    expect(r.lowConfidence).toBe(true);
    expect(r.drivers.some((d) => /test score/i.test(d.text))).toBe(true);
  });
});

describe("test-optional college with no score", () => {
  const r = assessAdmission(
    profileSat(null),
    SELECTIVE,
    STRENGTH_89,
    opts("optional"),
  );
  it("does not penalize the student for a missing score", () => {
    expect(r.drivers.some((d) => /test-optional/i.test(d.text))).toBe(true);
    // Test-optional partial-credit keeps completeness above the score-required case.
    const required = assessAdmission(
      profileSat(null),
      SELECTIVE,
      STRENGTH_89,
      opts("required"),
    );
    expect(r.dataCompleteness).toBeGreaterThan(required.dataCompleteness);
  });
});

describe("test-blind college ignores a submitted score", () => {
  it("does not use the SAT even when present", () => {
    const blind = assessAdmission(
      profileSat(1600),
      SELECTIVE,
      STRENGTH_74,
      opts("blind"),
    );
    const noScore = assessAdmission(
      profileSat(null),
      SELECTIVE,
      STRENGTH_74,
      opts("blind"),
    );
    expect(blind.chance).toBeCloseTo(noScore.chance ?? -1, 10);
  });
});

describe("missing GPA data (gpa_avg is null everywhere today)", () => {
  const r = assessAdmission(
    { unweightedGpa: 3.9, satScore: 1500, actScore: null },
    SELECTIVE,
    STRENGTH_89,
  );
  it("does not fabricate GPA and flags the gap", () => {
    expect(r.drivers.some((d) => /GPA data unavailable/i.test(d.text))).toBe(
      true,
    );
  });
  it("still rates the college", () => {
    expect(r.category).not.toBe("unrated");
  });
});

// ─── Guardrails: neither SAT nor AppGap may dominate ─────────────────────────

describe("very high SAT with a weak holistic profile", () => {
  it("does not let SAT alone drive a high chance at a ~4% school", () => {
    const r = assessAdmission(profileSat(1600), ULTRA, STRENGTH_74);
    expect(r.category).toBe("reach");
    expect(r.chance ?? 1).toBeLessThan(0.25); // bounded by the selectivity ceiling
  });
});

describe("strong holistic profile with below-range academics", () => {
  it("cannot rescue a student into Target at an ultra-selective school", () => {
    const r = assessAdmission(profileSat(1250), ULTRA, STRENGTH_89);
    expect(r.category).toBe("reach");
  });
  it("but a strong holistic still helps relative to a weak one", () => {
    const strong = assessAdmission(profileSat(1250), ULTRA, STRENGTH_89);
    const weak = assessAdmission(profileSat(1250), ULTRA, STRENGTH_74);
    expect(strong.chance ?? 0).toBeGreaterThan(weak.chance ?? 0);
  });
});

describe("anti-absurdity: a 70%-AppGap profile is never ~70% at a 4% school", () => {
  it("caps a mid profile far below its AppGap score", () => {
    const mid = deriveApplicantStrength({
      academics: { score: 70 },
      activities: { score: 70 },
      awards: { score: 70 },
    });
    const r = assessAdmission(profileSat(1530), ULTRA, mid);
    expect(r.chance ?? 1).toBeLessThan(0.2);
  });
});

// ─── Housekeeping ────────────────────────────────────────────────────────────

describe("unrated & determinism", () => {
  it("is unrated when the college has no admit rate (no fabricated base)", () => {
    const noRate: CollegeStats = { ...ULTRA, admitRate: null };
    const r = assessAdmission(profileSat(1530), noRate, STRENGTH_89);
    expect(r.category).toBe("unrated");
    expect(r.chanceRange).toBeNull();
  });

  it("is deterministic for identical inputs", () => {
    const a = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    const b = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    expect(a).toEqual(b);
  });

  it("neutral strength (no analysis) still rates but with lower confidence", () => {
    const r = assessAdmission(profileSat(1530), ULTRA, neutralStrength());
    expect(r.category).toBe("reach");
    expect(r.drivers.some((d) => /profile analysis/i.test(d.text))).toBe(true);
  });
});
