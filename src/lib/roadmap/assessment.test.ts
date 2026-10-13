import { describe, expect, it } from "vitest";
import { type AssessmentAnswers, scoreAssessment } from "./assessment";

describe("scoreAssessment", () => {
  it("surfaces CS as the top fit for computing-leaning answers", () => {
    const answers: AssessmentAnswers = {
      subjects: ["cs", "math"],
      activities: ["build"],
      problems: ["technical"],
      considered: ["cs"],
    };
    const result = scoreAssessment(answers);
    expect(result.undecided).toBe(false);
    expect(result.topFields[0].fieldKey).toBe("cs");
    expect(result.topFields[0].majors.length).toBeGreaterThan(0);
    expect(result.topFields[0].rationale).toMatch(/based on/i);
  });

  it("surfaces bio/pre-med for health-leaning answers", () => {
    const result = scoreAssessment({
      subjects: ["biology"],
      activities: ["research"],
      environment: ["lab"],
      considered: ["bio-premed"],
    });
    expect(result.topFields[0].fieldKey).toBe("bio-premed");
  });

  it("is undecided when nothing is selected", () => {
    const result = scoreAssessment({});
    expect(result.undecided).toBe(true);
    expect(result.topFields).toHaveLength(0);
  });

  it("ignores unknown question and option keys", () => {
    const result = scoreAssessment({
      subjects: ["cs", "not-a-real-option"],
      "not-a-real-question": ["whatever"],
    });
    expect(result.topFields[0].fieldKey).toBe("cs");
  });

  it("returns at most three suggested fields", () => {
    const result = scoreAssessment({
      subjects: [
        "math",
        "physics",
        "biology",
        "cs",
        "writing",
        "history",
        "art",
        "econ",
        "people",
      ],
    });
    expect(result.topFields.length).toBeLessThanOrEqual(3);
  });
});
