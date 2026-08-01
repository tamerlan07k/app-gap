// Overall gap-score computation.
//
// AppGap's overall score is NOT the LLM's free-hand number. The model scores six
// independent categories (0–100 each); this module combines them deterministically
// so that no single category — especially prestige-driven Memorability — can inflate
// the total, and applies a coherence gate that hard-caps thin or one-dimensional
// profiles. A high overall score therefore requires a believable, coherent story
// backed by multiple pieces of evidence, not one extraordinary activity.
//
// This runs identically for the free and pro tiers.

import type { ApplicationNarrative } from "./schema";

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
