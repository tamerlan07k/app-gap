// Central AI configuration — the single place to define models, parameters,
// and subscription tier rules. Changing a model or adding a new AI feature
// only requires editing this file.

// ─── Feature registry ────────────────────────────────────────────────────────

export type FeatureKey = "profileAnalysis";
// Future features to add here:
//   | "essayFeedback"
//   | "scholarshipMatching"
//   | "collegeRecommendations"

export type FeatureConfig = {
  /** Provider/model ID for the AI gateway (format: "provider/model-name") */
  model: string;
  /** Sampling temperature — lower = more deterministic */
  temperature: number;
  /** Short description of what this feature does */
  description: string;
};

export const AI_FEATURES = {
  profileAnalysis: {
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    description:
      "Admissions gap analysis generated from a student's academic profile",
  },
  // essayFeedback: {
  //   model: "openai/gpt-4o",
  //   temperature: 0.5,
  //   description: "Detailed feedback on college application essays",
  // },
  // scholarshipMatching: {
  //   model: "openai/gpt-4o-mini",
  //   temperature: 0.2,
  //   description: "Match student profile to relevant scholarships",
  // },
  // collegeRecommendations: {
  //   model: "openai/gpt-4o-mini",
  //   temperature: 0.2,
  //   description: "Recommend colleges based on profile and preferences",
  // },
} as const satisfies Record<FeatureKey, FeatureConfig>;

// ─── Subscription tiers ───────────────────────────────────────────────────────

export type TierKey = "free" | "pro";

export type TierConfig = {
  label: string;
  /** Model override for this tier — overrides the feature-level default */
  model: string;
  /** Max AI generations per calendar month */
  generationsPerMonth: number;
};

export const SUBSCRIPTION_TIERS = {
  free: {
    label: "Free",
    model: "openai/gpt-4o-mini",
    generationsPerMonth: 1,
  },
  pro: {
    label: "Pro",
    model: "google/gemini-2.5-pro",
    generationsPerMonth: 4,
  },
} as const satisfies Record<TierKey, TierConfig>;
