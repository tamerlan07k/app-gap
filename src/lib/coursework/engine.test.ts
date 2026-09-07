import { describe, expect, it } from "vitest";
import { buildCourseworkProfile, emptyTarget } from "./engine";
import type { CourseworkInput } from "./types";

const base: Omit<CourseworkInput, "courses" | "fieldKey"> = {
  gradeLevel: "11",
  academicMajor: "",
  academicInterests: [],
  availability: {},
};

describe("buildCourseworkProfile", () => {
  it("assembles classification, rigor, findings, and a summary", () => {
    const profile = buildCourseworkProfile({
      ...base,
      fieldKey: "cs",
      courses: [
        {
          name: "AP Calculus BC",
          type: "ap",
          status: "completed",
          gradeLevel: "11",
          apExamScore: "5",
        },
        {
          name: "AP Computer Science A",
          type: "ap",
          status: "current",
          gradeLevel: "11",
          apExamScore: "not-taken",
        },
      ],
    });
    expect(profile.classified).toHaveLength(2);
    expect(profile.rigor.advancedCount).toBe(2);
    expect(profile.findings.length).toBeGreaterThan(0);
    expect(profile.summary.strengths).toBeGreaterThanOrEqual(2);
    expect(profile.summary.potentialGaps).toBe(0);
    expect(profile.target).toEqual(emptyTarget());
  });

  it("produces MEANINGFULLY different analyses for different students", () => {
    // Strong CS applicant.
    const a = buildCourseworkProfile({
      ...base,
      fieldKey: "cs",
      courses: [
        {
          name: "AP Calculus BC",
          type: "ap",
          status: "completed",
          gradeLevel: "12",
          apExamScore: "5",
        },
        {
          name: "AP Computer Science A",
          type: "ap",
          status: "completed",
          gradeLevel: "11",
          apExamScore: "5",
        },
      ],
    });

    // Humanities applicant with no coursework recorded.
    const b = buildCourseworkProfile({
      ...base,
      fieldKey: "humanities",
      courses: [],
    });

    expect(a.summary).not.toEqual(b.summary);
    expect(a.summary.strengths).toBeGreaterThan(b.summary.strengths);
    expect(b.summary.potentialGaps).toBeGreaterThan(0);
    // Different fields surface different preparation areas.
    expect(a.findings.map((f) => f.key)).not.toEqual(
      b.findings.map((f) => f.key),
    );
  });

  it("does not treat unknown availability as a gap for a strong applicant", () => {
    const profile = buildCourseworkProfile({
      ...base,
      fieldKey: "engineering",
      courses: [
        {
          name: "AP Calculus AB",
          type: "ap",
          status: "completed",
          gradeLevel: "11",
          apExamScore: "4",
        },
      ],
      availability: {}, // everything unsure
    });
    // Physics/chemistry not taken + unknown availability → unknown, never gaps.
    expect(profile.summary.potentialGaps).toBe(0);
    expect(profile.summary.unknown).toBeGreaterThan(0);
  });
});
