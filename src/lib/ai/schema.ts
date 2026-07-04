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

export const analysisSchema = z.object({
  gapScore: z.number().int().min(0).max(100),
  gapScoreExplanation: z.string(),
  strongestAreas: z.array(strongestAreaSchema).min(1).max(5),
  topGaps: z.array(topGapSchema).min(1).max(5),
  nextSteps: z.array(nextStepSchema).min(1).max(6),
  roadmap: z.array(roadmapItemSchema).min(1).max(8),
  advisorNote: z.string(),
});

export type Analysis = z.infer<typeof analysisSchema>;
export type StrongestArea = z.infer<typeof strongestAreaSchema>;
export type TopGap = z.infer<typeof topGapSchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type RoadmapItem = z.infer<typeof roadmapItemSchema>;
