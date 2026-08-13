import { z } from "zod";

// Application Writing — AI feedback contract.
//
// This is intentionally separate from analysisSchema (the holistic gap
// analysis). Application Writing is communication feedback on the student's
// real, already-entered text — it never feeds the gap score, the coherence
// gate, or the applicationNarrative. Keeping the schema isolated guarantees the
// two systems can evolve independently.
//
// Activity descriptions are scored 0–10 on three concrete criteria — Action
// Verb, Specificity/Metrics, and Impact/Outcome. The overall /10 is computed in
// code from those three sub-scores (see computeActivityScore in
// ~/lib/writing/checks), mirroring the holistic-scoring philosophy of never
// trusting the model's own top-line number.

/** One scored criterion for an activity description (0–10 plus a one-line note). */
export const writingCriterionSchema = z.object({
  score: z.number().int().min(0).max(10),
  note: z.string(),
});

export const activityWritingFeedbackSchema = z.object({
  // Echoes the activity name so the UI can match feedback back to the live
  // activity even if ordering shifts between generations.
  activityName: z.string(),

  // The three scoring dimensions. The overall /10 is derived from these in code.
  actionVerb: writingCriterionSchema,
  specificity: writingCriterionSchema,
  impact: writingCriterionSchema,

  // Whether the student's profile data supplies enough REAL detail to write a
  // truthful improved description without inventing anything. When false, the
  // model must NOT fabricate — it returns a fill-in-the-blank `template` instead.
  groundable: z.boolean(),

  // Short "tweak a few things" guidance. Always present; it's the only feedback
  // shown when a description already scores above 8/10.
  polishNote: z.string(),

  // A grounded, truthful ≤150-char rewrite that would earn a 10/10 — provided
  // ONLY when `groundable` is true. Null otherwise.
  improvedDescription: z.string().nullable(),

  // A fill-in-the-blank scaffold used when the description is too vague to
  // improve without inventing facts (e.g. "Volunteered"). Guides the student to
  // supply their own real specifics. Null when a real rewrite was provided.
  template: z.string().nullable(),
});

/** One piece of content that does not belong in Additional Information. */
export const additionalInfoRemovalSchema = z.object({
  // The offending content (quoted or paraphrased) the student should cut.
  text: z.string(),
  // Why it doesn't belong per Common App's Additional Information purpose.
  reason: z.string(),
});

export const additionalInfoWritingFeedbackSchema = z.object({
  // Whether the response, on the whole, is appropriate for the Additional
  // Information section (context the rest of the app can't convey) vs. misused
  // as a second essay / résumé dump.
  belongs: z.boolean(),
  strengths: z.array(z.string()).max(4),
  improvements: z.array(z.string()).max(4),
  // Content that should be REMOVED because it doesn't fit the section's purpose.
  toRemove: z.array(additionalInfoRemovalSchema).max(6),
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

export type WritingCriterion = z.infer<typeof writingCriterionSchema>;
export type ActivityWritingFeedback = z.infer<
  typeof activityWritingFeedbackSchema
>;
export type AdditionalInfoRemoval = z.infer<typeof additionalInfoRemovalSchema>;
export type AdditionalInfoWritingFeedback = z.infer<
  typeof additionalInfoWritingFeedbackSchema
>;
export type WritingAnalysis = z.infer<typeof writingAnalysisSchema>;
