import { analyzeProfile } from "~/lib/ai/analyze-profile";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { PRO_SYSTEM_PROMPT } from "~/lib/ai/prompt";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { loadFullProfile } from "~/lib/profile-full";
import {
  billingMonthEnd,
  countGenerationsThisMonth,
} from "~/lib/roadmap-usage";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export async function POST() {
  // Verify the session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load the full profile using the admin client (service role bypasses RLS
  // and is more reliable for loading across all tables in one shot)
  const admin = createAdminClient();

  const loaded = await loadFullProfile(admin, user.id);

  if (!loaded) {
    return Response.json(
      {
        error:
          "Profile not found. Please complete your profile setup before generating an analysis.",
      },
      { status: 400 },
    );
  }

  const { profileRow, profile } = loaded;

  // Enforce generation limits based on the *effective* subscription tier.
  // Reconcile any lapsed admin override first, then resolve entitlement with
  // priority: active admin override > Stripe > free. An expired override is
  // treated as inactive by the resolver even before reconciliation writes land.
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // Count generations from the append-only usage ledger — NOT from ai_analyses —
  // so deleting a saved roadmap can never restore a user's monthly allowance.
  // Both tiers use the same calendar-month window (resets on the 1st).
  let used: number;
  try {
    used = await countGenerationsThisMonth(admin, user.id);
  } catch (err) {
    // Fail closed: if we can't verify usage we must NOT allow a free generation.
    console.error(
      "[API] Failed to verify generation usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your generation limit. Please try again." },
      { status: 503 },
    );
  }
  if (used >= tierConfig.generationsPerMonth) {
    const resets = billingMonthEnd().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const error =
      tier === "free"
        ? `You've used your 1 free roadmap generation this month. Your next generation will be available on ${resets}. Upgrade to Pro for 4 generations per month.`
        : `You've used all ${tierConfig.generationsPerMonth} roadmap generations for this month. Your limit resets on ${resets}.`;
    return Response.json({ error }, { status: 429 });
  }

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeProfile(
      profile,
      tierConfig.model,
      tier === "pro" ? PRO_SYSTEM_PROMPT : undefined,
    );

    // Record the consumed generation in the usage ledger FIRST. This is the
    // authoritative monthly-limit record and is intentionally decoupled from the
    // ai_analyses row: even if the analysis insert below fails, or the user later
    // deletes the saved roadmap, this generation still counts against the month.
    const { error: usageError } = await admin
      .from("roadmap_generations")
      .insert({ user_id: user.id, tier });

    if (usageError) {
      console.error(
        "[API] Failed to record generation usage:",
        usageError.message,
      );
    }

    // Persist the analysis; errors here are non-fatal — we return the result either way
    const { data: insertData, error: insertError } = await admin
      .from("ai_analyses")
      .insert({
        user_id: user.id,
        analysis,
        model: tierConfig.model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[API] Failed to store analysis:", insertError.message);
    }

    return Response.json({
      success: true,
      analysis,
      id: (insertData as { id: string } | null)?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] analyze-profile error:", message);
    return Response.json(
      { error: "Failed to generate analysis. Please try again." },
      { status: 500 },
    );
  }
}
