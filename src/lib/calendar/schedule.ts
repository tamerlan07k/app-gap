// Personalized Application Calendar — the DETERMINISTIC scheduling engine (no
// AI). It turns the student's eligible roadmap milestones + real application
// deadlines into dated tasks, scheduled BACKWARD from the deadline with:
//   • dependencies respected (drafting before revising, requirements first),
//   • work spread across the available time (never crammed on a few days),
//   • a buffer reserved before the deadline for revisions / final checks,
//   • a compact, prioritized plan when little time remains,
//   • provisional (grade-based) scheduling when no real deadline is known —
//     never a fabricated date.

import {
  etYearMonth,
  isoAddDays,
  isoDaysBetween,
  isoFromYMD,
  toISODate,
} from "~/lib/date";
import { MILESTONE_BY_ID } from "~/lib/roadmap/milestones";
import { eligibleTemplates } from "~/lib/roadmap/select";
import type { MilestoneTemplate, RoadmapContext } from "~/lib/roadmap/types";
import type { CalendarTask, CalendarTaskBranch, ScheduleResult } from "./types";

/** Ordering phase for a milestone — lower runs earlier in the plan. Encodes the
 *  natural dependency flow (review → testing → activities/awards → essays →
 *  final checks). */
function phaseWeight(m: MilestoneTemplate): number {
  switch (m.id) {
    case "acad-coursework":
    case "acad-grades":
    case "acad-readiness":
      return 1;
    case "acad-testing-plan":
    case "acad-testing-decision":
      return 2;
    case "activities-review":
    case "awards-review":
      return 3;
    case "activities-descriptions":
    case "activities-completeness":
    case "activities-continue":
    case "awards-details":
    case "awards-prioritize":
    case "awards-explore":
      return 4;
    case "essay-requirements":
      return 5;
    case "essay-personal-statement":
      return 6;
    case "essay-supplements":
      return 7;
    case "essay-final-check":
      return 9;
    default:
      return 5;
  }
}

/** A short, action-oriented calendar title for a milestone. */
function taskTitle(m: MilestoneTemplate): string {
  return m.title;
}

/**
 * Compute the anchoring deadline (horizon end ISO) + label for the student's
 * grade and the current date (resolved in ET). Seniors / gap-year applicants get
 * a SHORT, real ED/EA/RD anchor — never a year-long plan; juniors anchor to their
 * upcoming senior-fall season; underclassmen have no real deadline (provisional).
 */
function resolveHorizon(
  ctx: RoadmapContext,
  now: Date,
): { endISO: string; label: string | null; provisional: boolean } {
  const todayStr = toISODate(now);
  const { year, month } = etYearMonth(now);

  if (ctx.grade >= 12) {
    // Seniors (grade 12) and gap-year applicants (13): a compact application
    // sprint anchored to the nearest real deadline — at most ~8 weeks out, never
    // a year of assignments.
    if (month >= 6 && month <= 9) {
      // Jul–Oct → Early Decision/Action, ~Nov 1 this year.
      return {
        endISO: isoFromYMD(year, 11, 1),
        label: "Early applications (Nov 1)",
        provisional: false,
      };
    }
    if (month === 10 || month === 11) {
      // Nov–Dec → Regular Decision, ~Jan 1 next year.
      return {
        endISO: isoFromYMD(year + 1, 1, 1),
        label: "Regular applications (Jan 1)",
        provisional: false,
      };
    }
    if (month >= 0 && month <= 2) {
      // Jan–Mar → remaining/rolling deadlines, ~6 weeks out.
      return {
        endISO: isoAddDays(todayStr, 42),
        label: "Remaining applications",
        provisional: false,
      };
    }
    // Spring/summer senior → short wrap-up window.
    return {
      endISO: isoAddDays(todayStr, 56),
      label: "Final submissions",
      provisional: false,
    };
  }

  if (ctx.grade === 11) {
    // Junior → anchor to the upcoming senior-fall application season (Nov 1).
    return {
      endISO: isoFromYMD(year + 1, 11, 1),
      label: "Senior-year applications (next Nov 1)",
      provisional: false,
    };
  }

  // Underclassmen → no real application deadline. Provisional horizon = end of
  // the current school year (next June).
  const schoolYearEnd = month >= 6 ? year + 1 : year;
  return {
    endISO: isoFromYMD(schoolYearEnd, 6, 15),
    label: null,
    provisional: true,
  };
}

/** Explicit hard-deadline marker tasks within the horizon (seniors only). */
function deadlineMarkers(
  ctx: RoadmapContext,
  endISO: string,
  label: string | null,
): CalendarTask[] {
  if (ctx.grade < 12 || !label) return [];
  return [
    {
      title: `${label} due`,
      description:
        "Confirm each college's exact deadline on its official admissions page — dates vary by school.",
      branch: "deadline",
      milestoneId: null,
      href: "/dashboard/colleges",
      dueDate: endISO,
      status: "todo",
      deadlineSensitive: true,
      isProvisional: false,
      sortOrder: 1000,
    },
  ];
}

/**
 * Build the student's application calendar. Pure + deterministic, all dates in ET.
 */
export function buildSchedule(ctx: RoadmapContext, now: Date): ScheduleResult {
  const { endISO, label, provisional } = resolveHorizon(ctx, now);
  const startISO = toISODate(now);

  // Eligible milestones become the schedulable work, ordered by dependency phase.
  const milestones = eligibleTemplates(ctx)
    .slice()
    .sort((a, b) => phaseWeight(a) - phaseWeight(b) || a.order - b.order);

  // Reserve a buffer before the deadline for revisions / final checks.
  const totalDays = Math.max(1, isoDaysBetween(startISO, endISO));
  const bufferDays = Math.min(14, Math.max(2, Math.round(totalDays * 0.12)));
  const usableDays = Math.max(1, totalDays - bufferDays);

  const n = milestones.length;
  // Even spacing across the usable window, with a gentle lead-in so nothing lands
  // on day 0. Compact automatically when little time remains (small usableDays).
  const spacing = n > 0 ? usableDays / n : usableDays;

  const tasks: CalendarTask[] = milestones.map((m, i) => {
    const isFinal = m.id === "essay-final-check";
    // Final checks pin into the buffer window right before the deadline;
    // everything else spreads evenly across the usable window.
    const offset = isFinal
      ? totalDays - Math.min(bufferDays, 3)
      : Math.min(usableDays, Math.round(i * spacing + spacing / 2));
    const branch = m.branch as CalendarTaskBranch;
    return {
      title: taskTitle(m),
      description: m.description,
      branch,
      milestoneId: m.id,
      href: m.href,
      dueDate: isoAddDays(startISO, Math.max(0, offset)),
      status: "todo",
      deadlineSensitive: m.deadlineSensitive,
      isProvisional: provisional,
      sortOrder: i,
    };
  });

  const markers = deadlineMarkers(ctx, endISO, label);

  return {
    tasks: [...tasks, ...markers],
    horizonStart: startISO,
    horizonEnd: endISO,
    deadlineLabel: label,
    provisional,
  };
}

/** Look up the destination for a task's milestone (validated at render). */
export function taskHref(task: CalendarTask): string | null {
  if (task.href) return task.href;
  if (task.milestoneId)
    return MILESTONE_BY_ID.get(task.milestoneId)?.href ?? null;
  return null;
}
