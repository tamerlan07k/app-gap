// My Roadmap — build the deterministic RoadmapContext from a student's profile.
// This is pure and code-only (no AI): it is the single source of grade, stage,
// deadline urgency, and "what the student already has" that drives milestone
// selection, ordering, and later adaptation.

import type { FullProfile } from "~/lib/ai/prompt";
import type { RoadmapContext } from "./types";

/** Parse the stored grade_level ("9".."12" or "gap") into a number (gap → 13). */
export function parseGrade(gradeLevel: string | null | undefined): number {
  if (gradeLevel === "gap") return 13;
  const n = Number.parseInt(gradeLevel ?? "", 10);
  return Number.isFinite(n) ? n : 9;
}

function stageFor(grade: number): RoadmapContext["stage"] {
  if (grade >= 13) return "applying";
  if (grade === 12) return "senior";
  if (grade === 11) return "junior";
  return "underclassman";
}

/**
 * Deadline urgency, grade- and month-aware. Seniors in the active fall window get
 * the highest urgency (ED/EA → RD); juniors ramp up in spring; underclassmen are
 * never pushed onto a senior deadline clock. `now` is injected for testability.
 */
function urgencyFor(
  grade: number,
  month: number,
): { urgency: RoadmapContext["urgency"]; inApplicationWindow: boolean } {
  // Seniors (and gap-year applicants): fall → early winter is the deadline crunch.
  if (grade >= 12) {
    const inWindow = month >= 7 || month <= 1; // Aug–Feb
    // Sep–Dec (ED/EA) and Jan (RD Jan 1) are the high-pressure months.
    if ((month >= 8 && month <= 11) || month === 0) {
      return { urgency: "high", inApplicationWindow: true };
    }
    // Aug (just before ED/EA) and Feb (late/rolling) are medium.
    if (month === 7 || month === 1) {
      return { urgency: "medium", inApplicationWindow: true };
    }
    return { urgency: "low", inApplicationWindow: inWindow }; // spring/summer of senior year
  }
  // Juniors: deadlines are a year out, but spring is when planning should start.
  if (grade === 11) {
    return { urgency: month >= 2 ? "low" : "none", inApplicationWindow: false };
  }
  // Underclassmen: no application-deadline pressure.
  return { urgency: "none", inApplicationWindow: false };
}

export function buildRoadmapContext(
  profile: FullProfile,
  opts: { now?: Date; targetCollegeCount?: number } = {},
): RoadmapContext {
  const now = opts.now ?? new Date();
  const grade = parseGrade(profile.gradeLevel);
  const month = now.getMonth();
  const { urgency, inApplicationWindow } = urgencyFor(grade, month);

  return {
    grade,
    stage: stageFor(grade),
    month,
    inApplicationWindow,
    urgency,
    hasSat: profile.satScore != null,
    hasAct: profile.actScore != null,
    satScore: profile.satScore ?? null,
    actScore: profile.actScore ?? null,
    hasGpa: profile.unweightedGpa != null,
    courseCount: profile.courses.length,
    activityCount: profile.activities.length,
    awardCount: profile.awards.length,
    hasPersonalStatementDraft: !!profile.personalStatementDraft?.trim(),
    targetCollegeCount: opts.targetCollegeCount ?? 0,
  };
}
