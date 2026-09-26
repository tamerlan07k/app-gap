import { analyzeOpportunity } from "~/lib/ai/analyze-opportunity";
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

// Awards → "Test an Opportunity" endpoint. Metered per use. Deterministic parts
// (the recognition profile the model reasons against, the current date) are built
// in code; the AI produces only the concise value/timing read. Nothing is cached —
// each test is an ad-hoc query. Not an admissions prediction.

const MAX_INPUT = 1500;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let text = "";
  try {
    const body = (await req.json()) as { text?: unknown };
    if (typeof body.text === "string") text = body.text.trim();
  } catch {
    // fall through to validation
  }
  if (!text) {
    return Response.json(
      { error: "Paste an opportunity to test first." },
      { status: 400 },
    );
  }
  if (text.length > MAX_INPUT) text = text.slice(0, MAX_INPUT);

  const admin = createAdminClient();

  const loaded = await loadFullProfile(admin, user.id);
  if (!loaded) {
    return Response.json(
      { error: "Please complete your profile first." },
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
      "opportunityExperiment",
      tier,
    );
  } catch (err) {
    console.error(
      "[API] opportunity experiment: failed to verify usage:",
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
        ? "You've used all 5 of your opportunity tests for this month. They reset at the start of next month, or upgrade to Pro for more."
        : "You've reached your opportunity-test limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  // Recognition context is AWARDS-only (consistent with the Recognition Map).
  const awards = await loadAwards(admin, user.id);
  const fieldKey = profile.majorCategory || "";
  const recognition = buildRecognitionProfile({
    awards,
    fieldKey: fieldKey || null,
  });

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  try {
    const { assessment } = await analyzeOpportunity({
      opportunityText: text,
      fieldKey,
      recognition,
      gradeLevel: profile.gradeLevel,
      today,
      modelOverride: model,
    });

    await recordFeatureUsage(admin, user.id, "opportunityExperiment", tier);
    await recordEvent(
      admin,
      user.id,
      "opportunity_tested",
      "Opportunity tested",
      { verdict: assessment.verdict },
    );

    return Response.json({ success: true, assessment });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] opportunity experiment error:", message);
    return Response.json(
      { error: "Failed to assess that opportunity. Please try again." },
      { status: 500 },
    );
  }
}
