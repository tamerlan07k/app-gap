// Central AI configuration — the single place to define models, parameters,
// subscription tiers, and per-feature access rules. Changing a model, adding a
// new AI feature, or adjusting what each plan can use only requires editing this
// file. This is also the central control point for AI COST: model choice and
// usage limits, per feature and per tier, all live here — so not every feature
// has to use the most expensive model, and limits can be tuned in one place.

// ─── Feature registry ────────────────────────────────────────────────────────

export type FeatureKey =
  | "profileAnalysis" // the AppGap diagnostic / gap analysis
  | "applicationWriting" // activity descriptions + Additional Information help
  | "personalStatementCoach" // Personal Statement coaching (future)
  | "supplementalCoach" // supplemental-essay coaching (future)
  | "opportunityFinder"; // internships / research / competitions finder (future)

export type FeatureConfig = {
  /** Provider/model ID for the AI gateway (format: "provider/model-name") */
  model: string;
  /** Sampling temperature — lower = more deterministic */
  temperature: number;
  /** Short description of what this feature does */
  description: string;
};

// Runtime config (model + temperature) for the AI features that are actually
// implemented today. Future features get an entry here when they ship. Typed as
// Partial so unbuilt keys in FeatureKey don't need a config yet.
export const AI_FEATURES = {
  profileAnalysis: {
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    description:
      "Admissions gap analysis generated from a student's academic profile",
  },
} satisfies Partial<Record<FeatureKey, FeatureConfig>>;

// ─── Subscription tiers ───────────────────────────────────────────────────────

export type TierKey = "free" | "pro";

export type TierConfig = {
  label: string;
  /**
   * Tier-level default model. Per-feature models live in FEATURE_ACCESS, which is
   * the source of truth for entitlement; this is only a convenience default.
   */
  model: string;
};

// Tier metadata. The old "N generations per month" cap has been removed — access
// is now governed per-feature by FEATURE_ACCESS below.
export const SUBSCRIPTION_TIERS = {
  free: {
    label: "Free",
    model: "google/gemini-2.5-flash",
  },
  pro: {
    label: "Pro",
    model: "google/gemini-2.5-pro",
  },
} as const satisfies Record<TierKey, TierConfig>;

// ─── Per-feature access & limits (the feature-based entitlement model) ────────
//
// The source of truth for what each plan can do. This replaces the old blanket
// generation cap: each feature declares, per tier, whether it's enabled, how
// many times it can be used per window (null = unlimited), and which model that
// tier uses. Enforcement reads this map + recorded usage; UI reads it to decide
// whether to show a feature or an upgrade prompt.

/** The period a usage limit is measured over. */
export type UsageWindow = "lifetime" | "month" | "week";

export type FeatureAccess = {
  /** Whether this tier can use the feature at all (false → show upgrade CTA). */
  enabled: boolean;
  /** Max uses per window, or null for unlimited. */
  limit: number | null;
  /** Window the limit is measured over; null when limit is null. */
  window: UsageWindow | null;
  /** Model this tier uses for this feature (central AI-cost control). */
  model?: string;
};

export const FEATURE_ACCESS: Record<
  FeatureKey,
  Record<TierKey, FeatureAccess>
> = {
  // The AppGap diagnostic. This is the ONLY feature enforced today (see the
  // analyze-profile route). Free = one analysis for the lifetime of the account;
  // Pro = a bounded monthly allowance — generous, but deliberately NOT unlimited,
  // to cap worst-case AI spend. Tune these numbers here to control cost.
  profileAnalysis: {
    free: {
      enabled: true,
      limit: 1,
      window: "lifetime",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 30,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
  // Activity descriptions + Additional Information writing help. NOT enforced yet
  // (feature is unbuilt); these values pre-define the intended entitlement so the
  // architecture is ready — Free 1/week, Pro a bounded higher monthly allowance.
  applicationWriting: {
    free: {
      enabled: true,
      limit: 1,
      window: "week",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 100,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
  // Pro-only tools (future, not enforced yet). Bounded monthly Pro allowances so
  // no future feature is ever accidentally unlimited.
  personalStatementCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 50,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
  supplementalCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 50,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
  opportunityFinder: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 100,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
};

/**
 * Resolve what a given tier may do with a feature. Pair with resolveEntitlement()
 * to get the tier, then check `.enabled` and enforce `.limit` / `.window` against
 * recorded usage. `.model` selects the model for that tier (central cost control).
 */
export function resolveFeatureAccess(
  feature: FeatureKey,
  tier: TierKey,
): FeatureAccess {
  return FEATURE_ACCESS[feature][tier];
}
