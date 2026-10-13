import { z } from "zod";

// Shape of the single roadmap-generation call's output. The model returns ONLY
// references to approved milestone ids (validated against the library afterward)
// plus a short personalized note each. It never returns titles, routes, or any
// structural content — those come from the code library by id, so invalid output
// can never create an arbitrary milestone or route.

export const roadmapGenerationSchema = z.object({
  milestones: z
    .array(
      z.object({
        /** Must match an id from the approved, eligible catalog we sent. */
        id: z.string(),
        /** One short, grounded sentence on why this is worth doing now. */
        note: z.string().max(240).optional(),
      }),
    )
    .max(20),
  /** The id the model recommends as the next step (advisory; we recompute
   *  deterministically, but it can serve as a tiebreak). */
  nextStepId: z.string().optional(),
});

export type RoadmapGenerationOutput = z.infer<typeof roadmapGenerationSchema>;
