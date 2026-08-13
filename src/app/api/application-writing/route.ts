import { analyzeWriting } from "~/lib/ai/analyze-writing";
import { SUBSCRIPTION_TIERS } from "~/lib/ai/config";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Application Writing analysis endpoint.
//
// Deliberately NOT gated by the monthly roadmap-generation ledger: writing
// feedback is iterative, so refreshing it must never consume a roadmap
// generation. It uses the tier's model (free vs pro) and caches the latest
// result in writing_analyses so the report page doesn't recompute on every load.
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

  // Effective tier selects the model, matching the gap-analysis behavior.
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tierConfig = SUBSCRIPTION_TIERS[entitlement.tier];

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeWriting(
      profile,
      tierConfig.model,
    );

    // Cache the result as the user's single latest analysis (upsert in place on
    // user_id — see migration 20260814000000). A failed write is non-fatal; we
    // still return the analysis to the client.
    const { data: insertData, error: insertError } = await admin
      .from("writing_analyses")
      .upsert(
        {
          user_id: user.id,
          analysis,
          model: tierConfig.model,
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
