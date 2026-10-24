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

// Re-run the AppGap diagnostic against the user's CURRENT (just-edited) profile.
//
// This is deliberately a thin sibling of /api/analyze-profile: it reuses the exact
// same scoring engine (analyzeProfile → score.ts), so a re-evaluation is never a
// separate or inconsistent scoring system — it is the same diagnostic recomputed
// from the latest saved profile. The ONLY differences from the onboarding route:
//   • it is metered under its own `profileReassessment` allowance so profile edits
//     never exhaust the one-shot `profileAnalysis` allowance (Free = 1 for life);
//   • it always appends a fresh ai_analyses row (preserving score history so the
//     Overview can compare the previous score with the new one);
//   • it does not touch onboarding_completed_at (onboarding is already done).
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
    return Response.json({ error: "Profile not found." }, { status: 400 });
  }

  const { profileRow, profile } = loaded;

  // Effective tier (reconcile a lapsed admin override first, then resolve with the
  // same priority as the diagnostic route).
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(
    profileRow as EntitlementProfile,
    new Date(),
    user.email,
  );
  const tier: TierKey = entitlement.tier;

  // Allowance check BEFORE any AI request — fail closed if we can't verify usage.
  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "profileReassessment",
      tier,
      undefined,
      entitlement.unlimited,
    );
  } catch (err) {
    console.error(
      "[API] Failed to verify reassessment usage:",
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
        ? "You've used all of your profile re-evaluations this month. Upgrade to Pro for more, or try again next month."
        : "You've reached your profile re-evaluation limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const diagnosticModel = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeProfile(
      profile,
      diagnosticModel,
      tier === "pro" ? PRO_SYSTEM_PROMPT : undefined,
    );

    // Record the consumed re-evaluation FIRST (append-only ledger is the
    // authoritative allowance record, decoupled from the ai_analyses row).
    if (!entitlement.unlimited) {
      await recordFeatureUsage(admin, user.id, "profileReassessment", tier);
    }

    // Append a fresh analysis row — never overwrite, so the prior score is still
    // available as history for the Overview's previous-vs-new comparison.
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
      // The analysis row is how the Overview reads the new score, so unlike the
      // onboarding route this persistence is load-bearing: report failure so the
      // UI keeps the last valid score and shows "not yet updated".
      console.error("[API] Failed to store reassessment:", insertError.message);
      return Response.json(
        { error: "Couldn't save the updated score. Please try again." },
        { status: 500 },
      );
    }

    const analysisId = (insertData as { id: string } | null)?.id ?? null;

    await recordEvent(
      admin,
      user.id,
      "analysis_reassessed",
      "AppGap diagnostic re-evaluated after a profile edit",
      { analysisId, score: analysis.gapScore },
    );

    return Response.json({ success: true, analysis, id: analysisId });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] reassess-profile error:", message);
    return Response.json(
      { error: "Failed to update your score. Please try again." },
      { status: 500 },
    );
  }
}
