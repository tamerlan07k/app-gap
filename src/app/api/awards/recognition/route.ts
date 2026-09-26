import { analyzeAwards } from "~/lib/ai/analyze-awards";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { loadAwards } from "~/lib/awards/db";
import { buildRecognitionProfile } from "~/lib/awards/recognition";
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

// Awards → Recognition Map analysis endpoint. Copies the analyze-coursework flow
// exactly (auth → admin load → reconcile+resolve entitlement → feature allowance
// check [503 on error, 429 on limit] → build DETERMINISTIC recognition profile →
// generate → record usage FIRST → cache → event). The deterministic engine owns
// classification/coverage; the model only interprets. This never touches the
// AppGap Score or chancing — it writes to its own award_recognition_analyses table.

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
          "Profile not found. Please complete your profile setup before analyzing your recognition.",
      },
      { status: 400 },
    );
  }

  const { profileRow, profile } = loaded;

  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "awardsRecognition",
      tier,
    );
  } catch (err) {
    console.error(
      "[API] awards recognition: failed to verify usage:",
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
        ? "You've used all 5 of your Recognition Map analyses for this month. They reset at the start of next month, or upgrade to Pro for more."
        : "You've reached your Recognition Map analysis limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  // Recognition Map assesses AWARDS only (activities have their own section).
  const awards = await loadAwards(admin, user.id);
  const fieldKey = profile.majorCategory || null;

  const recognition = buildRecognitionProfile({ awards, fieldKey });

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeAwards({
      profile,
      awards,
      recognition,
      modelOverride: model,
    });

    // Record the consumed use in the append-only ledger FIRST.
    await recordFeatureUsage(admin, user.id, "awardsRecognition", tier);

    // Cache the interpretation as the user's single latest analysis. Non-fatal.
    const { error: insertError } = await admin
      .from("award_recognition_analyses")
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
      );

    if (insertError) {
      console.error(
        "[API] Failed to store awards recognition analysis:",
        insertError.message,
      );
    }

    await recordEvent(
      admin,
      user.id,
      "awards_analyzed",
      "Recognition analyzed",
      {
        awards: awards.length,
        gaps: recognition.gaps.length,
      },
    );

    return Response.json({ success: true, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] awards recognition error:", message);
    return Response.json(
      { error: "Failed to analyze your recognition. Please try again." },
      { status: 500 },
    );
  }
}
