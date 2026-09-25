// The deterministic scoring layer. Takes the model's RAW evaluation (four
// dimension reads + graded directives) and turns it into the displayed result:
//   1. Directive coverage is computed in code from the graded directives.
//   2. The Prompt-Alignment dimension is ADJUSTED IN CODE by coverage — a student
//      who answers only 2 of 3 explicit directives loses alignment points no
//      matter how good the prose is (spec requirement). This is transparent and
//      shown to the student, not a hidden model judgment.
//   3. The OVERALL is the archetype-weighted average of the (adjusted) four
//      dimension scores — computed here, never taken from the model.
//
// Client-safe (imports only client-safe modules).

import type { RawEvaluation } from "./schemas";
import {
  DIMENSION_KEYS,
  type DimensionKey,
  type DimensionWeights,
  directiveCoverageRatio,
  type GradedDirective,
  weightedOverall,
} from "./scoring";

export type ScoredDimension = {
  key: DimensionKey;
  /** The final, displayed score (alignment is coverage-adjusted). */
  score: number;
  /** The model's raw score before any code adjustment (for transparency). */
  rawScore: number;
  /** True when code changed this dimension's score (alignment via coverage). */
  adjusted: boolean;
  summary: string;
  strengths: string[];
  improvements: string[];
};

export type ScoredEvaluation = {
  overall: number;
  dimensions: ScoredDimension[];
  weights: DimensionWeights;
  weightRationale: string;
  coverageRatio: number;
  directives: GradedDirective[];
  overview: string;
  mainWeakness: string;
  keyEvidence: { quote: string; issue: string }[];
  guidedQuestions: string[];
  collegeSpecificity: "strong" | "adequate" | "weak" | null;
  swapTest: { swappable: boolean; note: string } | null;
};

/**
 * Combine a raw model evaluation with the resolved archetype weighting into the
 * final, displayable scored evaluation. Pure and deterministic.
 */
export function scoreEvaluation(
  raw: RawEvaluation,
  weights: DimensionWeights,
  weightRationale: string,
): ScoredEvaluation {
  const directives: GradedDirective[] = raw.directives.map((d) => ({
    directive: d.directive,
    status: d.status,
    note: d.note,
  }));
  const coverageRatio = directiveCoverageRatio(directives);

  const byKey = new Map(raw.dimensions.map((d) => [d.key, d]));

  const dimensions: ScoredDimension[] = [];
  for (const key of DIMENSION_KEYS) {
    const d = byKey.get(key);
    if (!d) continue;
    // Only alignment is coverage-adjusted. Missing/partial directives scale it
    // down; full coverage (or no explicit directives) leaves it untouched.
    const adjustedScore =
      key === "alignment" ? Math.round(d.score * coverageRatio) : d.score;
    dimensions.push({
      key,
      score: adjustedScore,
      rawScore: d.score,
      adjusted: key === "alignment" && adjustedScore !== d.score,
      summary: d.summary,
      strengths: d.strengths,
      improvements: d.improvements,
    });
  }

  const scoreMap: Partial<Record<DimensionKey, number>> = {};
  for (const d of dimensions) scoreMap[d.key] = d.score;

  const overall = weightedOverall(scoreMap, weights);

  return {
    overall,
    dimensions,
    weights,
    weightRationale,
    coverageRatio,
    directives,
    overview: raw.overview,
    mainWeakness: raw.mainWeakness,
    keyEvidence: raw.keyEvidence,
    guidedQuestions: raw.guidedQuestions,
    collegeSpecificity: raw.collegeSpecificity,
    swapTest: raw.swapTest,
  };
}
