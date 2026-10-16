import { describe, expect, it } from "vitest";
import { resolveWeights } from "./archetypes";
import { scoreEvaluation } from "./evaluate";
import type { RawEvaluation } from "./schemas";

function raw(overrides: Partial<RawEvaluation> = {}): RawEvaluation {
  return {
    overview: "ok",
    dimensions: [
      {
        key: "alignment",
        score: 90,
        summary: "",
        strengths: [],
        improvements: [],
      },
      {
        key: "reflection",
        score: 70,
        summary: "",
        strengths: [],
        improvements: [],
      },
      {
        key: "specificity",
        score: 80,
        summary: "",
        strengths: [],
        improvements: [],
      },
      { key: "voice", score: 60, summary: "", strengths: [], improvements: [] },
    ],
    directives: [],
    mainWeakness: "",
    keyEvidence: [],
    guidedQuestions: [],
    collegeSpecificity: null,
    swapTest: null,
    ...overrides,
  };
}

const equalWeights = {
  alignment: 25,
  reflection: 25,
  specificity: 25,
  voice: 25,
};

describe("scoreEvaluation", () => {
  it("leaves alignment untouched when there are no directives", () => {
    const scored = scoreEvaluation(raw(), equalWeights, "test");
    const alignment = scored.dimensions.find((d) => d.key === "alignment");
    expect(alignment?.score).toBe(90);
    expect(alignment?.adjusted).toBe(false);
    expect(scored.coverageRatio).toBe(1);
    // Equal-weighted average of 90/70/80/60 = 75.
    expect(scored.overall).toBe(75);
  });

  it("scales alignment down by directive coverage (2 of 3 answered)", () => {
    const scored = scoreEvaluation(
      raw({
        directives: [
          { directive: "a", status: "addressed", note: "" },
          { directive: "b", status: "addressed", note: "" },
          { directive: "c", status: "missing", note: "" },
        ],
      }),
      equalWeights,
      "test",
    );
    const alignment = scored.dimensions.find((d) => d.key === "alignment");
    // coverage = 2/3 ≈ 0.6667; 90 * 0.6667 = 60
    expect(scored.coverageRatio).toBeCloseTo(2 / 3, 5);
    expect(alignment?.score).toBe(60);
    expect(alignment?.rawScore).toBe(90);
    expect(alignment?.adjusted).toBe(true);
  });

  it("a missing directive drags the overall down even with strong prose", () => {
    const full = scoreEvaluation(raw(), equalWeights, "t").overall;
    const partial = scoreEvaluation(
      raw({
        directives: [
          { directive: "a", status: "addressed", note: "" },
          { directive: "b", status: "missing", note: "" },
        ],
      }),
      equalWeights,
      "t",
    ).overall;
    expect(partial).toBeLessThan(full);
  });

  it("uses archetype weighting for the overall", () => {
    const { weights, rationale } = resolveWeights("why_us", [], 400);
    const scored = scoreEvaluation(raw(), weights, rationale);
    // why_us: alignment30 reflection15 specificity40 voice15 on 90/70/80/60
    // (90*30 + 70*15 + 80*40 + 60*15)/100 = (2700+1050+3200+900)/100 = 78.5 → 79
    expect(scored.overall).toBe(79);
    expect(scored.weights).toEqual(weights);
  });
});

describe("scoreEvaluation coverage model (Columbia leniency)", () => {
  const twoOfThree = raw({
    directives: [
      { directive: "a", status: "addressed", note: "" },
      { directive: "b", status: "addressed", note: "" },
      { directive: "c", status: "missing", note: "" },
    ],
  });

  it("defaults to the strict model (every other college unchanged)", () => {
    // Regression guard for spec #6: no coverageModel == today's exact behavior.
    const strict = scoreEvaluation(twoOfThree, equalWeights, "t");
    const alignment = strict.dimensions.find((d) => d.key === "alignment");
    // 90 * (2/3) = 60, exactly as before this change.
    expect(alignment?.score).toBe(60);
  });

  it("the lenient model dampens the penalty but still penalizes", () => {
    const lenient = scoreEvaluation(twoOfThree, equalWeights, "t", {
      coverageModel: "lenient",
    });
    const alignment = lenient.dimensions.find((d) => d.key === "alignment");
    // factor = 0.7 + 0.3*(2/3) = 0.9 → 90 * 0.9 = 81.
    expect(alignment?.score).toBe(81);
    // Still below the raw 90 (a real omission costs something)...
    expect(alignment?.score).toBeLessThan(90);
    expect(alignment?.adjusted).toBe(true);
    // ...but materially higher than the strict 60 (compliance no longer dominates).
    const strict = scoreEvaluation(
      twoOfThree,
      equalWeights,
      "t",
    ).dimensions.find((d) => d.key === "alignment");
    expect(alignment?.score).toBeGreaterThan(strict?.score ?? 0);
  });

  it("the lenient model floors the penalty at 70% even when nothing is covered", () => {
    const allMissing = raw({
      directives: [
        { directive: "a", status: "missing", note: "" },
        { directive: "b", status: "missing", note: "" },
      ],
    });
    const strict = scoreEvaluation(
      allMissing,
      equalWeights,
      "t",
    ).dimensions.find((d) => d.key === "alignment");
    const lenient = scoreEvaluation(allMissing, equalWeights, "t", {
      coverageModel: "lenient",
    }).dimensions.find((d) => d.key === "alignment");
    // strict zeroes alignment; lenient keeps 70% (the model's own sub-score still
    // carries a true material failure — this only stops the mechanical double hit).
    expect(strict?.score).toBe(0);
    expect(lenient?.score).toBe(63); // 90 * 0.7
  });

  it("leaves alignment untouched under both models when coverage is full", () => {
    const strict = scoreEvaluation(raw(), equalWeights, "t");
    const lenient = scoreEvaluation(raw(), equalWeights, "t", {
      coverageModel: "lenient",
    });
    const a = (s: typeof strict) =>
      s.dimensions.find((d) => d.key === "alignment")?.score;
    expect(a(strict)).toBe(90);
    expect(a(lenient)).toBe(90);
  });
});
