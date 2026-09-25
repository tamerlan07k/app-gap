import { describe, expect, it } from "vitest";
import {
  ARCHETYPE_WEIGHTS,
  ARCHETYPES,
  normalizeWeightsTo100,
  resolveWeights,
} from "./archetypes";
import { DIMENSION_KEYS } from "./scoring";

describe("ARCHETYPE_WEIGHTS", () => {
  it("every archetype's weights sum to 100", () => {
    for (const a of ARCHETYPES) {
      const w = ARCHETYPE_WEIGHTS[a];
      const sum = DIMENSION_KEYS.reduce((acc, k) => acc + w[k], 0);
      expect(sum, `archetype ${a}`).toBe(100);
    }
  });
});

describe("normalizeWeightsTo100", () => {
  it("scales fractional weights to integers summing to 100", () => {
    const out = normalizeWeightsTo100({
      alignment: 1,
      reflection: 1,
      specificity: 1,
      voice: 1,
    });
    const sum = DIMENSION_KEYS.reduce((acc, k) => acc + out[k], 0);
    expect(sum).toBe(100);
  });

  it("preserves relative proportions", () => {
    const out = normalizeWeightsTo100({
      alignment: 40,
      reflection: 10,
      specificity: 40,
      voice: 10,
    });
    expect(out.alignment).toBe(40);
    expect(out.specificity).toBe(40);
    const sum = DIMENSION_KEYS.reduce((acc, k) => acc + out[k], 0);
    expect(sum).toBe(100);
  });
});

describe("resolveWeights", () => {
  it("uses the primary archetype's weights with no secondary", () => {
    const { weights } = resolveWeights("why_us", [], null);
    expect(weights).toEqual(ARCHETYPE_WEIGHTS.why_us);
  });

  it("forces the short-answer balance under a very short word limit", () => {
    const { weights, rationale } = resolveWeights("identity", [], 50);
    expect(weights).toEqual(ARCHETYPE_WEIGHTS.short_answer);
    expect(rationale).toMatch(/50 words/);
  });

  it("does not apply the short-answer override for a normal word limit", () => {
    const { weights } = resolveWeights("why_us", [], 400);
    expect(weights).toEqual(ARCHETYPE_WEIGHTS.why_us);
  });

  it("blends a secondary archetype 70/30 and still sums to 100", () => {
    const { weights } = resolveWeights(
      "why_major",
      ["intellectual_curiosity"],
      400,
    );
    const sum = DIMENSION_KEYS.reduce((acc, k) => acc + weights[k], 0);
    expect(sum).toBe(100);
    // The blend should differ from the pure primary weights.
    expect(weights).not.toEqual(ARCHETYPE_WEIGHTS.why_major);
  });

  it("ignores a secondary that equals the primary", () => {
    const { weights } = resolveWeights("challenge", ["challenge"], 400);
    expect(weights).toEqual(ARCHETYPE_WEIGHTS.challenge);
  });
});
