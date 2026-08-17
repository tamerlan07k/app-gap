// Deterministic time-to-application logic for the Activities workspace.
//
// This is intentionally NOT the AI's job: whether a student is early, mid, or
// near their applications is a function of grade level and the calendar, and it
// gates what kind of recommendations are realistic. The AI is TOLD the computed
// stage/posture and must respect it — it never re-derives the timeline itself.
//
// U.S. application timing assumption: the earliest binding/early deadlines fall
// around November 1 of the fall the student enters 12th grade, so a rising
// senior's applications open the summer before senior year.

export type TimelineBand = "early" | "mid" | "near" | "post";

export type Timeline = {
  band: TimelineBand;
  /** Human label for the student's current stage (e.g. "Sophomore"). */
  stage: string;
  /** Rough months until applications open — an estimate, shown as such. */
  monthsToApplication: number | null;
  /** What activity strategy the timeline calls for — drives the AI + UI copy. */
  posture: string;
};

function parseGrade(gradeLevel: string): number | null {
  if (gradeLevel === "gap") return 13;
  const g = Number.parseInt(gradeLevel, 10);
  return Number.isNaN(g) ? null : g;
}

// Approximate months from now until ~Nov 1 of the student's senior-year fall.
// month is 0-indexed (0 = January), matching Date.getMonth().
function estimateMonthsToApplication(
  grade: number,
  month: number,
): number | null {
  if (grade >= 13) return 0; // gap year / post-grad — applying now
  // Years of school left before the fall of senior year (grade 12).
  const yearsToSeniorFall = Math.max(0, 12 - grade);
  // Months from the current month to November (month index 10).
  const monthsToNov = (10 - month + 12) % 12;
  const total = yearsToSeniorFall * 12 + monthsToNov;
  return total;
}

export function computeTimeline(gradeLevel: string, now: Date): Timeline {
  const grade = parseGrade(gradeLevel);
  const month = now.getMonth();

  if (grade == null) {
    return {
      band: "mid",
      stage: "Timeline not set",
      monthsToApplication: null,
      posture:
        "Add your grade level in your profile so recommendations can match your application timeline.",
    };
  }

  const monthsToApplication = estimateMonthsToApplication(grade, month);

  if (grade >= 13) {
    return {
      band: "post",
      stage: "Graduated / Gap year",
      monthsToApplication: 0,
      posture:
        "You're applying now or already have — focus on completing and clearly presenting the work you've genuinely done rather than starting new long-term commitments.",
    };
  }

  if (grade === 12) {
    return {
      band: "near",
      stage: "12th grade (Senior)",
      monthsToApplication,
      posture:
        "You're close to applications. Don't start a pile of brand-new activities — deepen your strongest existing one, finish something with a concrete outcome, and identify what can legitimately continue through the application period as ongoing.",
    };
  }

  if (grade === 11) {
    return {
      band: "mid",
      stage: "11th grade (Junior)",
      monthsToApplication,
      posture:
        "You have meaningful time but a real deadline. Prioritize deepening strong existing activities into leadership or tangible outcomes, and add at most a couple of things that can realistically produce results before applications.",
    };
  }

  // Grades 9 and 10.
  return {
    band: "early",
    stage: grade === 9 ? "9th grade (Freshman)" : "10th grade (Sophomore)",
    monthsToApplication,
    posture:
      "You have years before applications — that's an advantage, not a gap. Prioritize exploration, skill-building, and starting things that can grow over multiple years into something substantial with room for leadership later.",
  };
}

/** Short qualitative phrase for how much time remains — never a false precision. */
export function timeRemainingLabel(timeline: Timeline): string {
  const m = timeline.monthsToApplication;
  if (m == null) return "Timeline unknown";
  if (m <= 0) return "Applying now";
  if (m < 12) return `~${m} month${m === 1 ? "" : "s"} to applications`;
  const years = Math.round((m / 12) * 10) / 10;
  return `~${years} year${years === 1 ? "" : "s"} to applications`;
}
