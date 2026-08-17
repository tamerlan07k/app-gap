import { analyzeActivities } from "~/lib/ai/analyze-activities";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Activities workspace analysis endpoint. Copies the analyze-profile 7-step flow
// exactly (auth → admin load → reconcile+resolve entitlement → feature allowance
// check [503 on error, 429 on limit] → generate → record usage FIRST → cache →
// event). Metered under the "activitiesAnalysis" feature: Free gets a weekly
// refresh, Pro a bounded monthly allowance — both defined in FEATURE_ACCESS and
// counted from the append-only feature_usage ledger.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const loaded = await loadFullProfile(admin, user.id);
  if (!loaded) {
    return Response.json(
      {
        error:
          "Profile not found. Please complete your profile setup before analyzing your activities.",
      },
      { status: 400 },
    );
  }

  const { profileRow, profile } = loaded;

  // Effective tier: reconcile a lapsed admin override, then resolve with
  // priority active-override > Stripe > free.
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  // Feature-based access check BEFORE any AI request.
  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "activitiesAnalysis",
      tier,
    );
  } catch (err) {
    // Fail closed: if we can't verify usage we must NOT allow a free generation.
    console.error(
      "[API] Failed to verify entitlement usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your plan usage. Please try again." },
      { status: 503 },
    );
  }
  if (!allowance.allowed) {
    const error =
      tier === "free"
        ? "You've used your Activities analysis for this week. It refreshes in a few days, or upgrade to Pro for more."
        : "You've reached your Activities analysis limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { analysis, promptTokens, completionTokens } =
      await analyzeActivities(profile, model);

    // Record the consumed use in the append-only ledger FIRST — authoritative,
    // decoupled from the cached row below.
    await recordFeatureUsage(admin, user.id, "activitiesAnalysis", tier);

    // Cache the result as the user's single latest analysis (upsert on user_id;
    // one row per user — see migration 20260817120000). Non-fatal on failure.
    const { data: insertData, error: insertError } = await admin
      .from("activity_analyses")
      .upsert(
        {
          user_id: user.id,
          analysis,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (insertError) {
      console.error(
        "[API] Failed to store activities analysis:",
        insertError.message,
      );
    }

    // Best-effort activity-ledger event; never blocks the response.
    await recordEvent(
      admin,
      user.id,
      "activities_analyzed",
      "Activities analyzed",
      { recommendations: analysis.recommendations.length },
    );

    return Response.json({
      success: true,
      analysis,
      id: (insertData as { id: string } | null)?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] analyze-activities error:", message);
    return Response.json(
      { error: "Failed to analyze your activities. Please try again." },
      { status: 500 },
    );
  }
}
