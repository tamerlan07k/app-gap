// Career Path Assessment — a deterministic (no-AI) questionnaire that maps a
// student's interests, strengths, and preferences onto AppGap's existing
// academic-interests field taxonomy, producing a ranked, explained set of
// plausible majors/fields. It never claims to decide a student's future — it
// surfaces directions that fit their answers, which they can review and adjust.

import { ACADEMIC_AREAS, type FieldKey } from "~/lib/academic-interests";
import { MAJOR_LABELS } from "~/lib/profile-labels";

export type AssessmentOption = {
  key: string;
  label: string;
  /** Field weights this option contributes toward. */
  weights: Partial<Record<FieldKey, number>>;
};

export type AssessmentQuestion = {
  id: string;
  prompt: string;
  helper?: string;
  type: "single" | "multi";
  options: AssessmentOption[];
};

/** answers: questionId → selected option keys. */
export type AssessmentAnswers = Record<string, string[]>;

export type SuggestedField = {
  fieldKey: FieldKey;
  label: string;
  score: number;
  /** A few representative majors from the taxonomy for this field. */
  majors: string[];
  /** Which of the student's answers drove this suggestion. */
  rationale: string;
};

export type AssessmentResult = {
  topFields: SuggestedField[];
  /** True when the answers don't point anywhere clearly (stay undecided is fine). */
  undecided: boolean;
};

export const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "subjects",
    prompt: "Which subjects do you most enjoy?",
    helper: "Pick all that genuinely interest you.",
    type: "multi",
    options: [
      {
        key: "math",
        label: "Math",
        weights: { "math-physics": 3, cs: 1, engineering: 1 },
      },
      {
        key: "physics",
        label: "Physics / Chemistry",
        weights: { "math-physics": 2, engineering: 2 },
      },
      {
        key: "biology",
        label: "Biology / Health",
        weights: { "bio-premed": 3 },
      },
      {
        key: "cs",
        label: "Computers / Technology",
        weights: { cs: 3, engineering: 1 },
      },
      {
        key: "writing",
        label: "Writing / Literature",
        weights: { humanities: 3 },
      },
      {
        key: "history",
        label: "History / Government",
        weights: { polisci: 2, humanities: 1, law: 1 },
      },
      { key: "art", label: "Art / Design", weights: { design: 3 } },
      { key: "econ", label: "Business / Economics", weights: { business: 3 } },
      {
        key: "people",
        label: "Psychology / People",
        weights: { psych: 3, education: 1 },
      },
    ],
  },
  {
    id: "activities",
    prompt: "What kinds of activities draw you in?",
    type: "multi",
    options: [
      {
        key: "build",
        label: "Building or coding things",
        weights: { cs: 2, engineering: 2 },
      },
      {
        key: "research",
        label: "Lab or research work",
        weights: { "bio-premed": 2, "math-physics": 1 },
      },
      {
        key: "debate",
        label: "Debate, writing, or journalism",
        weights: { polisci: 2, humanities: 1, law: 1 },
      },
      {
        key: "help",
        label: "Helping or teaching people",
        weights: { education: 2, psych: 1, "bio-premed": 1 },
      },
      {
        key: "lead",
        label: "Leading or organizing",
        weights: { business: 2, polisci: 1 },
      },
      {
        key: "create",
        label: "Creating art, music, or media",
        weights: { design: 3 },
      },
      {
        key: "data",
        label: "Analyzing data or patterns",
        weights: { "math-physics": 2, cs: 1, business: 1 },
      },
      {
        key: "startup",
        label: "Starting a project or business",
        weights: { business: 3 },
      },
    ],
  },
  {
    id: "problems",
    prompt: "What kind of problems do you most like solving?",
    type: "single",
    options: [
      {
        key: "technical",
        label: "Technical & logical",
        weights: { cs: 2, engineering: 2, "math-physics": 1 },
      },
      {
        key: "human",
        label: "Human & social",
        weights: { psych: 2, polisci: 1, education: 1 },
      },
      {
        key: "creative",
        label: "Open-ended & creative",
        weights: { design: 2, humanities: 1 },
      },
      {
        key: "quant",
        label: "Analytical & quantitative",
        weights: { "math-physics": 2, business: 1, cs: 1 },
      },
      {
        key: "practical",
        label: "Hands-on & practical",
        weights: { engineering: 2, "bio-premed": 1 },
      },
    ],
  },
  {
    id: "strengths",
    prompt: "Which strengths do you most want to build?",
    type: "multi",
    options: [
      {
        key: "technical",
        label: "Technical skills",
        weights: { cs: 2, engineering: 1 },
      },
      {
        key: "communication",
        label: "Communication & writing",
        weights: { humanities: 2, polisci: 1, law: 1 },
      },
      {
        key: "leadership",
        label: "Leadership",
        weights: { business: 2, polisci: 1 },
      },
      {
        key: "creativity",
        label: "Creativity",
        weights: { design: 2, humanities: 1 },
      },
      {
        key: "research",
        label: "Research & analysis",
        weights: { "bio-premed": 1, "math-physics": 1, psych: 1 },
      },
      {
        key: "quant",
        label: "Quantitative reasoning",
        weights: { "math-physics": 2, business: 1, cs: 1 },
      },
    ],
  },
  {
    id: "environment",
    prompt: "Where can you picture yourself working?",
    type: "single",
    options: [
      {
        key: "lab",
        label: "A lab or research setting",
        weights: { "bio-premed": 2, "math-physics": 1 },
      },
      {
        key: "office",
        label: "An analytical / office role",
        weights: { business: 2, "math-physics": 1 },
      },
      {
        key: "studio",
        label: "A creative studio",
        weights: { design: 2, humanities: 1 },
      },
      {
        key: "people",
        label: "A people-facing role",
        weights: { psych: 1, education: 2, polisci: 1 },
      },
      {
        key: "startup",
        label: "A fast-moving startup",
        weights: { business: 2, cs: 1 },
      },
      {
        key: "field",
        label: "Hands-on / in the field",
        weights: { engineering: 2, "bio-premed": 1 },
      },
    ],
  },
  {
    id: "considered",
    prompt: "Have you already considered any of these directions?",
    helper: "Optional — pick any you've thought about.",
    type: "multi",
    options: [
      { key: "cs", label: "Computer Science / Software", weights: { cs: 4 } },
      { key: "engineering", label: "Engineering", weights: { engineering: 4 } },
      {
        key: "bio-premed",
        label: "Biology / Pre-Med",
        weights: { "bio-premed": 4 },
      },
      {
        key: "business",
        label: "Business / Finance",
        weights: { business: 4 },
      },
      {
        key: "math-physics",
        label: "Math / Physics",
        weights: { "math-physics": 4 },
      },
      {
        key: "polisci",
        label: "Political Science / IR",
        weights: { polisci: 4 },
      },
      {
        key: "psych",
        label: "Psychology / Neuroscience",
        weights: { psych: 4 },
      },
      {
        key: "humanities",
        label: "Humanities / English",
        weights: { humanities: 4 },
      },
      { key: "design", label: "Design / Arts", weights: { design: 4 } },
      { key: "law", label: "Pre-Law", weights: { law: 4 } },
    ],
  },
];

const QUESTION_BY_ID = new Map(ASSESSMENT_QUESTIONS.map((q) => [q.id, q]));

/** Representative majors for a coarse field, pulled from the live taxonomy. */
function majorsForField(fieldKey: FieldKey, limit = 3): string[] {
  const out: string[] = [];
  for (const area of ACADEMIC_AREAS) {
    for (const m of area.majors) {
      if (m.fieldKey === fieldKey && !out.includes(m.label)) out.push(m.label);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

/**
 * Score answers into a ranked set of suggested fields. Pure + deterministic:
 * sums option weights per field, then returns the top fields (score > 0) with a
 * rationale naming the answers that drove each one.
 */
export function scoreAssessment(answers: AssessmentAnswers): AssessmentResult {
  const scores = new Map<FieldKey, number>();
  // Track which option labels contributed to each field, for the rationale.
  const drivers = new Map<FieldKey, Array<{ label: string; weight: number }>>();

  for (const [qid, selected] of Object.entries(answers)) {
    const q = QUESTION_BY_ID.get(qid);
    if (!q) continue;
    for (const optKey of selected) {
      const opt = q.options.find((o) => o.key === optKey);
      if (!opt) continue;
      for (const [fk, w] of Object.entries(opt.weights) as Array<
        [FieldKey, number]
      >) {
        scores.set(fk, (scores.get(fk) ?? 0) + w);
        const list = drivers.get(fk) ?? [];
        list.push({ label: opt.label, weight: w });
        drivers.set(fk, list);
      }
    }
  }

  const ranked = [...scores.entries()]
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  // "Undecided" when there's essentially no signal (nothing selected, or a flat
  // near-tie with tiny scores).
  const total = ranked.reduce((sum, [, s]) => sum + s, 0);
  const undecided = total < 3;

  const topFields: SuggestedField[] = ranked.slice(0, 3).map(([fk, score]) => {
    const topDrivers = (drivers.get(fk) ?? [])
      .sort((a, b) => b.weight - a.weight)
      .map((d) => d.label);
    // De-dupe while preserving order, take up to 2.
    const unique = [...new Set(topDrivers)].slice(0, 2);
    const rationale =
      unique.length > 0
        ? `Based on your interest in ${unique.join(" and ")}.`
        : "Based on your overall responses.";
    return {
      fieldKey: fk,
      label: MAJOR_LABELS[fk] ?? fk,
      score,
      majors: majorsForField(fk),
      rationale,
    };
  });

  return { topFields, undecided };
}
