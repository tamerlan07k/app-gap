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
