import { describe, expect, it } from "vitest";
import {
  activityWritingFeedbackSchema,
  writingAnalysisSchema,
} from "./writing-schema";

// A complete activity feedback object as produced BEFORE tightenedDescription
// existed — i.e. what older cached rows in writing_analyses look like.
const legacyActivity = {
  activityName: "Varsity Soccer",
  actionVerb: { score: 7, note: "Opens with a solid verb." },
  specificity: { score: 6, note: "Names a role but few specifics." },
  impact: { score: 5, note: "Outcome is implied, not stated." },
  groundable: true,
  polishNote: "Lead with the verb.",
  improvedDescription: "Captained 18-player varsity squad to regional finals.",
  template: null,
};

describe("writing schema backward compatibility", () => {
  it("defaults tightenedDescription to null when absent (legacy cached rows)", () => {
    const parsed = activityWritingFeedbackSchema.parse(legacyActivity);
    expect(parsed.tightenedDescription).toBeNull();
  });

  it("accepts a provided tightenedDescription", () => {
    const parsed = activityWritingFeedbackSchema.parse({
      ...legacyActivity,
      tightenedDescription:
        "Captained 18-player varsity squad; reached finals.",
    });
    expect(parsed.tightenedDescription).toBe(
      "Captained 18-player varsity squad; reached finals.",
    );
  });

  it("validates a full legacy analysis payload without the new field", () => {
    const parsed = writingAnalysisSchema.parse({
      activities: [legacyActivity],
      additionalInfo: null,
    });
    expect(parsed.activities[0].tightenedDescription).toBeNull();
    expect(parsed.additionalInfo).toBeNull();
  });
});
