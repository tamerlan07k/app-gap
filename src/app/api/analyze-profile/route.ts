import { analyzeProfile } from "~/lib/ai/analyze-profile";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { PRO_SYSTEM_PROMPT } from "~/lib/ai/prompt";
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
  // and is more reliable for loading across all tables in one shot). The shared
  // loader returns the raw profile row alongside the mapped FullProfile so we
  // can resolve entitlement without re-querying.
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

  // Enforce entitlement based on the *effective* subscription tier. Reconcile any
  // lapsed admin override first, then resolve with priority: active admin override
  // > Stripe > free (an expired override is treated as inactive by the resolver).
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  // Feature-based access check BEFORE any AI request. The diagnostic is a lifetime
  // allowance for Free (1) and a bounded monthly allowance for Pro — both defined
  // centrally in FEATURE_ACCESS and counted from the append-only feature_usage
  // ledger, so deleting a saved analysis can never restore an allowance.
  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "profileAnalysis",
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
        ? "You've already used your free AppGap analysis. Upgrade to Pro to generate more."
        : "You've reached your analysis limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  // Model for this diagnostic — FEATURE_ACCESS is the source of truth; fall back to
  // the tier default. Used for the AI call and stored on the analysis for audit.
  const diagnosticModel = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeProfile(
      profile,
      diagnosticModel,
      tier === "pro" ? PRO_SYSTEM_PROMPT : undefined,
    );

    // Record the consumed diagnostic in the append-only feature_usage ledger FIRST.
    // This is the authoritative allowance record, decoupled from the ai_analyses
    // row: even if the analysis insert below fails, or the user later deletes the
    // saved analysis, this use still counts against their allowance.
    await recordFeatureUsage(admin, user.id, "profileAnalysis", tier);

    // Persist the analysis; errors here are non-fatal — we return the result either way
    const { data: insertData, error: insertError } = await admin
      .from("ai_analyses")
      .insert({
        user_id: user.id,
        analysis,
        model: diagnosticModel,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[API] Failed to store analysis:", insertError.message);
    }

    const analysisId = (insertData as { id: string } | null)?.id ?? null;

    // Record a "Jump In" activity event (best-effort; never blocks the response).
    await recordEvent(
      admin,
      user.id,
      "analysis_generated",
      "AppGap Analysis generated",
      { analysisId, score: analysis.gapScore },
    );

    return Response.json({
      success: true,
      analysis,
      id: analysisId,
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
