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
  | "activitiesAnalysis" // Activities workspace: analysis + verdicts + recommendations
  | "courseworkAnalysis" // Coursework workspace: academic-path interpretation (profile-only, never scores)
  | "personalStatementCoach" // Personal Statement: brainstorm/topic/draft/revision (Gemini)
  | "personalStatementDeepCoach" // Personal Statement: line-by-line + graded evaluation (Opus, higher cost)
  | "personalStatementChat" // Personal Statement: GapCoach live chat while writing (Gemini, metered per message)
  | "supplementalCoach" // Supplemental Essays: prompt parse + redundancy/value-add + revision guidance (Gemini)
  | "supplementalDeepCoach" // Supplemental Essays: graded evaluation + line-by-line (Opus, higher cost)
  | "supplementalChat" // Supplemental Essays: GapCoach live chat (Gemini, metered per message)
  | "awardsRecognition" // Awards: Recognition Map — collective + per-award interpretation (Gemini, cached one-row-per-user)
  | "opportunityExperiment" // Awards: "Test an Opportunity" — concise application-value assessment (Gemini, metered per use)
  | "opportunityFinder"; // internships / research / competitions finder (future, data-backed)

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
  applicationWriting: {
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    description:
      "Communication feedback on activity descriptions and Additional Information",
  },
  activitiesAnalysis: {
    model: "openai/gpt-4o-mini",
    temperature: 0.4,
    description:
      "Analyzes existing activities (strength, field alignment, continue/deepen verdicts) and generates realistic, timeline-aware activity recommendations",
  },
  // Coursework workspace — interprets what the student's academic path
  // communicates (rigor, major preparation, gaps vs. opportunities). Iterative
  // like Activities (re-run as courses/availability change), so the same cheap
  // Gemini default applies; this is a PROFILE-ANALYSIS feature and never feeds
  // the AppGap Score or chancing engine.
  courseworkAnalysis: {
    model: "openai/gpt-4o-mini",
    temperature: 0.3,
    description:
      "Interprets a student's coursework — academic rigor, major/field preparation, and genuine gaps vs. opportunities vs. unavailable courses — as a profile-analysis feature (never a score)",
  },
  // Personal Statement — the Gemini-tier coaching operations (brainstorm, topic,
  // draft, revision). The per-tier model actually used comes from FEATURE_ACCESS
  // (Pro = google/gemini-2.5-pro); this default + temperature are read by the
  // engine modules. Brainstorming leans slightly warmer for generative range,
  // but the prompt keeps it grounded (no inventing the student's life).
  personalStatementCoach: {
    model: "google/gemini-2.5-pro",
    temperature: 0.7,
    description:
      "Personal Statement coaching — brainstorming, topic analysis, draft feedback, and revision guidance (coaches, never authors)",
  },
  // The expensive, nuance-heavy Personal Statement operations (sentence-level
  // line-by-line feedback + the graded evaluation). Opus 5 via the gateway; the
  // per-tier model still comes from FEATURE_ACCESS. Temperature 0 — the graded
  // evaluation produces a 0–100 score, so it must be as deterministic as the
  // model allows: the same essay should not drift run-to-run. (Seed is not set;
  // Anthropic models via the gateway do not honor it. Line-by-line shares this
  // config and is likewise deterministic, which only makes its marks steadier.)
  personalStatementDeepCoach: {
    model: "anthropic/claude-opus-5",
    temperature: 0,
    description:
      "Personal Statement deep coaching — line-by-line feedback and graded evaluation (Opus)",
  },
  // GapCoach live chat while writing. Gemini (cheap, conversational); metered
  // per message under its OWN allowance so it never eats the Opus caps.
  personalStatementChat: {
    model: "google/gemini-2.5-pro",
    temperature: 0.6,
    description:
      "GapCoach live chat — answers a student's questions while they write (coaches, never authors)",
  },
  // Supplemental Essays — the Gemini-tier operations. The prompt-first PARSE
  // (archetypes, directives, constraints), the application-level REDUNDANCY /
  // value-add diagnostic, and revision guidance. Low temperature: the parse and
  // redundancy pass are analytic, not generative — they extract structure and
  // compare documents, so drift is undesirable. Per-tier model comes from
  // FEATURE_ACCESS (Pro = gemini-2.5-pro).
  supplementalCoach: {
    // Routine coaching (parse / redundancy / revision guidance) runs on the
    // cheap Gemini Flash tier to keep per-user cost well under budget; the
    // expensive Opus tier is reserved for supplementalDeepCoach only.
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    description:
      "Supplemental Essays coaching — prompt parsing, application-level redundancy/value-add, and revision guidance (coaches, never authors)",
  },
  // The expensive, nuance-heavy Supplemental Essays operations: the graded
  // evaluation (produces a 0–100 score, so temperature 0 for run-to-run
  // stability) and sentence-level line-by-line feedback. Opus 5 via the gateway;
  // per-tier model still comes from FEATURE_ACCESS. Mirrors
  // personalStatementDeepCoach exactly.
  supplementalDeepCoach: {
    model: "anthropic/claude-opus-5",
    temperature: 0,
    description:
      "Supplemental Essays deep coaching — graded evaluation and line-by-line feedback (Opus)",
  },
  // GapCoach live chat while writing a supplement. Gemini (cheap, conversational);
  // metered per message under its OWN allowance so it never eats the Opus caps.
  supplementalChat: {
    // GapCoach chat is conversational/routine → cheap Flash tier.
    model: "google/gemini-2.5-flash",
    temperature: 0.6,
    description:
      "Supplemental Essays GapCoach live chat — answers a student's questions while they write (coaches, never authors)",
  },
  // Awards → Recognition Map. Reads the student's awards + activities + a
  // deterministic recognition profile (themes, coverage, gaps, connected
  // evidence — all computed in code) and INTERPRETS it: what the recognition
  // collectively demonstrates, where the recognition gaps are, and a compact
  // per-award "why this matters". Analytic, not generative → low temperature.
  // Cheap Flash tier; cached one row per user (opening the page never calls AI).
  awardsRecognition: {
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    description:
      "Awards Recognition Map — interprets what a student's collection of awards collectively demonstrates, the recognition/evidence gaps, and a compact per-award analysis (coaches, never invents awards or results)",
  },
  // Awards → "Test an Opportunity". A short, practical assessment of whether a
  // pasted competition/program/fellowship is worth pursuing given the student's
  // current recognition profile and timing. Deliberately concise; Flash tier.
  opportunityExperiment: {
    model: "google/gemini-2.5-flash",
    temperature: 0.3,
    description:
      "Awards 'Test an Opportunity' — a concise, practical read on whether pursuing a specific opportunity adds application value given the student's profile, gaps, and timing (never an admissions prediction)",
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
  // Activity descriptions + Additional Information writing help. Enforced in the
  // application-writing route (metered like the other AI features) — Free 1/week,
  // Pro a bounded 50/month allowance to cap worst-case AI spend.
  applicationWriting: {
    free: {
      enabled: true,
      limit: 1,
      window: "week",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 50,
      window: "month",
      // Routine, iterative writing feedback → Flash (cost control; see the
      // whole-app AI budget note at the top of FEATURE_ACCESS).
      model: "google/gemini-2.5-flash",
    },
  },
  // Activities workspace analysis + recommendations. Iterative like Application
  // Writing (a student re-runs it as their activities change), so the Free
  // allowance is a weekly refresh rather than a one-shot lifetime cap, and Pro
  // gets a bounded monthly allowance. Tune here to control AI cost.
  activitiesAnalysis: {
    free: {
      enabled: true,
      limit: 1,
      window: "week",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 30,
      window: "month",
      // Iterative profile-analysis feature → Flash (cost control).
      model: "google/gemini-2.5-flash",
    },
  },
  // Coursework workspace analysis. Available the same general way as the other My
  // Profile core features (Activities): Free gets a weekly refresh, Pro a bounded
  // monthly allowance — both counted from the append-only feature_usage ledger.
  courseworkAnalysis: {
    free: {
      enabled: true,
      limit: 1,
      window: "week",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 30,
      window: "month",
      // Iterative profile-analysis feature → Flash (cost control).
      model: "google/gemini-2.5-flash",
    },
  },
  // Personal Statement — Pro-only. Split into two ledgers to keep AI cost under a
  // hard ceiling (target: ≤ $1.50/user/month at expected usage):
  //   personalStatementCoach     → the cheaper Gemini operations (brainstorm,
  //                                topic, draft analysis, revision, mechanical
  //                                checks). Generous monthly allowance.
  //   personalStatementDeepCoach → the expensive Opus operations (line-by-line
  //                                feedback + graded evaluation). Tighter cap so
  //                                even worst-case spend stays under budget.
  // Enforcement is wired in Phase 2; the entitlement/gating for the workspace
  // itself reads `personalStatementCoach.enabled` (false for Free → upgrade CTA).
  personalStatementCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 20,
      window: "month",
      model: "google/gemini-2.5-pro",
    },
  },
  // NOTE: confirm the exact AI-gateway model ID for Opus 5 before wiring Phase 2
  // (Vercel AI Gateway exposes Anthropic models as "anthropic/…"; if Opus 5 is
  // not yet listed, "anthropic/claude-sonnet-5" / "anthropic/claude-opus-4.8"
  // are the fallbacks). Not called anywhere yet.
  personalStatementDeepCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 8,
      window: "month",
      model: "anthropic/claude-opus-5",
    },
  },
  // GapCoach live chat — Pro-only, its own bounded monthly message allowance
  // (each message = one use) so conversational usage never touches the Gemini
  // coaching cap or the Opus deep-coach cap. Gemini keeps per-message cost tiny.
  personalStatementChat: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 40,
      window: "month",
      // GapCoach chat is conversational/routine → Flash (cost control).
      model: "google/gemini-2.5-flash",
    },
  },
  // Supplemental Essays — Pro-only, split into three ledgers to bound AI cost the
  // same way Personal Statement is (Gemini for the cheap/frequent ops, Opus for
  // the expensive graded/line-by-line ops on a tighter cap):
  //   supplementalCoach     → prompt parse (cached per prompt) + application-level
  //                           redundancy/value-add + revision guidance. Gemini.
  //   supplementalDeepCoach → graded evaluation + line-by-line (shared). Opus.
  //                           Tightest cap — the cost driver. A student with many
  //                           colleges prioritizes which essays to deep-grade.
  //   supplementalChat      → GapCoach chat (1 message = 1 use). Gemini, its own
  //                           ledger so conversation never touches the Opus cap.
  // The workspace gate reads supplementalCoach.enabled (false for Free → upgrade
  // CTA). Tune these numbers here to control cost.
  supplementalCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 60,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
  },
  supplementalDeepCoach: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      // Opus deep grade + line-by-line is the single most expensive op; cap at
      // 15/mo so the whole-app worst case stays under the $7/user/month budget.
      enabled: true,
      limit: 15,
      window: "month",
      model: "anthropic/claude-opus-5",
    },
  },
  supplementalChat: {
    free: { enabled: false, limit: 0, window: null },
    pro: {
      enabled: true,
      limit: 120,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
  },
  // Awards → Recognition Map. A My Profile core analysis feature (cheap Flash).
  // Free = 5/month; Pro = 25/month. The two Awards AI features (this +
  // opportunityExperiment) are sized so a Pro user maxing BOTH costs ≈ $0.25/mo
  // combined at observed Flash usage (recognition ≈ $0.0051/call → 25 ≈ $0.13;
  // experiment ≈ $0.0047/call → 25 ≈ $0.12; total ≈ $0.245). That keeps Awards
  // within a $0.25 Pro allocation → ~$7.25/user/mo across ALL AppGap features.
  // Adding/editing awards is always free (profile data); only AI is metered.
  awardsRecognition: {
    free: {
      enabled: true,
      limit: 5,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 25,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
  },
  // Awards → "Test an Opportunity". Per-use metered (each test = one use). Small,
  // concise Flash calls. Free = 5/month; Pro = 25/month. Sized with
  // awardsRecognition so both Awards features together stay within the ≈ $0.25/mo
  // Pro allocation (see the note above) → ~$7.25/user/mo for all features.
  opportunityExperiment: {
    free: {
      enabled: true,
      limit: 5,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
    pro: {
      enabled: true,
      limit: 25,
      window: "month",
      model: "google/gemini-2.5-flash",
    },
  },
  opportunityFinder: {
    free: { enabled: false, limit: 0, window: null },
    // NOT IMPLEMENTED yet (no AI_FEATURES entry, no route calls it). Kept disabled
    // so it cannot silently break the whole-app ≤ $7/user/month AI budget before it
    // ships: at 100/mo on gemini-2.5-pro it would add ~$2.4/mo (total ~$9.3). When
    // this feature is built, re-enable it with a cap costed against the budget.
    pro: { enabled: false, limit: 0, window: null },
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
