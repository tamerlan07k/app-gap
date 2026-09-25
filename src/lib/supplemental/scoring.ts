// The Supplemental Essays scoring framework — four dimensions, each scored 0–100
// by the model, combined into an overall score using DYNAMIC, archetype-driven
// weights (see ./archetypes). Unlike the Personal Statement (equal weights), a
// supplement's overall is a WEIGHTED average because a "Why Us" essay and a
// personality/roommate essay should not be judged on the same balance.
//
// As with every AppGap grader, the OVERALL is computed HERE in code from the four
// model sub-scores — never taken from the model — so the number is transparent
// and reproducible. This is an internal AppGap evaluation framework informed by
// admissions guidance; it is NOT a validated admissions prediction, and a score
// never implies an admission outcome.
//
// Client-safe (no server imports): the engine, the evaluation UI, and the
// checklist all share it.

export type DimensionKey =
  | "alignment" // Prompt Alignment & Directive Coverage
  | "reflection" // Reflective Depth & Metacognition
  | "specificity" // Specificity & Concrete Evidence
  | "voice"; // Voice, Authenticity & Clarity

export type DimensionDef = {
  key: DimensionKey;
  label: string;
  blurb: string;
};

// The canonical order the UI renders dimensions in.
export const DIMENSIONS: DimensionDef[] = [
  {
    key: "alignment",
    label: "Prompt Alignment & Directive Coverage",
    blurb:
      "Actually answers the prompt — every explicit sub-question, within the word limit and any stated constraints. Excellent prose that ignores part of the prompt still loses points here.",
  },
  {
    key: "reflection",
    label: "Reflective Depth & Metacognition",
    blurb:
      "Shows how the student thinks — why something mattered, what they noticed, what changed, what they learned, what questions remain. Uncertainty, changing one's mind, or realizing something is more complicated all count; dramatic 'growth' is not required.",
  },
  {
    key: "specificity",
    label: "Specificity & Concrete Evidence",
    blurb:
      "Concrete experiences, precise details, specific decisions, real observations, and evidence for claims — instead of vague statements like 'I'm passionate about helping people' that the essay never proves.",
  },
  {
    key: "voice",
    label: "Voice, Authenticity & Clarity",
    blurb:
      "Sounds like this student, articulate and clear. Not rewarded for thesaurus-stuffing or a polished 'consultant' voice; not penalized for simple vocabulary, minor imperfections, or non-native phrasing when the meaning is clear.",
  },
];

export const DIMENSION_LABELS: Record<DimensionKey, string> =
  Object.fromEntries(DIMENSIONS.map((d) => [d.key, d.label])) as Record<
    DimensionKey,
    string
  >;

/** Integer weights (percent) for the four dimensions; should sum to 100. */
export type DimensionWeights = Record<DimensionKey, number>;

/** The four dimension keys in canonical order. */
export const DIMENSION_KEYS: DimensionKey[] = DIMENSIONS.map((d) => d.key);

/**
 * The overall score: the WEIGHTED average of the four dimension scores, using the
 * archetype-driven weights. Computed in code (never the model's number). Weights
 * need not sum to exactly 100 — we divide by their actual total so the result is
 * always a clean 0–100.
 */
export function weightedOverall(
  scores: Partial<Record<DimensionKey, number>>,
  weights: DimensionWeights,
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const key of DIMENSION_KEYS) {
    const score = scores[key];
    if (score == null) continue;
    const w = weights[key] ?? 0;
    weightedSum += score * w;
    totalWeight += w;
  }
  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

// ─── Directive coverage ───────────────────────────────────────────────────────
//
// Every explicit directive the parser found is graded by the evaluator as
// "addressed", "partial", or "missing". The coverage RATIO is computed here so
// the number is deterministic: fully-addressed counts 1, partial counts 0.5,
// missing counts 0. A student who answers only 2 of 3 explicit questions has a
// coverage ratio of ~0.67 regardless of how good the prose is.

export type DirectiveStatus = "addressed" | "partial" | "missing";

export type GradedDirective = {
  /** The directive/sub-question text (from the prompt parse). */
  directive: string;
  status: DirectiveStatus;
  /** One line on how it was (or wasn't) addressed. */
  note?: string;
};

const DIRECTIVE_WEIGHT: Record<DirectiveStatus, number> = {
  addressed: 1,
  partial: 0.5,
  missing: 0,
};

/** addressed / total, with partial counting as half. 1 when there are none. */
export function directiveCoverageRatio(directives: GradedDirective[]): number {
  if (directives.length === 0) return 1;
  const covered = directives.reduce(
    (acc, d) => acc + DIRECTIVE_WEIGHT[d.status],
    0,
  );
  return covered / directives.length;
}

/** Count of directives fully or partly addressed, for "2 of 3" style display. */
export function directivesAddressed(directives: GradedDirective[]): number {
  return directives.filter((d) => d.status !== "missing").length;
}

// ─── Bands & colors (display only) ────────────────────────────────────────────

/** A qualitative band for a 0–100 score (display only). */
export function scoreBand(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Solid";
  if (score >= 60) return "Developing";
  if (score >= 45) return "Building";
  return "Early";
}

/** Tailwind text color for a 0–100 score (mirrors the rest of the app). */
export function scoreColor(score: number): string {
  if (score >= 75) return "text-brand-teal";
  if (score >= 55) return "text-amber-500";
  return "text-red-500 dark:text-red-400";
}
