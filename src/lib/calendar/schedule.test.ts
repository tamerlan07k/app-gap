import { describe, expect, it } from "vitest";
import type { FullProfile } from "~/lib/ai/prompt";
import { isoDaysBetween } from "~/lib/date";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import { buildSchedule } from "./schedule";

function profile(overrides: Partial<FullProfile> = {}): FullProfile {
  return {
    gradeLevel: "12",
    unweightedGpa: 3.7,
    satScore: null,
    actScore: null,
    schoolType: "public",
    courses: [],
    majorCategory: "cs",
    academicMajor: "",
    academicInterests: [],
    specificMajor: "",
    careerInterest: "",
    activities: [
      {
        name: "Club",
        category: "clubs",
        grades: ["12"],
        leadershipRole: "",
        description: "",
        hoursPerWeek: 2,
        weeksPerYear: 30,
        meaningfulness: 3,
      },
    ],
    awards: [],
    additionalContext: null,
    personalStatementDraft: null,
    ...overrides,
  };
}

const SEP = new Date("2026-09-15T12:00:00");
const JAN = new Date("2027-01-10T12:00:00");
const MAY_SOPH = new Date("2026-05-15T12:00:00");

function ctx(grade: string, now: Date, overrides: Partial<FullProfile> = {}) {
  return buildRoadmapContext(profile({ gradeLevel: grade, ...overrides }), {
    now,
  });
}

describe("buildSchedule — seniors in the fall", () => {
  const result = buildSchedule(ctx("12", SEP), SEP);

  it("anchors to a real deadline (not provisional)", () => {
    expect(result.provisional).toBe(false);
    expect(result.deadlineLabel).toBeTruthy();
  });

  it("includes a hard deadline marker task", () => {
    expect(result.tasks.some((t) => t.branch === "deadline")).toBe(true);
  });

  it("schedules every task on or after today and within the horizon", () => {
    for (const t of result.tasks) {
      expect(t.dueDate >= result.horizonStart).toBe(true);
      expect(t.dueDate <= result.horizonEnd).toBe(true);
    }
  });

  it("spreads work across multiple days (no cramming)", () => {
    const milestoneTasks = result.tasks.filter((t) => t.milestoneId);
    const distinctDates = new Set(milestoneTasks.map((t) => t.dueDate));
    expect(distinctDates.size).toBeGreaterThan(1);
  });

  it("gives a 12th grader a compact plan — never a year of assignments", () => {
    const days = isoDaysBetween(result.horizonStart, result.horizonEnd);
    expect(days).toBeLessThanOrEqual(60);
  });

  it("places the final check near the end of the window", () => {
    const final = result.tasks.find(
      (t) => t.milestoneId === "essay-final-check",
    );
    if (final) {
      const end = new Date(`${result.horizonEnd}T00:00:00`).getTime();
      const due = new Date(`${final.dueDate}T00:00:00`).getTime();
      const start = new Date(`${result.horizonStart}T00:00:00`).getTime();
      // In the last third of the window.
      expect((due - start) / (end - start)).toBeGreaterThan(0.6);
    }
  });
});

describe("buildSchedule — compact when little time remains", () => {
  it("keeps a January senior's plan within a short horizon", () => {
    const result = buildSchedule(ctx("12", JAN), JAN);
    const days =
      (new Date(`${result.horizonEnd}T00:00:00`).getTime() -
        new Date(`${result.horizonStart}T00:00:00`).getTime()) /
      (24 * 60 * 60 * 1000);
    expect(days).toBeLessThanOrEqual(60);
  });
});

describe("buildSchedule — underclassmen", () => {
  it("is provisional with no fabricated deadline marker", () => {
    const result = buildSchedule(ctx("10", MAY_SOPH), MAY_SOPH);
    expect(result.provisional).toBe(true);
    expect(result.deadlineLabel).toBeNull();
    expect(result.tasks.some((t) => t.branch === "deadline")).toBe(false);
    expect(result.tasks.every((t) => t.isProvisional)).toBe(true);
  });
});
