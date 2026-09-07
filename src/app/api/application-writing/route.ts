import { analyzeWriting } from "~/lib/ai/analyze-writing";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Application Writing analysis endpoint. Metered under the "applicationWriting"
// feature (Free 1/week, Pro 50/month — see FEATURE_ACCESS), following the same
// 7-step flow as analyze-activities: auth → admin load → reconcile+resolve
// entitlement → feature allowance check [503 on error, 429 on limit] → generate →
// record usage FIRST → cache. Iterative writing feedback still never consumes a
// roadmap generation — this is its own per-feature ledger.
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
        error: "Profile not found. Please complete your profile setup first.",
      },
      { status: 400 },
    );
  }

  const { profileRow, profile } = loaded;

  // There must be something to review — at least one activity description or an
  // Additional Information response.
  const hasDescriptions = profile.activities.some((a) => a.description?.trim());
  const hasAdditionalInfo = !!profile.additionalContext?.trim();
  if (!hasDescriptions && !hasAdditionalInfo) {
    return Response.json(
      {
        error:
          "Add an activity description or Additional Information response to get writing feedback.",
      },
      { status: 400 },
    );
  }

  // Effective tier: reconcile a lapsed admin override, then resolve with priority
  // active-override > Stripe > free.
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  // Feature-based access check BEFORE any AI request.
  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "applicationWriting",
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
        ? "You've used your Application Writing feedback for this week. It refreshes in a few days, or upgrade to Pro for more."
        : "You've reached your Application Writing limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeWriting(
      profile,
      model,
    );

    // Record the consumed use in the append-only ledger FIRST — authoritative,
    // decoupled from the cached row below.
    await recordFeatureUsage(admin, user.id, "applicationWriting", tier);

    // Cache the result as the user's single latest analysis (upsert in place on
    // user_id — see migration 20260814000000). A failed write is non-fatal; we
    // still return the analysis to the client.
    const { data: insertData, error: insertError } = await admin
      .from("writing_analyses")
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
        "[API] Failed to store writing analysis:",
        insertError.message,
      );
    }

    return Response.json({
      success: true,
      analysis,
      id: (insertData as { id: string } | null)?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] application-writing error:", message);
    return Response.json(
      { error: "Failed to generate writing feedback. Please try again." },
      { status: 500 },
    );
  }
}
