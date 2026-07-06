export interface FullProfile {
  gradeLevel: string;
  unweightedGpa: number | null;
  satScore: number | null;
  actScore: number | null;
  schoolType?: string | null;
  courses: Array<{
    name: string;
    type: string;
    status: string;
    gradeLevel: string;
    apExamScore: string;
  }>;
  majorCategory: string;
  specificMajor: string;
  careerInterest: string;
  selectivity: string;
  activities: Array<{
    name: string;
    category: string;
    grades: string[];
    leadershipRole: string;
    description: string;
    hoursPerWeek: number | null;
    weeksPerYear: number | null;
    meaningfulness: number | null;
  }>;
  awards: Array<{
    name: string;
    level: string;
    grade: string;
  }>;
}

// ─── Label maps ───────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade (Freshman)",
  "10": "10th grade (Sophomore)",
  "11": "11th grade (Junior)",
  "12": "12th grade (Senior)",
  gap: "Graduated / Gap year",
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
  cs: "Computer Science / Software / Data",
  engineering: "Engineering",
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
    "Highly selective (top 10–20 universities, e.g. Ivies, MIT, Stanford)",
  competitive: "Competitive target schools (top 30–50 universities)",
  balanced: "Balanced mix of reach, target, and safety schools",
  safer: "Mostly safer / likely schools",
  unsure: "Unsure about target school selectivity",
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  ap: "AP",
  honors: "Honors",
  ib: "IB",
  "dual-enrollment": "Dual Enrollment / College Course",
  other: "Regular",
};

const CATEGORY_LABELS: Record<string, string> = {
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

// ─── Timeline helpers (server-side only) ─────────────────────────────────────

function getTimelineStage(gradeLevel: string, month: number): string {
  const grade = gradeLevel === "gap" ? 13 : parseInt(gradeLevel, 10);
  if (grade === 12) {
    if (month >= 5 && month <= 7)
      return "Rising Senior — summer before applications open";
    if (month >= 8 && month <= 10)
      return "Applications Open — early deadlines approaching";
    if (month === 11 || month === 0)
      return "Regular Decision Crunch — final weeks before most deadlines";
    return "Post-Application — awaiting decisions";
  }
  if (grade === 11) {
    if (month >= 5 && month <= 7)
      return "Rising Senior (next year) — critical pre-application summer";
    return "Junior — building the application foundation";
  }
  if (grade === 10)
    return month >= 5 && month <= 7
      ? "Rising Junior — summer before junior year"
      : "Sophomore — building academics and extracurriculars";
  if (grade === 9)
    return month >= 5 && month <= 7
      ? "Rising Sophomore — summer after freshman year"
      : "Freshman — early exploration and foundation";
  return "Gap Year / Post-Graduate";
}

// ─── Pre-computed intelligence signals ───────────────────────────────────────

function computeScoreSignal(profile: FullProfile): string {
  const { satScore: sat, actScore: act, selectivity } = profile;
  if (!sat && !act)
    return "No test scores — advise on test-optional strategy or whether testing is worthwhile.";

  const parts: string[] = [];
  if (sat && selectivity && SAT_BENCHMARKS[selectivity]) {
    const b = SAT_BENCHMARKS[selectivity];
    const gap = b.median - sat;
    if (gap > 150)
      parts.push(
        `SAT ${sat} is ${gap} pts below the ~${b.median} median (${b.range}) — MAJOR GAP, retake strongly warranted`,
      );
    else if (gap > 50)
      parts.push(
        `SAT ${sat} is ${gap} pts below the ~${b.median} median — retake may be worthwhile`,
      );
    else if (gap > 0)
      parts.push(`SAT ${sat} is slightly below ~${b.median} median`);
    else parts.push(`SAT ${sat} meets or exceeds ~${b.median} median`);
  }
  if (act && selectivity && ACT_BENCHMARKS[selectivity]) {
    const b = ACT_BENCHMARKS[selectivity];
    const gap = b.median - act;
    if (gap > 4)
      parts.push(
        `ACT ${act} is ${gap} pts below ~${b.median} median (${b.range}) — MAJOR GAP`,
      );
    else if (gap > 1)
      parts.push(
        `ACT ${act} is below ~${b.median} median — retake may be worthwhile`,
      );
    else if (gap > 0) parts.push(`ACT ${act} is slightly below ~${b.median}`);
    else parts.push(`ACT ${act} meets or exceeds ~${b.median} median`);
  }
  return parts.join(" | ");
}

function computeActivitySignal(profile: FullProfile): string {
  const { activities } = profile;
  if (!activities.length)
    return "No activities recorded — critical gap regardless of grade.";

  const weeklyHours = activities.reduce((sum, a) => {
    return sum + ((a.hoursPerWeek ?? 0) * (a.weeksPerYear ?? 0)) / 52;
  }, 0);
  const withLeadership = activities.filter(
    (a) => a.leadershipRole?.trim().length,
  ).length;
  const multiYear = activities.filter((a) => a.grades.length >= 3).length;
  const spike = activities.filter(
    (a) =>
      (a.meaningfulness ?? 0) >= 4 &&
      a.leadershipRole?.trim().length &&
      a.grades.length >= 2,
  ).length;
  const hasResearch = activities.some((a) => a.category === "research");
  const hasInternship = activities.some((a) => a.category === "internship");
  const hasCompetition = activities.some((a) => a.category === "competitions");

  return [
    `${activities.length} activities (~${Math.round(weeklyHours)}h/week avg)`,
    `${withLeadership}/${activities.length} have leadership roles`,
    multiYear > 0
      ? `${multiYear} show multi-year depth (3+ grades)`
      : "NONE show multi-year depth",
    spike > 0 ? `${spike} spike candidate(s)` : "No clear spike activity",
    hasResearch ? "Has research" : "No research",
    hasInternship ? "Has internship" : "No internship",
    hasCompetition ? "Has competition experience" : "No competitions",
  ].join(" | ");
}

function computeRigorSignal(profile: FullProfile): string {
  const advanced = profile.courses.filter((c) =>
    ["ap", "ib", "dual-enrollment"].includes(c.type),
  );
  const completed = advanced.filter((c) => c.status === "completed").length;
  const current = advanced.filter((c) => c.status === "current").length;
  const planned = advanced.filter((c) => c.status === "planned").length;
  const strongAp = profile.courses.filter(
    (c) =>
      c.type === "ap" &&
      c.status === "completed" &&
      c.apExamScore &&
      !["not-taken", "not-reporting"].includes(c.apExamScore) &&
      parseInt(c.apExamScore, 10) >= 4,
  ).length;

  let context = "";
  const st = profile.schoolType;
  if (st === "early-college")
    context =
      " ⚠️ EARLY COLLEGE HS: college credit courses ARE advanced rigor — do NOT penalize for fewer APs";
  else if (st === "homeschool")
    context =
      " ⚠️ HOMESCHOOL: evaluate via dual enrollment, competitions, and projects — not AP count";
  else if (st === "magnet-stem")
    context =
      " ⚠️ MAGNET/STEM: specialized curriculum limits AP breadth — evaluate technical depth instead";

  return (
    `${advanced.length} advanced courses (${completed} completed, ${current} current, ${planned} planned)` +
    (strongAp > 0 ? `; ${strongAp} AP score(s) ≥4` : "") +
    context
  );
}

// ─── System prompt ────────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are AppGap's senior admissions strategist — a 20-year veteran consultant who has helped students gain admission to every tier of selective school. You think in interactions, not checklists.

## Core rules

**Interactions over checklists.** A 3.9 GPA at a public school vs. a magnet STEM school means different things. A low SAT matters far less for a test-optional senior. 600 hours of community service with zero leadership is weaker than 80 hours with a founder title. Always analyze how factors combine.

**No generic advice.** Never write "join more clubs," "improve your GPA," or "work on your essays." Instead: name the specific type of club and why it fits their major/narrative, name the specific courses to raise GPA in, name the essay angle based on their stated career interest and activity spike.

**School context awareness.** Early College HS students earn college credits as primary advanced coursework — never penalize for fewer APs. Homeschool students: evaluate via dual enrollment, competitions, portfolio. Magnet/STEM: limited elective bandwidth is expected. Adjust your assessment — the profile will flag this explicitly.

**Timeline-gated recommendations.** A rising senior in July needs essay drafts, college list finalization, and recommendation letters. A sophomore needs extracurricular depth and junior-year course planning. If a student cannot act on advice in the next 6 months, deprioritize it. The profile includes the current date and admissions stage — use them.

**Be honest.** If this student has a significant gap relative to their stated selectivity, say so clearly in gapScoreExplanation and topGaps. Then explain the path forward in nextSteps and roadmap. Vague encouragement wastes their time.

**Priority in nextSteps and roadmap must reflect actual urgency** — not just importance in general, but importance right now for this student's grade level and timeline stage. A senior in the application window should have all high-priority steps be executable this semester.

Respond with ONLY valid JSON — no markdown fences, no prose, no text outside the JSON object.

## Gap Score (0–100)
Score the student's application readiness relative to their stated target selectivity:
- 80–100: Highly competitive — strong across academics, activities, and narrative
- 65–79: Competitive — meaningful strengths with a few addressable gaps
- 50–64: Developing — clear potential but significant gaps remain
- 35–49: Building — foundational improvements needed across multiple areas
- 0–34: Early stage — substantial investment required before applying

Weight: academic strength (GPA × course rigor × test scores vs. selectivity target) counts most, followed by extracurricular depth and leadership, awards/recognition, and major alignment.

## Required JSON structure:
{
  "gapScore": <integer 0–100>,
  "gapScoreExplanation": "<2–3 sentences citing this student's specific GPA, test scores, activities, and selectivity target — not generic>",
  "strongestAreas": [
    { "area": "<3–6 word title>", "explanation": "<1–2 sentences citing specifics from their profile>" }
  ],
  "topGaps": [
    { "gap": "<3–6 word title>", "explanation": "<1–2 sentences on why this gap matters for admissions, referencing their data>", "severity": "high|medium|low" }
  ],
  "nextSteps": [
    { "step": "<5–10 word specific action — not generic>", "priority": "high|medium|low", "explanation": "<why this step matters for their particular situation, given their grade level and timeline>", "timeline": "<concrete timeframe tied to admissions calendar, e.g. 'Before August 1' or 'This semester'>" }
  ],
  "roadmap": [
    { "title": "<4–8 word specific title>", "priority": "high|medium|low", "explanation": "<what to do and why, referencing their profile — no generic advice>", "expectedImpact": "<how this specifically improves their application for their target schools>", "estimatedDifficulty": "easy|medium|hard", "suggestedTimeline": "<specific semester or timeframe relative to application cycle>" }
  ],
  "advisorNote": "<warm, personal 2–3 sentence closing that acknowledges something specific and genuinely encouraging about this student's profile — reference a real strength>"
}

Return 2–4 strongest areas, 2–4 top gaps, 4–6 next steps ordered high→low priority, and 5–8 roadmap items.`;

// ─── Prompt builder ───────────────────────────────────────────────────────────

export function buildProfilePrompt(profile: FullProfile): string {
  const lines: string[] = [];

  // Current date context (server-side)
  const now = new Date();
  const monthName = [
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
  ][now.getMonth()];
  const timelineStage = getTimelineStage(profile.gradeLevel, now.getMonth());
  const isAppSeason =
    profile.gradeLevel === "12" && now.getMonth() >= 8 && now.getMonth() <= 11;

  lines.push("## Current Date Context");
  lines.push(`Date: ${monthName} ${now.getFullYear()}`);
  lines.push(`Student Timeline Stage: ${timelineStage}`);
  lines.push(
    `Application Season: ${isAppSeason ? "ACTIVE — applications are open right now" : "Not yet open for this student"}`,
  );

  // Pre-computed intelligence signals
  lines.push("\n## Admissions Intelligence Signals");
  lines.push(`(Pre-analyzed for you — use directly, do not re-derive)`);
  lines.push(`Score Gap: ${computeScoreSignal(profile)}`);
  lines.push(`Activity Pattern: ${computeActivitySignal(profile)}`);
  lines.push(`Academic Rigor: ${computeRigorSignal(profile)}`);

  // Academic background
  lines.push("\n## Student Profile");
  lines.push("### Academic Background");
  lines.push(
    `Grade Level: ${GRADE_LABELS[profile.gradeLevel] ?? (profile.gradeLevel || "Not specified")}`,
  );
  if (profile.schoolType) {
    lines.push(
      `High School Type: ${SCHOOL_TYPE_LABELS[profile.schoolType] ?? profile.schoolType}`,
    );
  }
  lines.push(
    `Unweighted GPA: ${profile.unweightedGpa != null ? `${profile.unweightedGpa} / 4.0` : "Not provided"}`,
  );
  lines.push(
    `SAT Score: ${profile.satScore != null ? String(profile.satScore) : "Not provided"}`,
  );
  lines.push(
    `ACT Score: ${profile.actScore != null ? String(profile.actScore) : "Not provided"}`,
  );

  // Coursework
  if (profile.courses.length > 0) {
    lines.push(`\n### Coursework (${profile.courses.length} courses)`);
    for (const c of profile.courses) {
      const type = COURSE_TYPE_LABELS[c.type] ?? c.type;
      const status = c.status.charAt(0).toUpperCase() + c.status.slice(1);
      const grade = c.gradeLevel ? `, Grade ${c.gradeLevel}` : "";
      const apScore =
        c.type === "ap" &&
        c.status === "completed" &&
        c.apExamScore &&
        !["not-taken", "not-reporting"].includes(c.apExamScore)
          ? `, AP Score: ${c.apExamScore}`
          : "";
      lines.push(`- ${c.name} (${type}${grade}, ${status}${apScore})`);
    }
  } else {
    lines.push("\n### Coursework\nNo courses added.");
  }

  // Career direction
  lines.push("\n### Career Direction");
  lines.push(
    `Intended Major: ${MAJOR_LABELS[profile.majorCategory] ?? (profile.majorCategory || "Not specified")}`,
  );
  if (profile.specificMajor)
    lines.push(`Specific Major: ${profile.specificMajor}`);
  if (profile.careerInterest)
    lines.push(`Career Goal: ${profile.careerInterest}`);
  lines.push(
    `Target School Selectivity: ${SELECTIVITY_LABELS[profile.selectivity] ?? (profile.selectivity || "Not specified")}`,
  );

  // Activities
  if (profile.activities.length > 0) {
    lines.push(
      `\n### Extracurricular Activities (${profile.activities.length})`,
    );
    for (const a of profile.activities) {
      const category = CATEGORY_LABELS[a.category] ?? a.category;
      const grades =
        a.grades.length > 0 ? `, Grades ${a.grades.join(", ")}` : "";
      const role = a.leadershipRole
        ? `\n  Leadership Role: ${a.leadershipRole}`
        : "";
      const desc = a.description ? `\n  Description: ${a.description}` : "";
      const time =
        a.hoursPerWeek != null
          ? `\n  Time Commitment: ${a.hoursPerWeek}h/week` +
            (a.weeksPerYear != null ? `, ${a.weeksPerYear} weeks/year` : "")
          : "";
      const meaning =
        a.meaningfulness != null
          ? `\n  Personal Significance: ${a.meaningfulness}/5`
          : "";
      lines.push(
        `- ${a.name} (${category}${grades})${role}${desc}${time}${meaning}`,
      );
    }
  } else {
    lines.push("\n### Extracurricular Activities\nNone added.");
  }

  // Awards
  if (profile.awards.length > 0) {
    lines.push(`\n### Awards & Honors (${profile.awards.length})`);
    for (const aw of profile.awards) {
      const level = AWARD_LEVEL_LABELS[aw.level] ?? aw.level;
      const grade = aw.grade ? `, Grade ${aw.grade}` : "";
      lines.push(`- ${aw.name} (${level}${grade})`);
    }
  } else {
    lines.push("\n### Awards & Honors\nNone listed.");
  }

  lines.push(
    "\n---\nAnalyze this profile and respond with the JSON gap analysis only.",
  );

  return lines.join("\n");
}
