// Applicant Strength layer (Layer 2) — PURE, no DB, no network.
//
// Derives a normalized 0..1 strength vector from the student's ALREADY-CACHED
// LLM component scores (academics / activities / awards, each 0..100, produced
// by the profile analysis — see src/lib/ai/score.ts). We deliberately REUSE
// those cached scores rather than rescoring the student here: the admission
// engine must never re-run the LLM, and a student should be consistently strong
// across every college they look at.
//
// This is ABSOLUTE strength. It knows nothing about any specific college — the
// college-relative comparison happens in assessment.ts.

import type { ApplicantStrength } from "./types";

/** The subset of the cached analysis this layer consumes (component scores). */
export interface ComponentScoreInput {
  academics?: { score: number } | null;
  activities?: { score: number } | null;
  awards?: { score: number } | null;
}

// Weights for combining the holistic signals into a single `holistic` lift.
// Narrative is present but 0-weight until essays are actually incorporated, so it
// can never move the result yet. Activities lead, mirroring how holistic
// admissions read sustained, high-impact involvement, but WITHOUT importing the
// diagnostic score's product weights (0.35/0.45/0.20) — those exist to coach the
// student, not to estimate admission odds.
const HOLISTIC_WEIGHTS = {
  activities: 0.6,
  awards: 0.4,
  narrative: 0, // placeholder — essays not yet incorporated
} as const;

const to01 = (score: number | null | undefined): number | null =>
  typeof score === "number" && !Number.isNaN(score)
    ? Math.max(0, Math.min(1, score / 100))
    : null;

/**
 * Build the applicant-strength vector from cached component scores. When no
 * scores exist (student hasn't run an analysis yet), returns a neutral vector
 * with `hasHolistic: false` so the assessment layer can lower confidence rather
 * than silently assuming an average applicant.
 */
export function deriveApplicantStrength(
  components: ComponentScoreInput | null | undefined,
): ApplicantStrength {
  const academics = to01(components?.academics?.score);
  const activities = to01(components?.activities?.score);
  const awards = to01(components?.awards?.score);
  const narrative = 0; // essays not yet incorporated

  const hasHolistic = activities != null || awards != null;

  // Weighted holistic lift over whatever holistic signals we actually have.
  // Missing signals drop out of both numerator and denominator so a student with
  // only activities isn't penalized for awards we never scored.
  let num = 0;
  let den = 0;
  if (activities != null) {
    num += activities * HOLISTIC_WEIGHTS.activities;
    den += HOLISTIC_WEIGHTS.activities;
  }
  if (awards != null) {
    num += awards * HOLISTIC_WEIGHTS.awards;
    den += HOLISTIC_WEIGHTS.awards;
  }
  // narrative is 0-weight, so it never contributes while den stays > 0.
  const holistic = den > 0 ? num / den : 0;

  return {
    academics,
    activities,
    awards,
    narrative,
    holistic,
    hasHolistic,
  };
}

/** A neutral vector for when no analysis exists — explicitly flags no holistic
 * data so the assessment can widen its range instead of assuming average. */
export function neutralStrength(): ApplicantStrength {
  return {
    academics: null,
    activities: null,
    awards: null,
    narrative: 0,
    holistic: 0,
    hasHolistic: false,
  };
}
