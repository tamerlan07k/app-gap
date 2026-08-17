import { z } from "zod";

// Activities workspace — AI analysis + recommendation contract.
//
// Intentionally separate from analysisSchema (holistic gap analysis) and
// writingAnalysisSchema (communication feedback). This feature has its own job:
// analyze each EXISTING activity on two SEPARATE qualitative dimensions
// (strength and major/field alignment), decide whether continuing it is worth
// the time, describe the portfolio collectively, and recommend realistic,
// timeline-appropriate NEW activities.
//
// Two integrity rules are enforced by the SHAPE of this schema, not just the
// prompt:
//   1. No numeric "admissions score" anywhere — strength/alignment are
//      qualitative bands only (per the holistic-scoring philosophy: this is not
//      an admissions predictor).
//   2. Recommendations carry NO url field. The AI must never emit application
//      links — verified links come only from the activity_opportunities table.
//      There is simply nowhere in this schema for the model to put a link.

// ─── Enums (qualitative bands, never numbers) ────────────────────────────────

export const strengthBandSchema = z.enum([
  "emerging",
  "developing",
  "strong",
  "exceptional",
]);

export const alignmentBandSchema = z.enum(["high", "medium", "low", "none"]);

export const difficultyBandSchema = z.enum([
  "beginner",
  "moderate",
  "advanced",
]);

// Continue = keep as-is; deepen = invest to grow responsibility/impact;
// maintain = fine to keep but not the place to add more time; reconsider =
// the same hours might do more elsewhere. NEVER means an activity is "bad".
export const verdictSchema = z.enum([
  "continue",
  "deepen",
  "maintain",
  "reconsider",
]);

export const prioritySchema = z.enum(["high", "medium", "low"]);

// ─── Per-existing-activity analysis ──────────────────────────────────────────

export const activityAnalysisSchema = z.object({
  // Echoes the activity name so the UI matches feedback back to the live
  // activity even if ordering changes between generations.
  activityName: z.string(),

  // Dimension 1: how strong the involvement itself is (depth, commitment,
  // responsibility, contribution, impact) — independent of the major.
  strength: strengthBandSchema,
  strengthRationale: z.string(),

  // Dimension 2: how directly it connects to the intended field. Kept SEPARATE
  // from strength — a soccer captaincy can be low alignment but high strength,
  // and that's fine.
  majorAlignment: alignmentBandSchema,
  majorAlignmentRationale: z.string(),

  // What the student should do with this activity given its trajectory, their
  // contribution, time required, room to grow, and time before applications.
  verdict: verdictSchema,
  verdictRationale: z.string(),

  // A concrete, grounded way to grow this specific activity (take on X, produce
  // Y). Null when there isn't an honest one — never invented.
  deepenIdea: z.string().nullable().optional(),
});

// ─── Collective portfolio analysis ───────────────────────────────────────────

export const portfolioGapSchema = z.object({
  gap: z.string(),
  // Framed as something to complement, not a deficiency — see the prompt.
  why: z.string(),
});

export const activityProfileSchema = z.object({
  // One-line read of what the portfolio currently demonstrates as a whole.
  headline: z.string(),
  // Recurring themes across activities.
  themes: z.array(z.string()).max(6),
  // What the student already demonstrates (strengths of the whole profile).
  strengths: z.array(z.string()).max(6),
  // How the activities connect to the intended field, collectively.
  fieldAlignmentSummary: z.string(),
  // Dimensions that could be meaningfully complemented (not "you need more").
  gaps: z.array(portfolioGapSchema).max(4),
});

// ─── Recommendations (archetypes — NEVER carry links) ────────────────────────

export const recommendationSchema = z.object({
  title: z.string(),
  // Activity category slug (aligned with the activities taxonomy) or a short
  // free label; used only for grouping/iconography.
  category: z.string(),
  whyItFits: z.string(),
  majorAlignment: alignmentBandSchema,
  difficulty: difficultyBandSchema,
  // Free-text estimates, explicitly framed as estimates in the UI.
  timeCommitment: z.string(), // e.g. "~3 hrs/week"
  duration: z.string(), // e.g. "2–3 months" or "Ongoing"
  isOngoing: z.boolean(),
  // Where this could grow (leadership, competition, research, community impact).
  growth: z.string(),
  // Realistic usefulness for applications — no admissions guarantees.
  applicationUsefulness: z.string(),
  // True when the student can start it themselves (independent project,
  // community initiative, peer tutoring, open-source, writing, etc.).
  selfStartable: z.boolean(),
  // Skills/background helpful to begin. Null when none needed.
  prerequisites: z.string().nullable().optional(),
});

// ─── Timeline + next steps ───────────────────────────────────────────────────

export const nextStepSchema = z.object({
  step: z.string(),
  priority: prioritySchema,
  rationale: z.string(),
});

// ─── Root ─────────────────────────────────────────────────────────────────────

export const activitiesAnalysisSchema = z.object({
  // Per-existing-activity analysis. Empty when the student has no activities.
  activityAnalyses: z.array(activityAnalysisSchema).max(20),

  // Collective read of the whole portfolio. Null when there are no activities
  // yet (the workspace shows a "starting point" state instead of an analysis).
  profile: activityProfileSchema.nullable(),

  // Realistic, timeline-appropriate activity ideas. These are archetypes, never
  // links. For a student with few/no activities this is the heart of the output.
  recommendations: z.array(recommendationSchema).max(8),

  // A short, timeline-aware "what should I do next" summary + prioritized steps.
  nextStepsSummary: z.string(),
  nextSteps: z.array(nextStepSchema).max(6),
});

export type StrengthBand = z.infer<typeof strengthBandSchema>;
export type AlignmentBand = z.infer<typeof alignmentBandSchema>;
export type DifficultyBand = z.infer<typeof difficultyBandSchema>;
export type Verdict = z.infer<typeof verdictSchema>;
export type ActivityAnalysis = z.infer<typeof activityAnalysisSchema>;
export type ActivityProfile = z.infer<typeof activityProfileSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type NextStep = z.infer<typeof nextStepSchema>;
export type ActivitiesAnalysis = z.infer<typeof activitiesAnalysisSchema>;
