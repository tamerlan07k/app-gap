import { z } from "zod";

// Awards → Recognition Map — AI INTERPRETATION contract.
//
// The deterministic engine (src/lib/awards/*) already classifies awards +
// activities into recognition themes and computes coverage, gaps, and redundancy.
// The AI's job is NARROWER and purely interpretive: explain what the collection
// COLLECTIVELY demonstrates, articulate the recognition gaps, and give a compact
// per-award read (what it shows, what it doesn't, how it connects, whether it
// repeats existing evidence, and any story material).
//
// Integrity rules enforced by the SHAPE of this schema, not just the prompt:
//   1. No numeric score anywhere — this is analysis, not an admissions predictor.
//   2. awardNotes reference an engine-provided awardId; the model annotates the
//      student's real awards, it never invents awards, results, or selectivity.
//   3. There is no field for an admissions-odds claim or a guarantee.

export const collectiveSchema = z.object({
  // One-line read of what the student's recognition says as a whole.
  headline: z.string(),
  // 2–4 sentences interpreting what the collection of awards communicates,
  // grounded ONLY in the provided awards/activities — never invented facts.
  summary: z.string(),
  // Recurring themes / strengths the recognition demonstrates (short phrases).
  demonstrates: z.array(z.string()).max(6),
});

export const recognitionGapSchema = z.object({
  // A dimension where the student may have real evidence/activities but little or
  // no external recognition. Framed as an opportunity, never a deficiency.
  area: z.string(),
  why: z.string(),
});

// How an award relates to the rest of the application's evidence.
export const redundancyBandSchema = z.enum(["adds_new", "reinforces", "mixed"]);

export const awardNoteSchema = z.object({
  // Echoes the engine-provided award id so the UI attaches the note correctly.
  awardId: z.string(),
  // What this award provides as evidence, based on the student's actual info.
  whatItDemonstrates: z.string(),
  // What it should NOT be over-read as proving (honest limits).
  whatItDoesnt: z.string(),
  // Which other parts of the application reinforce or overlap with it.
  connectedEvidence: z.string(),
  // Whether it mostly repeats existing evidence or adds a dimension.
  redundancy: redundancyBandSchema,
  redundancyNote: z.string(),
  // Whether the experience behind it could be useful essay/interview material.
  // Empty string when there isn't an honest one — never invented.
  storyMaterial: z.string(),
});

export const recognitionAnalysisSchema = z.object({
  collective: collectiveSchema,
  recognitionGaps: z.array(recognitionGapSchema).max(4),
  awardNotes: z.array(awardNoteSchema).max(20),
  // A short, honest closing read — what the recognition adds to the application
  // story and where a new dimension could help. Never a verdict or a guarantee.
  bottomLine: z.string(),
});

export type Collective = z.infer<typeof collectiveSchema>;
export type RecognitionGapNote = z.infer<typeof recognitionGapSchema>;
export type AwardNote = z.infer<typeof awardNoteSchema>;
export type RedundancyBand = z.infer<typeof redundancyBandSchema>;
export type RecognitionAnalysis = z.infer<typeof recognitionAnalysisSchema>;
