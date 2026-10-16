import { describe, expect, it } from "vitest";
import {
  COLUMBIA_EVALUATION_ADDENDUM,
  COLUMBIA_LINE_BY_LINE_ADDENDUM,
  COLUMBIA_SLUG,
  coverageModelFor,
  isColumbia,
} from "./columbia";

describe("isColumbia", () => {
  it("matches Columbia University's exact slug", () => {
    expect(isColumbia(COLUMBIA_SLUG)).toBe(true);
    expect(isColumbia("columbia-university-in-the-city-of-new-york")).toBe(
      true,
    );
  });

  it("is case/whitespace tolerant on the exact slug", () => {
    expect(isColumbia("  Columbia-University-In-The-City-Of-New-York ")).toBe(
      true,
    );
  });

  it("does NOT match other 'columbia' schools (no substring capture)", () => {
    // These are real, different colleges in the dataset — the Columbia-only
    // grading must never leak onto them (spec requirement #6).
    for (const slug of [
      "columbia-college",
      "columbia-college-chicago",
      "columbia-international-university",
      "university-of-missouri-columbia",
      "university-of-south-carolina-columbia",
      "columbia-university", // not the canonical slug in this dataset
    ]) {
      expect(isColumbia(slug)).toBe(false);
    }
  });

  it("is false for null/undefined/empty", () => {
    expect(isColumbia(null)).toBe(false);
    expect(isColumbia(undefined)).toBe(false);
    expect(isColumbia("")).toBe(false);
  });
});

describe("coverageModelFor", () => {
  it("returns the lenient model only for Columbia", () => {
    expect(coverageModelFor(COLUMBIA_SLUG)).toBe("lenient");
  });

  it("returns the strict model for every other college and for no slug", () => {
    expect(coverageModelFor("harvard-university")).toBe("strict");
    expect(coverageModelFor("columbia-college")).toBe("strict");
    expect(coverageModelFor(null)).toBe("strict");
  });
});

describe("Columbia addenda content", () => {
  it("the evaluator addendum encodes the key corrective rules", () => {
    const a = COLUMBIA_EVALUATION_ADDENDUM;
    // Prompt alignment must not dominate.
    expect(a).toMatch(/must not dominate|not .*dominate/i);
    expect(a).toMatch(/reasonable alternative interpretation/i);
    expect(a).toMatch(/material failure/i);
    // Kill the name-swap uniqueness test; require evidence.
    expect(a).toMatch(/swap/i);
    expect(a).toMatch(/quote the exact|point to the exact|exact sentence/i);
    // No cross-category repetition.
    expect(a).toMatch(/non-repetitive|do not restate|appears ONCE/i);
    // Per-prompt understanding, incl. the list prompt.
    expect(a).toMatch(/list/i);
    expect(a).toMatch(/Why Columbia/i);
  });

  it("the line-by-line addendum guards name-drops and the list prompt", () => {
    const a = COLUMBIA_LINE_BY_LINE_ADDENDUM;
    expect(a).toMatch(/superficial_namedrop/i);
    expect(a).toMatch(/list prompt/i);
  });
});
