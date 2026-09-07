import { z } from "zod";

// Coursework workspace — AI INTERPRETATION contract.
//
// This feature's deterministic engine (src/lib/coursework/*) already does the
// classification: it decides each finding's five-state status (strength /
// opportunity / developing / potential-gap / unavailable / unknown) from the
// student's courses + school-availability context. The AI's job is NARROWER and
// purely interpretive: explain what the academic path COMMUNICATES and enrich
// each finding — it must not re-score or re-classify.
//
// Integrity rules enforced by the SHAPE of this schema, not just the prompt:
//   1. No numeric score anywhere — this is analysis, not an admissions predictor.
//   2. No field for a college requirement/claim — the model has nowhere to assert
//      "College X requires Y" (AppGap stores no verified requirement data).
//   3. findingNotes reference an engine-provided `key`; the model annotates
//      findings, it does not invent or reclassify them.

export const academicPathSchema = z.object({
  // One-line read of what the transcript communicates as a whole.
  headline: z.string(),
  // 2–4 sentences: the analytical interpretation ("what your coursework says
  // about you"), grounded ONLY in the provided courses — never invented facts.
  summary: z.string(),
  // Short inferences an admissions reader might reasonably draw (ambition,
  // rigor, breadth, depth/specialization, consistency, challenge-in-context).
  // Phrased as interpretation, never as certainty about any officer's view.
  communicates: z.array(z.string()).max(6),
});

export const findingNoteSchema = z.object({
  // Echoes the engine finding key so the UI attaches the note to the right item.
  key: z.string(),
  // A short, student-friendly enrichment of that finding — never contradicting
  // its status (e.g. never calling an "unavailable" or "unknown" item a gap).
  note: z.string(),
});

export const courseworkAnalysisSchema = z.object({
  academicPath: academicPathSchema,
  // Prose interpretation of the deterministic rigor profile (trajectory, depth,
  // quantitative/STEM/humanities preparation).
  rigorInterpretation: z.string(),
  // How the coursework prepares the student for their intended field, in general
  // terms — never citing a specific college's requirements.
  majorPreparationSummary: z.string(),
  // Optional per-finding enrichment, keyed to engine findings.
  findingNotes: z.array(findingNoteSchema).max(24),
  // A short, honest closing read — opportunities and context, not a verdict.
  bottomLine: z.string(),
});

export type AcademicPath = z.infer<typeof academicPathSchema>;
export type FindingNote = z.infer<typeof findingNoteSchema>;
export type CourseworkAnalysis = z.infer<typeof courseworkAnalysisSchema>;
