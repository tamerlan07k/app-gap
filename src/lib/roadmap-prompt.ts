// Builds the Claude prompt from a student's full profile + timeline context.
// To add a new profile field: extend FullProfile, then add one line in buildRoadmapPrompt.

import type { TimelineContext } from "~/lib/application-timeline";
import type {
  CareerDirection,
  HighSchoolInfo,
  Step1Data,
  Step3Data,
} from "~/lib/profile-storage";

export interface FullProfile {
  step1: Step1Data;
  schoolInfo: HighSchoolInfo | null;
  step2: CareerDirection;
  step3: Step3Data;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade (Freshman)",
  "10": "10th grade (Sophomore)",
  "11": "11th grade (Junior)",
  "12": "12th grade (Senior)",
  gap: "Gap year / post-graduate",
};

const SCHOOL_TYPE_LABELS: Record<string, string> = {
  public: "Public High School",
  private: "Private High School",
  "early-college": "Early College High School",
  "magnet-stem": "Magnet / STEM School",
  homeschool: "Homeschool",
  other: "Other",
};

const MAJOR_LABELS: Record<string, string> = {
  cs: "Computer Science / Software Engineering / Data Science",
  engineering: "Engineering (Mechanical, Electrical, Civil, etc.)",
  "bio-premed": "Biology / Pre-Med / Health Sciences",
  business: "Business / Finance / Economics",
  "math-physics": "Math / Physics / Statistics",
  polisci: "Political Science / International Relations",
  psych: "Psychology / Neuroscience",
  humanities: "English / History / Humanities",
  design: "Architecture / Design / Arts",
  education: "Education / Social Work / Public Policy",
  law: "Pre-Law / Legal Studies",
  undecided: "Undecided",
  other: "Other",
};

const SELECTIVITY_LABELS: Record<string, string> = {
  "highly-selective":
    "Highly selective schools (top 20, Ivies, MIT, Stanford, etc.)",
  competitive: "Competitive target schools (top 50–100)",
  balanced: "Balanced mix of reach, match, and safety",
  safer: "Mostly safer / likely schools",
  unsure: "Not sure yet",
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  ap: "AP",
  honors: "Honors",
  ib: "IB",
  "dual-enrollment": "Dual Enrollment / College Course",
  other: "Other",
};

const COURSE_STATUS_LABELS: Record<string, string> = {
  current: "Current",
  completed: "Completed",
  planned: "Planned",
};

const ACTIVITY_CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports / Athletics",
  clubs: "Clubs & Organizations",
  volunteering: "Community Service / Volunteering",
  research: "Research",
  internship: "Internship",
  work: "Work / Employment",
  "personal-project": "Personal Project",
  business: "Business / Startup",
  arts: "Arts & Performance",
  competitions: "Competitions & Olympiads",
  cultural: "Cultural / Religious",
  "student-gov": "Student Government",
  other: "Other",
};

const AWARD_LEVEL_LABELS: Record<string, string> = {
  school: "School level",
  regional: "Regional / District",
  "state-national": "State / National",
  international: "International",
};

const MEANINGFULNESS_LABELS: Record<number, string> = {
  1: "Did it to fill space",
  2: "Somewhat meaningful",
  3: "Meaningful",
  4: "Very meaningful",
  5: "Shaped who I am",
};

// ─── Score benchmarks by selectivity tier ────────────────────────────────────

const SAT_BENCHMARKS: Record<string, { median: number; range: string }> = {
  "highly-selective": { median: 1510, range: "1480–1580" },
  competitive: { median: 1380, range: "1300–1460" },
  balanced: { median: 1200, range: "1100–1320" },
  safer: { median: 1050, range: "950–1150" },
};

const ACT_BENCHMARKS: Record<string, { median: number; range: string }> = {
  "highly-selective": { median: 34, range: "33–36" },
  competitive: { median: 31, range: "29–33" },
  balanced: { median: 26, range: "23–28" },
  safer: { median: 22, range: "19–24" },
};

// ─── Computed signals ─────────────────────────────────────────────────────────

function computeScoreSignal(profile: FullProfile): string {
  const satRaw = profile.step1.info.satScore;
  const actRaw = profile.step1.info.actScore;
  const sat = satRaw ? parseInt(satRaw, 10) : null;
  const act = actRaw ? parseInt(actRaw, 10) : null;
  const selectivity = profile.step2.selectivity;

  if (!sat && !act) {
    return "No test scores provided — advise on test-optional strategy or whether testing is worthwhile given target schools.";
  }

  const parts: string[] = [];

  if (sat && selectivity && SAT_BENCHMARKS[selectivity]) {
    const bench = SAT_BENCHMARKS[selectivity];
    const gap = bench.median - sat;
    if (gap > 150) {
      parts.push(
        `SAT ${sat} is ${gap} points below the ~${bench.median} median (range ${bench.range}) for ${SELECTIVITY_LABELS[selectivity]} — MAJOR GAP, retake strongly warranted`,
      );
    } else if (gap > 50) {
      parts.push(
        `SAT ${sat} is ${gap} points below the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]} — retake may be worthwhile`,
      );
    } else if (gap > 0) {
      parts.push(
        `SAT ${sat} is slightly below the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]} — minor gap`,
      );
    } else {
      parts.push(
        `SAT ${sat} meets or exceeds the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]} — competitive`,
      );
    }
  }

  if (act && selectivity && ACT_BENCHMARKS[selectivity]) {
    const bench = ACT_BENCHMARKS[selectivity];
    const gap = bench.median - act;
    if (gap > 4) {
      parts.push(
        `ACT ${act} is ${gap} points below the ~${bench.median} median (range ${bench.range}) for ${SELECTIVITY_LABELS[selectivity]} — MAJOR GAP, retake strongly warranted`,
      );
    } else if (gap > 1) {
      parts.push(
        `ACT ${act} is below the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]} — retake may be worthwhile`,
      );
    } else if (gap > 0) {
      parts.push(
        `ACT ${act} is slightly below the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]}`,
      );
    } else {
      parts.push(
        `ACT ${act} meets or exceeds the ~${bench.median} median for ${SELECTIVITY_LABELS[selectivity]} — competitive`,
      );
    }
  }

  return parts.join(" | ");
}

function computeActivitySignal(profile: FullProfile): string {
  const activities = profile.step3.activities;
  if (activities.length === 0)
    return "No activities recorded — this is a critical gap regardless of grade level.";

  const totalWeeklyHours = activities.reduce((sum, a) => {
    const h = a.hoursPerWeek ? parseFloat(a.hoursPerWeek) : 0;
    const w = a.weeksPerYear ? parseFloat(a.weeksPerYear) : 0;
    return sum + (h * w) / 52;
  }, 0);

  const leadershipActivities = activities.filter(
    (a) => a.leadershipRole && a.leadershipRole.trim().length > 0,
  );
  const multiYearActivities = activities.filter(
    (a) => a.grades && a.grades.length >= 3,
  );
  const spikeCandidates = activities.filter(
    (a) =>
      a.meaningfulness != null &&
      a.meaningfulness >= 4 &&
      a.leadershipRole &&
      a.grades &&
      a.grades.length >= 2,
  );

  const categoryPresence = {
    research: activities.some((a) => a.category === "research"),
    internship: activities.some((a) => a.category === "internship"),
    work: activities.some((a) => a.category === "work"),
    competition: activities.some((a) => a.category === "competitions"),
    business: activities.some((a) => a.category === "business"),
    studentGov: activities.some((a) => a.category === "student-gov"),
  };

  const signals = [
    `${activities.length} activities (~${Math.round(totalWeeklyHours)}h/week avg)`,
    `${leadershipActivities.length}/${activities.length} have a named leadership role`,
    multiYearActivities.length > 0
      ? `${multiYearActivities.length} show multi-year commitment (3+ grades)`
      : "NONE show multi-year depth — no sustained commitment signal",
    spikeCandidates.length > 0
      ? `${spikeCandidates.length} potential spike activity(ies): high meaningfulness + leadership + multi-year`
      : "No clear spike activity identified",
    categoryPresence.research ? "Has research" : "No research",
    categoryPresence.internship ? "Has internship" : "No internship",
    categoryPresence.work ? "Has work experience" : "No work experience",
    categoryPresence.competition
      ? "Has competition experience"
      : "No competitions",
    categoryPresence.business ? "Has entrepreneurial/business activity" : "",
    categoryPresence.studentGov ? "Has student government" : "",
  ]
    .filter(Boolean)
    .join(" | ");

  return signals;
}

function computeRigorSignal(profile: FullProfile): string {
  const courses = profile.step1.courses;
  const schoolType = profile.schoolInfo?.schoolType;

  const advanced = courses.filter((c) =>
    ["ap", "ib", "dual-enrollment"].includes(c.type),
  );
  const completed = advanced.filter((c) => c.status === "completed");
  const current = advanced.filter((c) => c.status === "current");
  const planned = advanced.filter((c) => c.status === "planned");
  const strongApScores = courses.filter(
    (c) =>
      c.type === "ap" &&
      c.status === "completed" &&
      c.apExamScore &&
      parseInt(c.apExamScore, 10) >= 4,
  );

  let schoolContext = "";
  if (schoolType === "early-college") {
    schoolContext =
      " ⚠️ EARLY COLLEGE HS: College credit courses ARE the advanced rigor — do NOT penalize for fewer APs. Evaluate dual enrollment depth instead.";
  } else if (schoolType === "homeschool") {
    schoolContext =
      " ⚠️ HOMESCHOOL: Evaluate rigor through dual enrollment, competitions, certifications, and self-directed projects — not AP count.";
  } else if (schoolType === "magnet-stem") {
    schoolContext =
      " ⚠️ MAGNET/STEM: Specialized curriculum limits elective bandwidth. Strong technical coursework here signals rigor even without broad AP breadth.";
  } else if (schoolType === "private") {
    schoolContext =
      " NOTE: Private school context — evaluate rigor relative to what the school offers; transcript will be contextualized by school profile.";
  }

  return (
    `${advanced.length} advanced courses total (${completed.length} completed, ${current.length} current, ${planned.length} planned)` +
    (strongApScores.length > 0
      ? `; ${strongApScores.length} AP score(s) ≥4`
      : "") +
    schoolContext
  );
}

// ─── System prompt (passed as the `system` field to Claude) ──────────────────

export function buildSystemPrompt(): string {
  return `You are AppGap's senior admissions strategist — a 20-year veteran consultant who has guided students into every tier of selective school from Ivies to strong state universities. You think in interactions, not checklists.

## Non-negotiable rules

**Interactions over checklists.** A 3.9 GPA at a public school vs. a magnet STEM school means different things. A low SAT matters far less for a student applying test-optional senior fall. 600 hours of community service with zero leadership is weaker than 80 hours with a founder title. Always analyze how factors combine.

**Priority format.** Every recommendation must follow this exact format:
> 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW — [Specific action]
> Reason: [Why this matters for THIS student's specific data]
> Impact: High / Medium / Low | Effort: High / Medium / Low | Timeline: [e.g., "Complete by August 31"]

**No generic advice.** Never write "join more clubs," "improve your GPA," or "work on your essays." Instead specify: which type of club (and why it fits this major/narrative), what GPA target and which courses to take it in, which essay prompt strategy to use based on their stated career interest and activity spike.

**School context awareness.** Early College HS students earn college credits as their primary advanced coursework — never penalize them for fewer AP courses. Homeschool students are evaluated on dual enrollment, competitions, and portfolio. Magnet/STEM students have limited elective bandwidth. Private school transcripts are school-profiled by admissions readers. Adjust your assessment accordingly.

**Timeline-gated recommendations.** A rising senior in July needs: essay drafts, finalize college list, request recommendations, consider one last SAT. A sophomore needs: build extracurricular depth, target rigorous junior-year courses, identify summer programs. If a student cannot act on advice in the next 6 months given their grade, deprioritize or cut it entirely.

**Be honest.** If this student has a significant gap relative to their stated selectivity target, say so plainly in the Profile Snapshot. Then explain exactly what to do. Vague encouragement wastes their time.

**Output structure.** You must produce exactly 9 sections with these exact headers — no additions, no merges, no omissions:
1. PROFILE SNAPSHOT
2. STRENGTHS
3. CRITICAL GAPS
4. TIMELINE PRIORITIES
5. ACADEMIC ROADMAP
6. ACTIVITY ROADMAP
7. TEST SCORE STRATEGY
8. APPLICATION STRATEGY
9. 30 / 60 / 90 DAY ACTION PLAN`;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

export function buildRoadmapPrompt(
  profile: FullProfile,
  timeline: TimelineContext,
): string {
  const { step1, schoolInfo, step2, step3 } = profile;
  const { info, courses } = step1;
  const { activities, awards } = step3;

  const gradeLabel = GRADE_LABELS[info.gradeLevel] ?? info.gradeLevel;
  const schoolTypeLabel = schoolInfo?.schoolType
    ? (SCHOOL_TYPE_LABELS[schoolInfo.schoolType] ?? schoolInfo.schoolType)
    : "Not specified";
  const majorLabel = MAJOR_LABELS[step2.majorCategory] ?? step2.majorCategory;
  const selectivityLabel =
    SELECTIVITY_LABELS[step2.selectivity] ??
    step2.selectivity ??
    "Not specified";

  // ── Computed intelligence signals ──
  const scoreSignal = computeScoreSignal(profile);
  const activitySignal = computeActivitySignal(profile);
  const rigorSignal = computeRigorSignal(profile);

  // ── Timeline section ──
  const timelineSection = `## STUDENT TIMELINE

- **Current Date:** ${timeline.currentMonth} ${timeline.currentYear}
- **Season:** ${timeline.currentSeason}
- **Grade:** ${gradeLabel}
- **High School Type:** ${schoolTypeLabel}
- **Timeline Stage:** ${timeline.timelineStage}
- **Application Season:** ${
    timeline.isApplicationSeasonOpen
      ? "OPEN — applications are currently being submitted"
      : "Not yet open"
  }${
    timeline.monthsUntilEarlyDeadlines != null &&
    timeline.monthsUntilEarlyDeadlines > 0
      ? `\n- **Months Until Early Deadlines:** ~${timeline.monthsUntilEarlyDeadlines} months`
      : ""
  }`;

  // ── Academic section ──
  const coursesText =
    courses.length === 0
      ? "  No courses added."
      : courses
          .map((c) => {
            const type = COURSE_TYPE_LABELS[c.type] ?? c.type;
            const status = COURSE_STATUS_LABELS[c.status] ?? c.status;
            const grade = c.gradeLevel ? ` (Grade ${c.gradeLevel})` : "";
            const score =
              c.type === "ap" && c.status === "completed" && c.apExamScore
                ? ` — AP Score: ${c.apExamScore}`
                : "";
            return `  - ${c.name} | ${type}${grade} | ${status}${score}`;
          })
          .join("\n");

  const academicSection = `## ACADEMIC PROFILE

- **Unweighted GPA:** ${info.unweightedGpa ? `${info.unweightedGpa}/4.0` : "Not provided"}
- **SAT Score:** ${info.satScore || "Not taken / not provided"}
- **ACT Score:** ${info.actScore || "Not taken / not provided"}

### Coursework (${courses.length} course${courses.length !== 1 ? "s" : ""})
${coursesText}`;

  // ── Goals section ──
  const goalsSection = `## COLLEGE GOALS

- **Intended Major:** ${majorLabel}${step2.specificMajor ? `\n- **Specific Focus:** ${step2.specificMajor}` : ""}${step2.careerInterest ? `\n- **Career Goal:** ${step2.careerInterest}` : ""}
- **Target School Selectivity:** ${selectivityLabel}`;

  // ── Activities section ──
  const activitiesText =
    activities.length === 0
      ? "  No activities added."
      : activities
          .map((a) => {
            const category = ACTIVITY_CATEGORY_LABELS[a.category] ?? a.category;
            const grades =
              a.grades.length > 0 ? ` | Grades: ${a.grades.join(", ")}` : "";
            const leadership = a.leadershipRole
              ? ` | Role: ${a.leadershipRole}`
              : "";
            const time =
              a.hoursPerWeek && a.weeksPerYear
                ? ` | ${a.hoursPerWeek}h/week × ${a.weeksPerYear} weeks/year`
                : "";
            const meaning =
              a.meaningfulness != null
                ? ` | Meaningfulness: ${MEANINGFULNESS_LABELS[a.meaningfulness] ?? a.meaningfulness}/5`
                : "";
            const desc = a.description ? `\n    "${a.description}"` : "";
            return `  - **${a.name}** | ${category}${grades}${leadership}${time}${meaning}${desc}`;
          })
          .join("\n");

  const awardsText =
    awards.length === 0
      ? "  No awards added."
      : awards
          .map((a) => {
            const level = AWARD_LEVEL_LABELS[a.level] ?? a.level;
            const grade = a.grade ? ` | Grade ${a.grade}` : "";
            return `  - ${a.name} | ${level}${grade}`;
          })
          .join("\n");

  const activitiesSection = `## ACTIVITIES & IMPACT

### Activities (${activities.length})
${activitiesText}

### Awards & Honors (${awards.length})
${awardsText}`;

  // ── Pre-computed signals section ──
  const signalsSection = `## ADMISSIONS INTELLIGENCE SIGNALS
*(Pre-computed for your analysis — use these directly, do not re-derive)*

- **Score Gap:** ${scoreSignal}
- **Activity Pattern:** ${activitySignal}
- **Academic Rigor:** ${rigorSignal}`;

  // ── Instructions ──
  const instructions = `---

Generate this student's AppGap Roadmap now.

**Context:** It is ${timeline.currentMonth} ${timeline.currentYear}. This student is in ${gradeLabel} at the **${timeline.timelineStage}** stage. Every recommendation must be calibrated to this exact moment — what can they realistically act on before their next application deadline?

**Selectivity reality check:** Their target is ${selectivityLabel}. Use the score gap and rigor signals above to calibrate your honesty. Do not soften a significant gap — name it clearly in Section 1, then give them a concrete path in later sections.

Produce the roadmap now using the 9-section structure defined in your instructions. For each recommendation in Sections 4–8, apply the priority format (🔴/🟡/🟢, Reason, Impact, Effort, Timeline). Section 9 must list specific numbered tasks — no bullet points, no vague items.`;

  return [
    timelineSection,
    academicSection,
    goalsSection,
    activitiesSection,
    signalsSection,
    instructions,
  ].join("\n\n");
}
