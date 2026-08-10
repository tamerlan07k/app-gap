// Overall AppGap score computation.
//
// The overall score is NOT the LLM's free-hand number. In the V2 model the LLM
// scores three application components (Academics, Activities, Awards) 0–100 each,
// and this module combines them with fixed, configurable weights
// (0.35 / 0.45 / 0.20). The legacy six-category composite + coherence gate lower
// in this file is retained so analyses generated before V2 still compute a
// coherent overall.
//
// This runs identically for the free and pro tiers.

import type { ApplicationNarrative, ComponentScores } from "./schema";

// ─── V2 component weights (must sum to 100) ──────────────────────────────────
// The diagnostic score is a weighted average of three components the model scores
// 0–100 each. Weights live here so the product baseline can be tuned in one place.
//   AppGap Score = 0.35·Academics + 0.45·Activities + 0.20·Awards

export const COMPONENT_WEIGHTS = {
  academics: 35,
  activities: 45,
  awards: 20,
} as const;

export type ComponentKey = keyof typeof COMPONENT_WEIGHTS;

/**
 * Extract the three component scores from the model's componentScores block.
 * Returns null if any is missing (e.g. legacy analyses), signalling the caller
 * to fall back to the legacy category composite.
 */
export function extractComponentScores(
  componentScores: ComponentScores | undefined,
): Record<ComponentKey, number> | null {
  if (!componentScores) return null;

  const scores: Partial<Record<ComponentKey, number>> = {
    academics: componentScores.academics?.score,
    activities: componentScores.activities?.score,
    awards: componentScores.awards?.score,
  };

  for (const key of Object.keys(COMPONENT_WEIGHTS) as ComponentKey[]) {
    if (typeof scores[key] !== "number" || Number.isNaN(scores[key])) {
      return null;
    }
  }

  return scores as Record<ComponentKey, number>;
}

/**
 * Compute the overall AppGap diagnostic score as the weighted average of the
 * three component scores. The number reflects the quality of the student's actual
 * application data (academics, activities, awards) — not task completion.
 */
export function computeComponentScore(
  scores: Record<ComponentKey, number>,
): number {
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  let weighted = 0;
  for (const key of Object.keys(COMPONENT_WEIGHTS) as ComponentKey[]) {
    weighted += clamp(scores[key]) * (COMPONENT_WEIGHTS[key] / 100);
  }
  return Math.round(weighted);
}

// ─── Legacy category composite (pre-V2 analyses) ─────────────────────────────
// Retained so analyses generated before the V2 three-component model still
// compute a coherent overall. New analyses use computeComponentScore above.

// ─── Category weights (must sum to 100) ──────────────────────────────────────
// Memorability is intentionally the smallest weight: prestige is one signal, not
// the verdict. Depth, cohesion, and sustained impact together dominate.

export const CATEGORY_WEIGHTS = {
  academicStrength: 25,
  narrativeCohesion: 20,
  applicationDepth: 18,
  sustainedImpact: 17,
  majorAlignment: 12,
  memorability: 8,
} as const;

export type CategoryKey = keyof typeof CATEGORY_WEIGHTS;

// The three categories that, together, evidence a real multi-faceted story.
// The coherence gate checks how many of these clear the bar.
const STORY_CATEGORIES: CategoryKey[] = [
  "narrativeCohesion",
  "applicationDepth",
  "sustainedImpact",
];

const STORY_CATEGORY_THRESHOLD = 55;

// ─── Coherence-gate caps ─────────────────────────────────────────────────────
// A prestigious résumé with no breadth or sustained involvement cannot buy a high
// overall score. These ceilings encode the internal rule: "no compelling story
// across multiple pieces of evidence → no high score."

const CAP_TOO_FEW_ACTIVITIES = 55; // fewer than 2 activities
const CAP_THIN_PROFILE = 68; // fewer than 3 activities
const CAP_WEAK_STORY = 62; // fewer than 2 story categories clear the bar

export interface GateInputs {
  /** Total number of extracurricular activities on the profile. */
  activityCount: number;
}

export interface CompositeResult {
  /** Final overall score after weighting and the coherence gate. */
  score: number;
  /** Weighted-sum score before any gate caps were applied. */
  rawWeighted: number;
  /** The cap that bound the score, or null if no cap applied. */
  appliedCap: number | null;
}

/**
 * Extract the six category scores from the model's applicationNarrative block.
 * Returns null if any required category score is missing (e.g. legacy analyses
 * generated before these fields existed), signalling the caller to fall back.
 */
export function extractCategoryScores(
  narrative: ApplicationNarrative | undefined,
): Record<CategoryKey, number> | null {
  if (!narrative) return null;

  const scores: Partial<Record<CategoryKey, number>> = {
    academicStrength: narrative.academicStrength?.score,
    narrativeCohesion: narrative.narrativeCohesion?.score,
    applicationDepth: narrative.applicationDepth?.score,
    sustainedImpact: narrative.sustainedImpact?.score,
    majorAlignment: narrative.majorAlignment?.score,
    memorability: narrative.memorability?.score,
  };

  for (const key of Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]) {
    if (typeof scores[key] !== "number" || Number.isNaN(scores[key])) {
      return null;
    }
  }

  return scores as Record<CategoryKey, number>;
}

/**
 * Compute the overall gap score from the six category scores, then apply the
 * coherence gate. The gate takes the most restrictive applicable ceiling.
 */
export function computeOverallScore(
  scores: Record<CategoryKey, number>,
  gate: GateInputs,
): CompositeResult {
  // Clamp each category defensively, then take the weighted average.
  const clamp = (n: number) => Math.max(0, Math.min(100, n));

  let weighted = 0;
  for (const key of Object.keys(CATEGORY_WEIGHTS) as CategoryKey[]) {
    weighted += clamp(scores[key]) * (CATEGORY_WEIGHTS[key] / 100);
  }
  const rawWeighted = Math.round(weighted);

  // Coherence gate: collect every applicable ceiling and take the lowest.
  const caps: number[] = [];

  if (gate.activityCount < 2) {
    caps.push(CAP_TOO_FEW_ACTIVITIES);
  } else if (gate.activityCount < 3) {
    caps.push(CAP_THIN_PROFILE);
  }

  const strongStoryCategories = STORY_CATEGORIES.filter(
    (key) => clamp(scores[key]) >= STORY_CATEGORY_THRESHOLD,
  ).length;
  if (strongStoryCategories < 2) {
    caps.push(CAP_WEAK_STORY);
  }

  const appliedCap = caps.length > 0 ? Math.min(...caps) : null;
  const score =
    appliedCap != null ? Math.min(rawWeighted, appliedCap) : rawWeighted;

  return { score, rawWeighted, appliedCap };
}
