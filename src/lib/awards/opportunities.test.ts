import { describe, expect, it } from "vitest";
import { rankOpportunities } from "./opportunities";
import { buildRecognitionProfile } from "./recognition";
import type { Opportunity, RecognitionProfile } from "./types";

const NOW = new Date(2026, 8, 26); // Sept 26, 2026

function opp(
  partial: Partial<Opportunity> & { id: string; name: string },
): Opportunity {
  return {
    organization: "",
    category: "competition",
    description: "",
    eligibleGrades: [],
    eligibilityNotes: "",
    costNote: "",
    fieldKeys: [],
    evidenceDimensions: [],
    effort: "moderate",
    estPrepTime: "",
    estPrepDaysMin: null,
    deadlineMonth: null,
    deadlineDay: null,
    deadlineNote: "",
    isRolling: false,
    applicationUrl: null,
    sourceUrl: null,
    ...partial,
  };
}

// A student with strong CS recognition and intended field CS. Awards-only, so the
// field-relevant recognition gaps are quantitative + research (cs-ai is covered).
const profile: RecognitionProfile = buildRecognitionProfile({
  awards: [
    {
      id: "a1",
      name: "Congressional App Challenge Winner",
      organization: "",
      year: "",
      level: "state-national",
      category: "",
      placement: "",
      grade: "",
      selectivityContext: "",
      description: "",
      evidenceUrl: null,
      studentExplanation: "",
    },
  ],
  fieldKey: "cs",
});

describe("rankOpportunities — connects the Recognition Map to the Finder", () => {
  it("filters out opportunities the student's grade can't enter", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({ id: "o1", name: "Seniors Only", eligibleGrades: ["12"] }),
      ],
      profile,
      gradeLevel: "10",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits).toHaveLength(0);
  });

  it("ranks a gap-filling, field-aligned opportunity as a strong fit", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({
          id: "research",
          name: "Research Program",
          fieldKeys: ["cs"],
          evidenceDimensions: ["research"], // a field gap the awards don't cover
          deadlineMonth: 2,
          deadlineDay: 1,
          estPrepDaysMin: 45,
        }),
      ],
      profile,
      gradeLevel: "11",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits[0].status).toBe("good_fit");
    expect(fits[0].addsThemes).toContain("research");
  });

  it("marks an opportunity as not_enough_time when the deadline beats the prep", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({
          id: "rush",
          name: "Big Research Prize",
          evidenceDimensions: ["research"],
          deadlineMonth: 10,
          deadlineDay: 10,
          estPrepDaysMin: 120, // needs 4 months, deadline ~2 weeks away
        }),
      ],
      profile,
      gradeLevel: "12",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits[0].status).toBe("not_enough_time");
  });

  it("keeps a quick, near-deadline opportunity feasible and time-sensitive", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({
          id: "quick",
          name: "Quick Service Scholarship",
          evidenceDimensions: ["service"],
          effort: "quick",
          deadlineMonth: 10,
          deadlineDay: 10,
          estPrepDaysMin: 1, // 20-minute application
        }),
      ],
      profile,
      gradeLevel: "12",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits[0].status).toBe("time_sensitive");
  });

  it("treats a pure-duplicate opportunity as low priority", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({
          id: "dupe",
          name: "Another CS Competition",
          fieldKeys: ["cs"],
          evidenceDimensions: ["cs-ai"], // student already strong here
          isRolling: true,
        }),
      ],
      profile,
      gradeLevel: "11",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits[0].status).toBe("low_priority");
    expect(fits[0].reinforcesThemes).toContain("cs-ai");
  });

  it("sorts gap-filling opportunities ahead of duplicates", () => {
    const fits = rankOpportunities({
      opportunities: [
        opp({
          id: "dupe",
          name: "Another CS Competition",
          evidenceDimensions: ["cs-ai"],
          isRolling: true,
        }),
        opp({
          id: "gap",
          name: "Leadership Award",
          evidenceDimensions: ["leadership"],
          isRolling: true,
        }),
      ],
      profile,
      gradeLevel: "11",
      fieldKey: "cs",
      now: NOW,
    });
    expect(fits[0].opportunity.id).toBe("gap");
  });
});
