import { SUBJECT_AREA_LABELS } from "~/lib/coursework/catalog";
import type { CourseworkProfile } from "~/lib/coursework/types";
import { GRADE_LABELS, MAJOR_LABELS } from "~/lib/profile-labels";
import type { FullProfile } from "./prompt";

// The Coursework workspace prompt. Like analyze-activities, it front-loads
// DETERMINISTIC, pre-computed signals (classification, rigor, and the five-state
// findings the engine already decided) so the model INTERPRETS rather than
// re-derives — and, critically, so it cannot quietly turn an "unavailable" or
// "unknown" item into a gap. The engine owns the classification; the model owns
// the prose.

export const COURSEWORK_SYSTEM_PROMPT = `You are AppGap's academic-path analyst — an experienced college counselor who interprets what a student's high-school coursework COMMUNICATES. You are an ANALYSIS engine, not a course recommender and not an admissions-odds calculator.

## Your job
Given a student's classified courses, a deterministic rigor profile, and a set of pre-classified findings, explain:
1. What the academic path communicates about the student (ambition, rigor, intellectual breadth, depth/specialization, consistency, and challenge RELATIVE TO the opportunities they had).
2. How the rigor reads (trajectory across grades, quantitative/STEM/humanities preparation).
3. How well the coursework prepares them for their intended field, in GENERAL terms.
4. A short, honest bottom line.

## Hard rules — read carefully
- **Interpret, do not re-classify.** The findings you are given already carry a status: strength, opportunity, developing, potential-gap, unavailable, or unknown. NEVER contradict a status. In particular: an "unavailable" course (the school does not offer it) or an "unknown" one (availability unclear) must NEVER be described as a gap, weakness, or deficiency — frame these as context or, at most, an option to explore if it becomes available.
- **Never penalize missing access.** If a course was not available to the student, that is not a shortcoming of the student. Say so plainly.
- **Distinguish** an actual weakness from a missed opportunity from an unavailable course from something simply not relevant to the field. This distinction is the whole point.
- **No admissions requirements.** NEVER claim a specific college, school, program, or track "requires", "expects", or "prefers" any course. You have no verified requirement data. Speak only in general field patterns ("programs in this field often build on…").
- **No numbers.** No scores, no percentages, no "+X points", no admission probabilities or guarantees.
- **No invented facts.** Use only the courses and signals provided. Do not assume courses, grades, or a school's offerings beyond what is given.
- **Interpretation, not certainty.** Phrase inferences as what a reader might reasonably infer, not as what any officer will definitely think.
- Speak directly to the student ("your coursework…"), clearly, at a level a high-schooler understands. Be encouraging and honest at once.

Respond with ONLY valid JSON — no markdown fences, no prose outside the JSON object.

## Required JSON structure:
{
  "academicPath": {
    "headline": "<one line: what this transcript communicates as a whole>",
    "summary": "<2–4 sentences interpreting what the coursework says about the student, grounded only in the given courses>",
    "communicates": ["<short inference, e.g. 'A strong quantitative trajectory'>"]
  },
  "rigorInterpretation": "<prose reading of the rigor profile: trajectory, depth, and quantitative/STEM/humanities preparation>",
  "majorPreparationSummary": "<how the coursework prepares them for their intended field, in general terms — no college-specific requirements>",
  "findingNotes": [
    { "key": "<exact finding key from the list>", "note": "<short, student-friendly enrichment that respects the finding's status>" }
  ],
  "bottomLine": "<short, honest closing read — opportunities and context, never a verdict>"
}

Return a findingNote only for findings worth enriching (aim for the most meaningful ones); always use the exact keys provided.`;

function courseLine(c: CourseworkProfile["classified"][number]): string {
  const subject = SUBJECT_AREA_LABELS[c.subjectArea];
  const bits = [`- "${c.name}" — ${c.level.toUpperCase()}, ${subject}`];
  if (c.gradeLevel) bits.push(`grade ${c.gradeLevel}`);
  if (c.status !== "unknown") bits.push(c.status);
  if (c.apExamScore && /^[1-5]$/.test(c.apExamScore))
    bits.push(`AP exam ${c.apExamScore}`);
  return bits.join("; ");
}

export function buildCourseworkPrompt(
  profile: FullProfile,
  cw: CourseworkProfile,
): string {
  const lines: string[] = [];

  lines.push("## Student");
  lines.push(
    `Grade: ${GRADE_LABELS[profile.gradeLevel] ?? (profile.gradeLevel || "Not specified")}`,
  );
  lines.push(
    `Intended field: ${MAJOR_LABELS[profile.majorCategory] ?? (profile.majorCategory || "Undecided")}`,
  );
  if (profile.specificMajor)
    lines.push(`Specific major: ${profile.specificMajor}`);
  if (cw.target.hasTarget) {
    const name = cw.target.collegeName
      ? `${cw.target.collegeName}${cw.target.programLabel ? `, ${cw.target.programLabel}` : ""}`
      : "a saved college";
    lines.push(`\n## Target (use ONLY the verified facts below)`);
    lines.push(`Target: ${name}.`);
    if (cw.target.fieldStrength) {
      // Verified field strength — a real, citable signal (NOT a requirement).
      lines.push(
        `VERIFIED field strength: this college is rated "${cw.target.fieldStrength.rating}" in the student's field${cw.target.fieldStrength.headline ? ` — ${cw.target.fieldStrength.headline}` : ""}. You MAY reference this as the college's strength in the field; it is NOT a coursework requirement.`,
      );
    }
    if (cw.target.verifiedExpectations.length > 0) {
      lines.push(
        "VERIFIED requirements for this exact target (you MAY cite these, and ONLY these):",
      );
      for (const e of cw.target.verifiedExpectations) {
        lines.push(
          `- ${e.label} (${e.requirementType}, scope: ${e.scope}, subject: ${e.subjectArea})`,
        );
      }
    } else {
      lines.push(
        "No verified coursework requirements are on file for this exact target. Do NOT state or imply any specific requirement — keep major-preparation framed as general field patterns.",
      );
    }
  }

  lines.push("\n## Classified courses (pre-computed — use as ground truth)");
  if (cw.classified.length === 0) {
    lines.push(
      "No courses recorded yet. Keep the interpretation encouraging and light; focus on what recording their coursework will reveal, and do not invent courses.",
    );
  } else {
    for (const c of cw.classified) lines.push(courseLine(c));
  }

  lines.push(
    "\n## Rigor profile (deterministic — interpret, do not recompute)",
  );
  const r = cw.rigor;
  lines.push(
    `Total courses: ${r.totalCourses}; advanced (AP/IB/dual): ${r.advancedCount} (AP ${r.apCount}, IB ${r.ibCount}, dual ${r.dualEnrollmentCount}); honors: ${r.honorsCount}`,
  );
  lines.push(`Trajectory across grades: ${r.trajectory}`);
  lines.push(
    `Quantitative preparation: ${r.quantitativePrep}; STEM: ${r.stemPrep}; humanities: ${r.humanitiesPrep}; overall challenge: ${r.overallChallenge}`,
  );

  lines.push(
    "\n## Findings (pre-classified — interpret each; NEVER change a status)",
  );
  lines.push(
    "Status legend: strength = well-prepared; opportunity = available but not taken (an option, not a fault); developing = present but could go further; potential-gap = an absent, widely-available foundation for the field; unavailable = the school does not offer it (NOT a gap); unknown = availability unclear (context, NOT a gap).",
  );
  for (const f of cw.findings) {
    lines.push(
      `- key: ${f.key} | status: ${f.status} | area: ${f.title} (${f.importance}) | ${f.detail}`,
    );
  }

  lines.push(
    "\n---\nWrite the interpretation. Respect every finding's status exactly — especially never describing an unavailable or unknown item as a gap. Speak to the student. Respond with the JSON object only.",
  );

  return lines.join("\n");
}
