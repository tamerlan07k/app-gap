import { z } from "zod";

export const strongestAreaSchema = z.object({
  area: z.string(),
  explanation: z.string(),
});

export const topGapSchema = z.object({
  gap: z.string(),
  explanation: z.string(),
  severity: z.enum(["high", "medium", "low"]),
});

export const nextStepSchema = z.object({
  step: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  timeline: z.string(),
});

export const roadmapItemSchema = z.object({
  title: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  explanation: z.string(),
  expectedImpact: z.string(),
  estimatedDifficulty: z.enum(["easy", "medium", "hard"]),
  suggestedTimeline: z.string(),
});

export const narrativeScoreSchema = z.object({
  score: z.number().int().min(0).max(100),
  explanation: z.string(),
});

export const narrativeGapItemSchema = z.object({
  gap: z.string(),
  explanation: z.string(),
});

export const applicationNarrativeSchema = z.object({
  standoutQuality: z.string(),
  standoutExplanation: z.string(),
  // Scored evaluation categories. narrativeCohesion, memorability, and
  // majorAlignment predate the composite-scoring model; academicStrength,
  // applicationDepth, and sustainedImpact were added to feed the overall gap
  // score (see score.ts) and are optional so legacy analyses still validate.
  academicStrength: narrativeScoreSchema.optional(),
  narrativeCohesion: narrativeScoreSchema,
  applicationDepth: narrativeScoreSchema.optional(),
  sustainedImpact: narrativeScoreSchema.optional(),
  memorability: narrativeScoreSchema,
  majorAlignment: narrativeScoreSchema,
  cohesionAnalysis: z.string(),
  admissionsPerception: z.string(),
  narrativeGaps: z.array(narrativeGapItemSchema).min(1).max(4),
  // Retained for legacy analyses; the V2 diagnostic no longer surfaces School
  // Fit (it returns with the future My Colleges system). Optional so new
  // analyses that omit it still validate.
  schoolFitReasoning: z.string().optional(),
});

// The application-component scores that drive the V2 diagnostic score (weighted
// + renormalized in score.ts). academics/activities/awards always come from the
// model; personalStatement is present ONLY when the student supplied one during
// onboarding (its score comes from the lightweight onboarding diagnostic, not the
// profile model). Optional so legacy analyses generated before V2 still validate.
export const componentScoresSchema = z.object({
  academics: narrativeScoreSchema,
  activities: narrativeScoreSchema,
  awards: narrativeScoreSchema,
  personalStatement: narrativeScoreSchema.optional(),
});

// The lightweight onboarding Personal Statement diagnostic result — a rough
// signal only, distinct from the full Personal Statement Coach. Present only when
// the student provided a statement during onboarding.
export const personalStatementDiagnosticSchema = z.object({
  score: z.number().int().min(0).max(100),
  strength: z.string(),
  opportunity: z.string(),
});

export const analysisSchema = z.object({
  gapScore: z.number().int().min(0).max(100),
  gapScoreExplanation: z.string(),
  componentScores: componentScoresSchema.optional(),
  strongestAreas: z.array(strongestAreaSchema).min(1).max(5),
  topGaps: z.array(topGapSchema).min(1).max(5),
  nextSteps: z.array(nextStepSchema).min(1).max(6),
  roadmap: z.array(roadmapItemSchema).min(1).max(8),
  advisorNote: z.string(),
  applicationNarrative: applicationNarrativeSchema.optional(),
  personalStatement: personalStatementDiagnosticSchema.optional(),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type StrongestArea = z.infer<typeof strongestAreaSchema>;
export type TopGap = z.infer<typeof topGapSchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type ApplicationNarrative = z.infer<typeof applicationNarrativeSchema>;
export type ComponentScores = z.infer<typeof componentScoresSchema>;
export type PersonalStatementDiagnostic = z.infer<
  typeof personalStatementDiagnosticSchema
>;
export type NarrativeScore = z.infer<typeof narrativeScoreSchema>;
export type NarrativeGapItem = z.infer<typeof narrativeGapItemSchema>;
