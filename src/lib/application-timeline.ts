// Derives the student's application timeline context from their grade and the
// current server-side date. Never expose this to the client — call it only inside
// API routes or server components so the date is always authoritative.

export interface TimelineContext {
  currentMonth: string;
  currentYear: number;
  currentSeason: string;
  timelineStage: string;
  isApplicationSeasonOpen: boolean;
  monthsUntilEarlyDeadlines: number | null;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function season(month: number): string {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Fall";
  return "Winter";
}

// How many months from `from` until `to` (always positive, wraps over year boundary)
function monthsUntil(to: number, from: number): number {
  return to >= from ? to - from : 12 - from + to;
}

export function getApplicationTimeline(gradeLevel: string): TimelineContext {
  const now = new Date();
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  const grade = gradeLevel === "gap" ? 13 : parseInt(gradeLevel, 10);

  let timelineStage: string;
  let isApplicationSeasonOpen: boolean;
  let monthsUntilEarlyDeadlines: number | null = null;

  if (grade === 12) {
    if (month >= 5 && month <= 7) {
      // Jun–Aug: summer before senior year
      timelineStage =
        "Rising Senior — college applications have not yet opened";
      isApplicationSeasonOpen = false;
      monthsUntilEarlyDeadlines = monthsUntil(10, month); // November ED deadlines
    } else if (month >= 8 && month <= 10) {
      // Sep–Nov: apps open, early deadlines approaching
      timelineStage =
        "Applications Open — early decision and early action deadlines approaching";
      isApplicationSeasonOpen = true;
      monthsUntilEarlyDeadlines = Math.max(0, monthsUntil(10, month));
    } else if (month === 11 || month === 0) {
      // Dec–Jan: regular decision crunch
      timelineStage =
        "Regular Decision Crunch — final weeks before most deadlines";
      isApplicationSeasonOpen = true;
      monthsUntilEarlyDeadlines = 0;
    } else {
      // Feb–May: awaiting decisions
      timelineStage =
        "Post-Application — decisions arriving, considering options";
      isApplicationSeasonOpen = false;
    }
  } else if (grade === 11) {
    if (month >= 5 && month <= 7) {
      // Summer after junior year — critical prep window
      timelineStage =
        "Rising Senior (Next Year) — critical summer before senior application year";
      isApplicationSeasonOpen = false;
    } else {
      timelineStage = "Junior — one full year before applications open";
      isApplicationSeasonOpen = false;
    }
  } else if (grade === 10) {
    timelineStage =
      month >= 5 && month <= 7
        ? "Rising Junior — summer before junior year"
        : "Sophomore — building academic and extracurricular foundation";
    isApplicationSeasonOpen = false;
  } else if (grade === 9) {
    timelineStage =
      month >= 5 && month <= 7
        ? "Rising Sophomore — summer after freshman year"
        : "Freshman — early exploration and foundation building";
    isApplicationSeasonOpen = false;
  } else {
    // gap year or unknown
    timelineStage = "Gap Year / Post-Graduate";
    isApplicationSeasonOpen = month >= 8 && month <= 11;
  }

  return {
    currentMonth: MONTH_NAMES[month],
    currentYear: year,
    currentSeason: season(month),
    timelineStage,
    isApplicationSeasonOpen,
    monthsUntilEarlyDeadlines,
  };
}
