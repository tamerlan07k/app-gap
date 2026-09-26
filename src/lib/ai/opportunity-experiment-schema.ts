import { z } from "zod";

// Awards → "Test an Opportunity" — AI assessment contract.
//
// A student pastes the name/description of any competition, hackathon, conference,
// program, or fellowship, and gets a SHORT, practical read on whether pursuing it
// makes sense for THEIR application right now — given their recognition profile,
// gaps, and timing. Intentionally concise. This is NOT an admissions prediction.
//
// Integrity via schema shape: a three-way qualitative verdict (never a number),
// and no field for odds or guarantees.

// 🟢 worthwhile — could add useful evidence/recognition that fits the student.
// 🟡 limited    — could be useful but mostly overlaps existing evidence.
// 🔴 low_value  — potential benefit looks limited relative to the effort/time.
export const experimentVerdictSchema = z.enum([
  "worthwhile",
  "limited",
  "low_value",
]);

export const opportunityExperimentSchema = z.object({
  verdict: experimentVerdictSchema,
  // A one-line read matching the verdict (e.g. "Could add a research dimension").
  headline: z.string(),
  // What the opportunity could add to the application, specifically for them.
  whatItCouldAdd: z.string(),
  // What it overlaps with in their existing evidence (empty if little overlap).
  overlaps: z.string(),
  // Whether it addresses a recognition/evidence gap they actually have.
  addressesGap: z.boolean(),
  gapNote: z.string(),
  // Approximate time/effort if it can be reasonably inferred; otherwise say so.
  effortNote: z.string(),
  // Whether the timing makes sense, if the student gave (or it implies) a date.
  // When timing can't be judged from the input, say that plainly.
  timingNote: z.string(),
  // The concise reasoning behind the verdict.
  rationale: z.string(),
});

export type ExperimentVerdict = z.infer<typeof experimentVerdictSchema>;
export type OpportunityExperiment = z.infer<typeof opportunityExperimentSchema>;
