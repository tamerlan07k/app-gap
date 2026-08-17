// Deterministic per-activity and portfolio metrics for the Activities workspace.
//
// These are computed in code (never by the AI) and are used two ways: (1) fed
// into the AI prompt as pre-analyzed signals so the model reasons over facts
// instead of re-deriving arithmetic, and (2) shown directly in the UI. Mirrors
// the "compute the numbers, let the model explain them" philosophy used by the
// gap analysis and the college matching engine.

export type ActivityInput = {
  name: string;
  category: string;
  grades: string[];
  leadershipRole: string;
  description: string;
  hoursPerWeek: number | null;
  weeksPerYear: number | null;
  meaningfulness: number | null;
};

export type ActivityMetrics = {
  /** Distinct grade-years of involvement (longevity). */
  longevityYears: number;
  /** Estimated hours contributed per year (h/wk × wk/yr). */
  hoursPerYear: number;
  /** Averaged weekly hours across the year (hoursPerYear / 52). */
  weeklyHoursAveraged: number;
  hasLeadership: boolean;
  hasDescription: boolean;
};

export function activityMetrics(a: ActivityInput): ActivityMetrics {
  const hpw = a.hoursPerWeek ?? 0;
  const wpy = a.weeksPerYear ?? 0;
  const hoursPerYear = hpw * wpy;
  return {
    longevityYears: a.grades?.length ?? 0,
    hoursPerYear,
    weeklyHoursAveraged: hoursPerYear / 52,
    hasLeadership: !!a.leadershipRole?.trim(),
    hasDescription: !!a.description?.trim(),
  };
}

export type PortfolioMetrics = {
  count: number;
  /** Sum of averaged weekly hours across all activities. */
  totalWeeklyHours: number;
  withLeadership: number;
  multiYear: number;
  categories: string[];
};

export function portfolioMetrics(
  activities: ActivityInput[],
): PortfolioMetrics {
  let totalWeeklyHours = 0;
  let withLeadership = 0;
  let multiYear = 0;
  const categories = new Set<string>();

  for (const a of activities) {
    const m = activityMetrics(a);
    totalWeeklyHours += m.weeklyHoursAveraged;
    if (m.hasLeadership) withLeadership += 1;
    if (m.longevityYears >= 3) multiYear += 1;
    if (a.category) categories.add(a.category);
  }

  return {
    count: activities.length,
    totalWeeklyHours: Math.round(totalWeeklyHours),
    withLeadership,
    multiYear,
    categories: [...categories],
  };
}
