// Grade-aware "Next Deadline" foundation.
//
// Deadlines depend on the student's grade level so a freshman never sees senior
// college-application deadlines. This is intentionally a code-driven baseline;
// once My Colleges + the Workplace exist, deadlines will also derive from the
// student's specific colleges, application plan (ED/EA/RD), and roadmap tasks.

export type Deadline = {
  title: string;
  /** Short timeframe label, e.g. "November 1" or "This year". */
  timeframe: string;
  description: string;
};

/**
 * The next grade-appropriate milestone. `now` is injected so callers control the
 * clock (and it stays testable). Seniors get real application-cycle deadlines;
 * earlier grades get preparation milestones — never generic senior deadlines.
 */
export function getNextDeadline(
  gradeLevel: string | null | undefined,
  now: Date,
): Deadline {
  const grade =
    gradeLevel === "gap" ? 13 : Number.parseInt(gradeLevel ?? "", 10);
  const month = now.getMonth(); // 0 = January

  if (grade === 12) {
    if (month >= 7 && month <= 9) {
      return {
        title: "Early Decision / Early Action",
        timeframe: "November 1",
        description:
          "Most ED/EA applications are due around Nov 1. Finalize your essays and get your early applications in.",
      };
    }
    if (month === 10) {
      return {
        title: "Early deadlines are here",
        timeframe: "This month",
        description:
          "ED/EA deadlines land in early November — submit your early applications now.",
      };
    }
    if (month === 11 || month === 0) {
      return {
        title: "Regular Decision",
        timeframe: "January 1",
        description:
          "Most Regular Decision applications are due around Jan 1. Complete your remaining schools and supplements.",
      };
    }
    return {
      title: "Finish & submit applications",
      timeframe: "This spring",
      description:
        "Wrap up any remaining applications, supplements, and financial-aid forms.",
    };
  }

  if (grade === 11) {
    if (month >= 4 && month <= 7) {
      return {
        title: "Summer: research, internships & testing",
        timeframe: "This summer",
        description:
          "The summer before senior year is pivotal — pursue a standout activity and prep for the SAT/ACT.",
      };
    }
    return {
      title: "Build your college list & test plan",
      timeframe: "This year",
      description:
        "Junior year: take the SAT/ACT, deepen your top activities, and start researching colleges.",
    };
  }

  if (grade === 10) {
    return {
      title: "Deepen your top activities",
      timeframe: "This year",
      description:
        "Sophomore year: commit to a few activities you genuinely care about and plan a rigorous junior schedule.",
    };
  }

  if (grade === 9) {
    return {
      title: "Explore and build foundations",
      timeframe: "This year",
      description:
        "Freshman year: explore activities, build strong study habits, and try things that genuinely interest you.",
    };
  }

  // Gap year / graduated / unknown.
  return {
    title: "Finalize your applications",
    timeframe: "This season",
    description:
      "Complete and submit your college applications and any remaining supplements.",
  };
}
