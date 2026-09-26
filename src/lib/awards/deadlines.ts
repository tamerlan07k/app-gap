// Deterministic, date-aware deadline math for opportunities. No AI, no hardcoded
// year: deadlines are stored as a RECURRING month (+ optional day) and this
// resolves the NEXT occurrence relative to the current date, then decides whether
// there is realistically enough preparation time.
//
// Honesty rules baked in here:
//   • When the exact day is unknown, we still compute coarse timing (assuming
//     mid-month) BUT flag exactDay:false so the UI shows the human deadlineNote
//     rather than a fabricated exact date.
//   • Rolling / undatable opportunities return null timing — they are never
//     filtered out for being "too late" and never marked "not enough time".

import type { Opportunity, OpportunityTiming } from "./types";

/** Window (days) within which a still-feasible deadline is considered urgent. */
export const URGENT_WINDOW_DAYS = 28;

const DAY_MS = 24 * 60 * 60 * 1000;
const ASSUMED_DAY = 15; // used only for coarse timing when the exact day is unknown

/** Clamp a day to the number of days in the given month/year (handles Feb, etc.). */
function clampDay(year: number, monthIndex0: number, day: number): number {
  const daysInMonth = new Date(year, monthIndex0 + 1, 0).getDate();
  return Math.min(Math.max(day, 1), daysInMonth);
}

/**
 * The next occurrence of a recurring (month, day) deadline at or after `now`
 * (comparing by date, not time). If this year's date has already passed, roll to
 * next year.
 */
export function nextDeadlineDate(
  month1to12: number,
  day: number | null,
  now: Date,
): Date {
  const monthIndex0 = month1to12 - 1;
  const targetDay = day ?? ASSUMED_DAY;
  const year = now.getFullYear();

  const thisYear = new Date(
    year,
    monthIndex0,
    clampDay(year, monthIndex0, targetDay),
  );
  // Compare on day granularity so a deadline "today" still counts as upcoming.
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  if (thisYear.getTime() >= startOfToday.getTime()) return thisYear;

  const nextYear = year + 1;
  return new Date(
    nextYear,
    monthIndex0,
    clampDay(nextYear, monthIndex0, targetDay),
  );
}

/** Whole days from `now` (date granularity) to `target`. */
export function daysBetween(now: Date, target: Date): number {
  const a = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const b = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
  ).getTime();
  return Math.round((b - a) / DAY_MS);
}

/**
 * Resolve timing for an opportunity. Returns null for rolling/undatable
 * opportunities (they have no deadline to be late for). Otherwise computes days
 * until the next occurrence and whether the student has enough lead time.
 */
export function resolveTiming(
  opp: Pick<
    Opportunity,
    "deadlineMonth" | "deadlineDay" | "estPrepDaysMin" | "isRolling"
  >,
  now: Date,
): OpportunityTiming | null {
  if (opp.isRolling || opp.deadlineMonth == null) return null;

  const nextDate = nextDeadlineDate(opp.deadlineMonth, opp.deadlineDay, now);
  const daysUntil = daysBetween(now, nextDate);

  // Enough prep time? Unknown prep requirement → assume feasible (don't penalize
  // for missing data). Otherwise there must be at least the minimum lead time.
  const feasible =
    opp.estPrepDaysMin == null ? true : daysUntil >= opp.estPrepDaysMin;

  const urgent = feasible && daysUntil <= URGENT_WINDOW_DAYS;

  return {
    daysUntil,
    feasible,
    urgent,
    exactDay: opp.deadlineDay != null,
    nextDate,
  };
}
