import { z } from "zod";

// Application Writing — AI feedback contract.
//
// This is intentionally separate from analysisSchema (the holistic gap
// analysis). Application Writing is communication feedback on the student's
// real, already-entered text — it never feeds the gap score, the coherence
// gate, or the applicationNarrative. Keeping the schema isolated guarantees the
// two systems can evolve independently.

/** Overall communication-quality label for one activity description. */
export const writingQualitySchema = z.enum([
  "strong",
  "good",
  "needs-specificity",
  "very-vague",
]);

export const activityWritingFeedbackSchema = z.object({
  // Echoes the activity name so the UI can match feedback back to the live
  // activity even if ordering shifts between generations.
  activityName: z.string(),
  quality: writingQualitySchema,
  whatsWorking: z.array(z.string()).min(1).max(4),
  whatCouldImprove: z.array(z.string()).max(4),
  suggestion: z.string(),
  // A concrete rewrite — provided ONLY when the student's own profile supplies
  // enough factual detail to improve the description without inventing anything.
  // Null when the model must ask for more information instead.
  potentialRevision: z.string().nullable(),
  // Asked when there isn't enough factual grounding for a revision. Mutually
  // exclusive with potentialRevision in spirit, though the schema does not force
  // it — the prompt instructs the model to provide exactly one.
  clarifyingQuestion: z.string().nullable(),
});

export const additionalInfoWritingFeedbackSchema = z.object({
  strengths: z.array(z.string()).max(4),
  improvements: z.array(z.string()).max(4),
  suggestion: z.string(),
  // Optional tightened version — provided only when it genuinely helps and
  // never fabricates content. Null otherwise.
  improvedVersion: z.string().nullable(),
});

export const writingAnalysisSchema = z.object({
  activities: z.array(activityWritingFeedbackSchema),
  // Null when the student left Additional Information blank.
  additionalInfo: additionalInfoWritingFeedbackSchema.nullable(),
});

export type WritingQuality = z.infer<typeof writingQualitySchema>;
export type ActivityWritingFeedback = z.infer<
  typeof activityWritingFeedbackSchema
>;
export type AdditionalInfoWritingFeedback = z.infer<
  typeof additionalInfoWritingFeedbackSchema
>;
export type WritingAnalysis = z.infer<typeof writingAnalysisSchema>;
