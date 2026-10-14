import { describe, expect, it } from "vitest";
import { classRankBoost, normalizeGpaTo4 } from "./academics";

describe("normalizeGpaTo4", () => {
  it("returns null for missing value or 'none' scale", () => {
    expect(normalizeGpaTo4(null, "4")).toBeNull();
    expect(normalizeGpaTo4(3.5, "none")).toBeNull();
    expect(normalizeGpaTo4(3.5, null)).toBeNull();
    expect(normalizeGpaTo4(Number.NaN, "4")).toBeNull();
  });

  it("passes a 4.0-scale value through (proportionally)", () => {
    expect(normalizeGpaTo4(4, "4")).toBe(4);
    expect(normalizeGpaTo4(3.6, "4")).toBe(3.6);
    expect(normalizeGpaTo4(0, "4")).toBe(0);
  });

  it("maps point scales proportionally against their max", () => {
    expect(normalizeGpaTo4(5, "5")).toBe(4); // perfect on a 5.0 scale
    expect(normalizeGpaTo4(4, "5")).toBe(3.2);
    expect(normalizeGpaTo4(10, "20")).toBe(2);
  });

  it("maps a 100-point scale via the letter-grade table", () => {
    expect(normalizeGpaTo4(95, "100")).toBe(4.0);
    expect(normalizeGpaTo4(91, "100")).toBe(3.7);
    expect(normalizeGpaTo4(84, "100")).toBe(3.0);
    expect(normalizeGpaTo4(50, "100")).toBe(0);
  });

  it("clamps out-of-range values", () => {
    expect(normalizeGpaTo4(6, "4")).toBe(4);
    expect(normalizeGpaTo4(120, "100")).toBe(4.0);
  });
});

describe("classRankBoost", () => {
  it("returns 0 when rank is absent or 'none'", () => {
    expect(classRankBoost(null)).toBe(0);
    expect(classRankBoost({ type: "none" })).toBe(0);
  });

  it("gives +5 to valedictorian / salutatorian (exact rank 1–2)", () => {
    expect(
      classRankBoost({ type: "exact", rankValue: 1, classSize: 500 }),
    ).toBe(5);
    expect(
      classRankBoost({ type: "exact", rankValue: 2, classSize: 500 }),
    ).toBe(5);
  });

  it("gives +3 for top 10% and +1 for top 20% (exact)", () => {
    expect(
      classRankBoost({ type: "exact", rankValue: 20, classSize: 300 }),
    ).toBe(3); // ~6.7%
    expect(
      classRankBoost({ type: "exact", rankValue: 45, classSize: 300 }),
    ).toBe(1); // 15%
    expect(
      classRankBoost({ type: "exact", rankValue: 150, classSize: 300 }),
    ).toBe(0); // 50%
  });

  it("maps coarse bands to the best tier they prove", () => {
    expect(classRankBoost({ type: "decile", band: "1" })).toBe(3);
    expect(classRankBoost({ type: "decile", band: "2" })).toBe(1);
    expect(classRankBoost({ type: "decile", band: "3" })).toBe(0);
    expect(classRankBoost({ type: "quintile", band: "1" })).toBe(1);
    expect(classRankBoost({ type: "quintile", band: "2" })).toBe(0);
    expect(classRankBoost({ type: "quartile", band: "1" })).toBe(1);
    expect(classRankBoost({ type: "quartile", band: "2" })).toBe(0);
  });

  it("ignores an invalid exact rank (missing size, rank > size)", () => {
    expect(
      classRankBoost({ type: "exact", rankValue: 10, classSize: null }),
    ).toBe(0);
    expect(
      classRankBoost({ type: "exact", rankValue: 400, classSize: 300 }),
    ).toBe(0);
  });
});
