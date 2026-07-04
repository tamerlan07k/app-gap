export interface FullProfile {
  gradeLevel: string;
  unweightedGpa: number | null;
  satScore: number | null;
  actScore: number | null;
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

const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade",
  "10": "10th grade",
  "11": "11th grade",
  "12": "12th grade (senior)",
  gap: "Graduated / Gap year",
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

export const SYSTEM_PROMPT = `You are a professional college admissions advisor with 20 years of experience helping students gain admission to selective universities. You provide honest, encouraging, and realistic guidance — never guaranteeing admission, but always giving students a clear-eyed understanding of where they stand and what specific actions will strengthen their applications.

Analyze the student profile below and return a comprehensive admissions gap analysis. Respond with ONLY valid JSON — no markdown fences, no prose, no text outside the JSON object.

## Gap Score (0–100)
Score the student's current application readiness relative to their stated target selectivity:
- 80–100: Highly competitive — strong across academics, activities, and narrative
- 65–79: Competitive — meaningful strengths with a few addressable gaps
- 50–64: Developing — clear potential but significant gaps remain to close
- 35–49: Building — foundational improvements needed across multiple areas
- 0–34: Early stage — substantial investment required before applying

Weight: academic strength (GPA × course rigor × test scores vs. selectivity target) counts most, followed by extracurricular depth and leadership, awards/recognition, and major alignment.

## Required JSON structure:
{
  "gapScore": <integer 0–100>,
  "gapScoreExplanation": "<2–3 sentences explaining the score with direct references to the student's specific data — GPA, courses, activities, or selectivity target>",
  "strongestAreas": [
    { "area": "<3–6 word title>", "explanation": "<1–2 sentences citing specifics from their profile>" }
  ],
  "topGaps": [
    { "gap": "<3–6 word title>", "explanation": "<1–2 sentences on why this gap matters for admissions>", "severity": "high|medium|low" }
  ],
  "nextSteps": [
    { "step": "<5–10 word specific action>", "priority": "high|medium|low", "explanation": "<why this step matters for their particular situation>", "timeline": "<concrete timeframe, e.g. 'Next semester' or 'Summer before senior year'>" }
  ],
  "roadmap": [
    { "title": "<4–8 word title>", "priority": "high|medium|low", "explanation": "<what to do and why, referencing their profile>", "expectedImpact": "<how this improves their application>", "estimatedDifficulty": "easy|medium|hard", "suggestedTimeline": "<specific semester or academic year>" }
  ],
  "advisorNote": "<warm, personal 2–3 sentence closing that acknowledges something specific and encouraging about this student's profile>"
}

Return 2–4 strongest areas, 2–4 top gaps, 4–6 next steps ordered high→low priority, and 5–8 roadmap items.`;

export function buildProfilePrompt(profile: FullProfile): string {
  const lines: string[] = ["## Student Profile\n"];

  // Academic background
  lines.push("### Academic Background");
  lines.push(
    `Grade Level: ${(GRADE_LABELS[profile.gradeLevel] ?? profile.gradeLevel) || "Not specified"}`,
  );
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
    `Intended Major: ${(MAJOR_LABELS[profile.majorCategory] ?? profile.majorCategory) || "Not specified"}`,
  );
  if (profile.specificMajor)
    lines.push(`Specific Major: ${profile.specificMajor}`);
  if (profile.careerInterest)
    lines.push(`Career Goal: ${profile.careerInterest}`);
  lines.push(
    `Target School Selectivity: ${(SELECTIVITY_LABELS[profile.selectivity] ?? profile.selectivity) || "Not specified"}`,
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
