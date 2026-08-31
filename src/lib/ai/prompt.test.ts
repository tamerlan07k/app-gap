// Prompt-input tests — guard that the AppGap analysis is contextualized on an
// ABSOLUTE scale and carries NO college-list / selectivity-tier input, so the
// score can never shift with the student's college list.

import { describe, expect, it } from "vitest";
import {
  buildProfilePrompt,
  computeScoreSignal,
  type FullProfile,
} from "./prompt";

const base: FullProfile = {
  gradeLevel: "11",
  unweightedGpa: 3.9,
  satScore: 1450,
  actScore: null,
  schoolType: "public",
  courses: [],
  majorCategory: "cs",
  academicMajor: "computer-science",
  academicInterests: ["ai", "machine-learning"],
  specificMajor: "",
  careerInterest: "",
  activities: [],
  awards: [],
};

describe("computeScoreSignal is absolute and list-independent", () => {
  it("reports a national percentile, not a tier gap", () => {
    const signal = computeScoreSignal(base);
    expect(signal).toMatch(/percentile nationally/);
    expect(signal).not.toMatch(/median/);
  });

  it("is a pure function of the student's own scores", () => {
    expect(computeScoreSignal(base)).toBe(computeScoreSignal({ ...base }));
  });

  it("does not vary with the intended major/direction", () => {
    const a = computeScoreSignal(base);
    const b = computeScoreSignal({
      ...base,
      majorCategory: "humanities",
      academicMajor: "history",
      academicInterests: [],
    });
    expect(a).toBe(b);
  });

  it("higher score → higher percentile", () => {
    const lo = computeScoreSignal({ ...base, satScore: 1100 });
    const hi = computeScoreSignal({ ...base, satScore: 1550 });
    const pct = (s: string) => Number(s.match(/(\d+)th percentile/)?.[1] ?? 0);
    expect(pct(hi)).toBeGreaterThan(pct(lo));
  });
});

describe("buildProfilePrompt carries no target-selectivity input", () => {
  it("has no selectivity-tier line and no college-list content", () => {
    const prompt = buildProfilePrompt(base);
    expect(prompt).not.toMatch(/Target School Selectivity/);
    expect(prompt).not.toMatch(/selectivity target/i);
    // The academic direction is present (absolute context is fine).
    expect(prompt).toMatch(/Intended Major/);
    expect(prompt).toMatch(/percentile nationally/);
  });
});
