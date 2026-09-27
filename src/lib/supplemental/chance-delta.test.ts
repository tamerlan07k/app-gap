import { describe, expect, it } from "vitest";
import { applyEssayChanceDelta } from "~/lib/colleges/evaluate";
import type { AdmissionFit } from "~/lib/colleges/types";
import { collegeEssayChanceDelta, type EssayChanceInput } from "./chance-delta";

const essay = (
  overall: number | null,
  opts: { finalized?: boolean; required?: boolean } = {},
): EssayChanceInput => ({
  overall,
  finalized: opts.finalized ?? true,
  required: opts.required ?? true,
});

describe("collegeEssayChanceDelta", () => {
  it("is 0 with no essays or no finalized essays", () => {
    expect(collegeEssayChanceDelta([])).toBe(0);
    expect(collegeEssayChanceDelta([essay(90, { finalized: false })])).toBe(0);
  });

  it("ignores unscored (null overall) finalized essays", () => {
    expect(collegeEssayChanceDelta([essay(null)])).toBe(0);
  });

  it("treats a single required essay as double weight (±1pp)", () => {
    expect(collegeEssayChanceDelta([essay(90)])).toBe(1); // good single required
    expect(collegeEssayChanceDelta([essay(40)])).toBe(-1); // weak single required
  });

  it("a single OPTIONAL essay uses base weight and never penalizes", () => {
    expect(collegeEssayChanceDelta([essay(90, { required: false })])).toBe(0.5);
    expect(collegeEssayChanceDelta([essay(40, { required: false })])).toBe(0);
  });

  it("multi-essay colleges use 0.5pp each and net out", () => {
    // two good → +1.0
    expect(collegeEssayChanceDelta([essay(80), essay(90)])).toBe(1);
    // one good, one weak → 0
    expect(collegeEssayChanceDelta([essay(80), essay(40)])).toBe(0);
    // good + weak-optional → +0.5 (optional weak = no penalty)
    expect(
      collegeEssayChanceDelta([essay(80), essay(40, { required: false })]),
    ).toBe(0.5);
  });

  it("respects the good/bad thresholds (≥75 good, <55 bad, 55–74 neutral)", () => {
    expect(collegeEssayChanceDelta([essay(75), essay(60)])).toBe(0.5); // 75 good, 60 neutral
    expect(collegeEssayChanceDelta([essay(74), essay(55)])).toBe(0); // both neutral
    expect(collegeEssayChanceDelta([essay(54), essay(60)])).toBe(-0.5); // 54 bad, 60 neutral
  });

  it("caps the total swing at ±3pp", () => {
    const eightGood = Array.from({ length: 8 }, () => essay(95));
    expect(collegeEssayChanceDelta(eightGood)).toBe(3);
    const eightBad = Array.from({ length: 8 }, () => essay(20));
    expect(collegeEssayChanceDelta(eightBad)).toBe(-3);
  });
});

describe("applyEssayChanceDelta", () => {
  const base: AdmissionFit = {
    category: "reach",
    displayCategory: "Reach",
    chance: 0.1,
    chanceRange: { low: 0.07, high: 0.13 },
    confidence: "medium",
    drivers: [],
    collegeAdmitRate: 0.08,
    dataCompleteness: 1,
    rationale: "",
    lowConfidence: false,
    modelVersion: "test",
  };

  it("adds the delta (in percentage points) to chance and range", () => {
    const out = applyEssayChanceDelta(base, 1); // +1pp
    expect(out.chance).toBeCloseTo(0.11, 5);
    expect(out.chanceRange?.low).toBeCloseTo(0.08, 5);
    expect(out.chanceRange?.high).toBeCloseTo(0.14, 5);
  });

  it("can push past a low selectivity ceiling (delta applied post-envelope)", () => {
    const capped: AdmissionFit = { ...base, chance: 0.15 }; // at an ultra ceiling
    expect(applyEssayChanceDelta(capped, 2).chance).toBeCloseTo(0.17, 5);
  });

  it("never exceeds 99% or drops below 0.5%", () => {
    expect(applyEssayChanceDelta({ ...base, chance: 0.985 }, 3).chance).toBe(
      0.99,
    );
    expect(applyEssayChanceDelta({ ...base, chance: 0.01 }, -3).chance).toBe(
      0.005,
    );
  });

  it("is a no-op for a null chance or a zero delta", () => {
    expect(
      applyEssayChanceDelta({ ...base, chance: null }, 2).chance,
    ).toBeNull();
    expect(applyEssayChanceDelta(base, 0)).toBe(base);
  });
});
