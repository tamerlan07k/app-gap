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
  narrativeCohesion: narrativeScoreSchema,
  memorability: narrativeScoreSchema,
  majorAlignment: narrativeScoreSchema,
  cohesionAnalysis: z.string(),
  admissionsPerception: z.string(),
  narrativeGaps: z.array(narrativeGapItemSchema).min(1).max(4),
  schoolFitReasoning: z.string(),
});

export const analysisSchema = z.object({
  gapScore: z.number().int().min(0).max(100),
  gapScoreExplanation: z.string(),
  strongestAreas: z.array(strongestAreaSchema).min(1).max(5),
  topGaps: z.array(topGapSchema).min(1).max(5),
  nextSteps: z.array(nextStepSchema).min(1).max(6),
  roadmap: z.array(roadmapItemSchema).min(1).max(8),
  advisorNote: z.string(),
  applicationNarrative: applicationNarrativeSchema.optional(),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type StrongestArea = z.infer<typeof strongestAreaSchema>;
export type TopGap = z.infer<typeof topGapSchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
export type ApplicationNarrative = z.infer<typeof applicationNarrativeSchema>;
export type NarrativeScore = z.infer<typeof narrativeScoreSchema>;
export type NarrativeGapItem = z.infer<typeof narrativeGapItemSchema>;
