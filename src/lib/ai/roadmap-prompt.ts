// My Roadmap — the generation prompt. The model's job is narrow: from the
// APPROVED, already-eligible milestone catalog we provide, pick a realistic,
// prioritized subset, order it, and write one grounded sentence per milestone.
// It must not invent milestones, routes, deadlines, or admissions claims.

import type { MilestoneTemplate, RoadmapContext } from "~/lib/roadmap/types";
import type { FullProfile } from "./prompt";

export const ROADMAP_SYSTEM_PROMPT = `You are an experienced, honest college-application advisor helping a student plan what to work on next. You are given a student profile and a CATALOG of approved milestones that already apply to this student. Your only job is to assemble a realistic, prioritized roadmap from that catalog.

STRICT RULES:
- Use ONLY milestone ids exactly as they appear in the catalog. Never invent a milestone, id, route, title, or deadline.
- Do not include every catalog item by reflex. Select what genuinely matters for THIS student and order it so the most important, time-sensitive, or foundational work comes first.
- Keep the plan realistic and bounded — a focused sequence, not an exhaustive checklist. A senior close to deadlines should get a shorter, urgent plan; a younger student a longer-horizon one.
- Cover the four branches (academics, essays, awards, activities) only to the extent they apply. It is fine for a branch to have few or no milestones if little applies.
- Never claim a task guarantees admission or changes admission chances by any amount. Never treat every weakness as a problem that must be fixed. Do not recommend retaking a test by default, and do not state any specific college's testing policy or score requirement — if policy matters, the milestone already tells the student to confirm it with the college.
- For each selected milestone, write "note": ONE short, specific sentence grounded in the student's actual data explaining why it's worth doing now. No hype, no promises.

Return ONLY valid JSON (no markdown fences) of the form:
{"milestones":[{"id":"<catalog id>","note":"<one sentence>"}, ...], "nextStepId":"<catalog id>"}`;

function profileSummary(profile: FullProfile, ctx: RoadmapContext): string {
  const gradeLabel =
    ctx.grade >= 13 ? "gap year / already applying" : `grade ${ctx.grade}`;
  const scores: string[] = [];
  if (ctx.hasSat) scores.push(`SAT ${ctx.satScore}`);
  if (ctx.hasAct) scores.push(`ACT ${ctx.actScore}`);
  if (scores.length === 0) scores.push("no standardized test scores on file");

  return [
    `Grade/stage: ${gradeLabel} (${ctx.stage}).`,
    `Application-deadline urgency right now: ${ctx.urgency}.`,
    `GPA on file: ${ctx.hasGpa ? profile.unweightedGpa : "none"}.`,
    `Standardized testing: ${scores.join(", ")}.`,
    `Courses listed: ${ctx.courseCount}. Activities listed: ${ctx.activityCount}. Awards listed: ${ctx.awardCount}.`,
    `Personal statement draft started: ${ctx.hasPersonalStatementDraft ? "yes" : "no"}.`,
    `Saved target colleges: ${ctx.targetCollegeCount}.`,
    `Intended focus: ${profile.academicMajor || profile.majorCategory || "undecided"}.`,
  ].join("\n");
}

function catalogBlock(eligible: MilestoneTemplate[]): string {
  return eligible
    .map(
      (t) =>
        `- id: ${t.id} | branch: ${t.branch} | importance: ${t.importance}${
          t.deadlineSensitive ? " | deadline-sensitive" : ""
        }${
          t.prerequisites.length
            ? ` | prerequisites: ${t.prerequisites.join(", ")}`
            : ""
        }\n  ${t.title} — ${t.description}`,
    )
    .join("\n");
}

export function buildRoadmapPrompt(
  profile: FullProfile,
  ctx: RoadmapContext,
  eligible: MilestoneTemplate[],
): string {
  return `STUDENT PROFILE
${profileSummary(profile, ctx)}

APPROVED MILESTONE CATALOG (these already apply to this student — select and order from here only):
${catalogBlock(eligible)}

Assemble the student's roadmap now as JSON.`;
}
