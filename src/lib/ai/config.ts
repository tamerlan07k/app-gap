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
// Not yet active — placeholder for the future payment system.
// When billing launches, gate feature access and quota checks using this config
// rather than adding new hardcoded limits across the codebase.

export type TierKey = "free" | "starter" | "pro";

export type TierConfig = {
  label: string;
  /** AI features accessible on this tier */
  features: FeatureKey[];
  /** Max AI generations per calendar month; null = unlimited */
  generationsPerMonth: number | null;
};

export const SUBSCRIPTION_TIERS = {
  free: {
    label: "Free",
    features: ["profileAnalysis"],
    generationsPerMonth: 3,
  },
  starter: {
    label: "Starter",
    features: ["profileAnalysis"],
    generationsPerMonth: 10,
  },
  pro: {
    label: "Pro",
    features: ["profileAnalysis"],
    generationsPerMonth: null,
  },
} as const satisfies Record<TierKey, TierConfig>;
