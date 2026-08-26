// The ONE Personal Statement scoring framework — four equally-weighted
// categories, each scored out of 100. The overall score is the plain average of
// the four (code-computed, never the model's own number), so grading, the
// evaluation UI, and revision guidance all speak the same language.
//
// Client-safe (no server imports) so the engine, the score UI, and revision can
// all share it.

export type ScoreCategoryKey =
  | "voice"
  | "depth"
  | "storytelling"
  | "creativity";

export type ScoreCategoryDef = {
  key: ScoreCategoryKey;
  label: string;
  blurb: string;
};

export const SCORE_CATEGORIES: ScoreCategoryDef[] = [
  {
    key: "voice",
    label: "Voice & Authenticity",
    blurb:
      "Sounds genuinely like the student, with a distinctive personality — not generic or AI-written.",
  },
  {
    key: "depth",
    label: "Depth & Reflection",
    blurb:
      "Meaningful self-reflection that reveals how the student thinks, not just what happened — the reader learns something deeper.",
  },
  {
    key: "storytelling",
    label: "Storytelling & Structure",
    blurb:
      "Engaging and easy to follow, with strong structure, pacing, transitions, and narrative choices.",
  },
  {
    key: "creativity",
    label: "Creativity & Originality",
    blurb:
      "A fresh, memorable approach — an original perspective or way of telling. NOT fancy vocabulary or more metaphors; a simple story can score very high.",
  },
];

export const SCORE_CATEGORY_LABELS: Record<ScoreCategoryKey, string> =
  Object.fromEntries(SCORE_CATEGORIES.map((c) => [c.key, c.label])) as Record<
    ScoreCategoryKey,
    string
  >;

/** The overall score: the equal-weight average of the four category scores. */
export function overallScore(categories: { score: number }[]): number {
  if (categories.length === 0) return 0;
  const sum = categories.reduce((acc, c) => acc + c.score, 0);
  return Math.round(sum / categories.length);
}

/** A qualitative band for a 0–100 score (display only). */
export function scoreBand(score: number): string {
  if (score >= 90) return "Exceptional";
  if (score >= 80) return "Strong";
  if (score >= 70) return "Solid";
  if (score >= 60) return "Developing";
  if (score >= 45) return "Building";
  return "Early";
}

/** Tailwind text color for a 0–100 score (mirrors the analysis workspace). */
export function scoreColor(score: number): string {
  if (score >= 75) return "text-brand-teal";
  if (score >= 55) return "text-amber-500";
  return "text-red-500 dark:text-red-400";
}
