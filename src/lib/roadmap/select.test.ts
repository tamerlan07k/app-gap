import { describe, expect, it } from "vitest";
import type { FullProfile } from "~/lib/ai/prompt";
import { buildRoadmapContext } from "./context";
import {
  KNOWN_ROUTES,
  MILESTONE_LIBRARY,
  VALID_MILESTONE_IDS,
} from "./milestones";
import {
  adaptRoadmap,
  buildFromIds,
  deriveRoadmap,
  deterministicRoadmap,
  eligibleTemplates,
  roadmapProgress,
} from "./select";
import type { RoadmapContext, SavedMilestone } from "./types";

function profile(overrides: Partial<FullProfile> = {}): FullProfile {
  return {
    gradeLevel: "11",
    unweightedGpa: 3.8,
    satScore: null,
    actScore: null,
    schoolType: "public",
    courses: [],
    majorCategory: "cs",
    academicMajor: "",
    academicInterests: [],
    specificMajor: "",
    careerInterest: "",
    activities: [],
    awards: [],
    additionalContext: null,
    personalStatementDraft: null,
    ...overrides,
  };
}

const JAN = new Date("2026-01-15T12:00:00Z"); // senior ED/RD crunch
const MAY = new Date("2026-05-15T12:00:00Z");

function ctxFor(
  grade: string,
  now: Date,
  overrides: Partial<FullProfile> = {},
): RoadmapContext {
  return buildRoadmapContext(profile({ gradeLevel: grade, ...overrides }), {
    now,
  });
}

describe("milestone library integrity", () => {
  it("every milestone href resolves to a known in-app route", () => {
    for (const m of MILESTONE_LIBRARY) {
      expect(KNOWN_ROUTES.has(m.href)).toBe(true);
    }
  });

  it("every prerequisite references a real milestone id", () => {
    for (const m of MILESTONE_LIBRARY) {
      for (const p of m.prerequisites) {
        expect(VALID_MILESTONE_IDS.has(p)).toBe(true);
      }
    }
  });

  it("milestone ids are unique", () => {
    const ids = MILESTONE_LIBRARY.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("grade / deadline / profile affect selection", () => {
  it("underclassmen get exploration milestones; seniors do not", () => {
    const fresh = eligibleTemplates(ctxFor("9", MAY)).map((t) => t.id);
    const senior = eligibleTemplates(ctxFor("12", JAN)).map((t) => t.id);
    expect(fresh).toContain("awards-explore");
    expect(fresh).toContain("activities-continue");
    expect(senior).not.toContain("awards-explore");
    expect(senior).not.toContain("activities-continue");
  });

  it("seniors get the score-submission decision, not a testing plan", () => {
    const senior = eligibleTemplates(ctxFor("12", JAN)).map((t) => t.id);
    const junior = eligibleTemplates(ctxFor("11", MAY)).map((t) => t.id);
    expect(senior).toContain("acad-testing-decision");
    expect(senior).not.toContain("acad-testing-plan");
    expect(junior).toContain("acad-testing-plan");
    expect(junior).not.toContain("acad-testing-decision");
  });

  it("award-detail milestones require existing awards", () => {
    const noAwards = eligibleTemplates(ctxFor("11", MAY)).map((t) => t.id);
    const withAwards = eligibleTemplates(
      ctxFor("11", MAY, {
        awards: [{ name: "x", level: "state", grade: "11" }],
      }),
    ).map((t) => t.id);
    expect(noAwards).not.toContain("awards-details");
    expect(withAwards).toContain("awards-details");
  });

  it("senior in-season has high deadline urgency; underclassman has none", () => {
    expect(ctxFor("12", JAN).urgency).toBe("high");
    expect(ctxFor("9", MAY).urgency).toBe("none");
  });
});

describe("deriveRoadmap — states and next step", () => {
  it("picks a single current step and locks milestones behind prerequisites", () => {
    const ctx = ctxFor("12", JAN, {
      awards: [{ name: "x", level: "state", grade: "11" }],
    });
    const saved = deterministicRoadmap(ctx);
    const { milestones, nextStepId } = deriveRoadmap(saved, ctx);

    const currents = milestones.filter((m) => m.state === "current");
    expect(currents).toHaveLength(1);
    expect(nextStepId).toBe(currents[0].id);

    // essay-supplements requires essay-requirements → locked initially.
    const supplements = milestones.find((m) => m.id === "essay-supplements");
    expect(supplements?.state).toBe("locked");
  });

  it("deadline-sensitive required work is prioritized as the next step for seniors", () => {
    const ctx = ctxFor("12", JAN);
    const { milestones } = deriveRoadmap(deterministicRoadmap(ctx), ctx);
    const current = milestones.find((m) => m.state === "current");
    expect(current?.deadlineSensitive).toBe(true);
  });
});

describe("validation of generation output", () => {
  it("drops invalid, ineligible, and duplicate ids", () => {
    const ctx = ctxFor("12", JAN);
    const built = buildFromIds(
      [
        "acad-coursework",
        "acad-coursework", // duplicate
        "totally-made-up-id", // invalid
        "awards-explore", // ineligible for seniors
        "essay-requirements",
      ],
      ctx,
    );
    const ids = built?.map((m) => m.id);
    expect(ids).toEqual(["acad-coursework", "essay-requirements"]);
  });

  it("returns null when nothing valid survives (caller falls back)", () => {
    const ctx = ctxFor("11", MAY);
    expect(buildFromIds(["nope", "also-nope"], ctx)).toBeNull();
  });

  it("keeps a valid personalized note, ignores notes for dropped ids", () => {
    const ctx = ctxFor("11", MAY);
    const built = buildFromIds(["acad-coursework"], ctx, {
      "acad-coursework": "Your CS path has a clear next course.",
      "made-up": "ignored",
    });
    expect(built?.[0].note).toContain("CS path");
  });
});

describe("adaptation preserves progress and doesn't need AI", () => {
  it("keeps completed milestones and advances the next step", () => {
    const ctx = ctxFor("11", MAY);
    const saved = deterministicRoadmap(ctx);
    const firstId = deriveRoadmap(saved, ctx).nextStepId as string;

    // Complete the current step.
    const afterComplete: SavedMilestone[] = saved.map((m) =>
      m.id === firstId ? { ...m, state: "complete" } : m,
    );
    const adapted = adaptRoadmap(afterComplete, ctx);

    // Completed stays completed; a different step is now recommended.
    expect(adapted.milestones.find((m) => m.id === firstId)?.state).toBe(
      "complete",
    );
    expect(adapted.nextStepId).not.toBe(firstId);
    expect(adapted.nextStepId).not.toBeNull();
  });

  it("marks a now-ineligible milestone skipped without deleting it, and never resets completed work", () => {
    // Junior roadmap includes awards-explore (exploration). Advance to senior.
    const jrCtx = ctxFor("11", MAY);
    const saved = deterministicRoadmap(jrCtx);
    expect(saved.some((m) => m.id === "awards-explore")).toBe(true);

    // Complete coursework, then the student becomes a senior in-season.
    const withProgress: SavedMilestone[] = saved.map((m) =>
      m.id === "acad-coursework" ? { ...m, state: "complete" } : m,
    );
    const srCtx = ctxFor("12", JAN);
    const adapted = adaptRoadmap(withProgress, srCtx);

    const explore = adapted.milestones.find((m) => m.id === "awards-explore");
    expect(explore).toBeDefined(); // not deleted
    expect(explore?.state).toBe("skipped"); // no longer applicable
    expect(
      adapted.milestones.find((m) => m.id === "acad-coursework")?.state,
    ).toBe("complete"); // progress preserved
  });

  it("completing everything leaves no next step", () => {
    const ctx = ctxFor("9", MAY);
    const saved = deterministicRoadmap(ctx).map((m) => ({
      ...m,
      state: "complete" as const,
    }));
    const { nextStepId, milestones } = deriveRoadmap(saved, ctx);
    expect(nextStepId).toBeNull();
    expect(roadmapProgress(milestones).percent).toBe(100);
  });
});
