import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { generateBrainstorm } from "~/lib/ai/personal-statement/brainstorm";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import {
  type BrainstormInputs,
  brainstormInputsSchema,
  EMPTY_BRAINSTORM_INPUTS,
  hasBrainstormContent,
} from "~/lib/personal-statement/brainstorm";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Personal Statement — brainstorming endpoint. Same metered 7-step flow as
// analyze-activities (auth → admin load → reconcile+resolve entitlement →
// feature allowance [503 error / 429 limit / 403 not entitled] → generate →
// record usage FIRST → cache → event). Metered under "personalStatementCoach"
// (Gemini 2.5 Pro, Pro-only, bounded monthly allowance). The student's inputs
// are read from the DB (saved by the client first), not trusted from the body.
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
      { error: "Please complete your profile before brainstorming." },
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
      "personalStatementCoach",
      tier,
    );
  } catch (err) {
    console.error(
      "[API] brainstorm: failed to verify usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your plan usage. Please try again." },
      { status: 503 },
    );
  }
  if (!allowance.enabled) {
    return Response.json(
      { error: "The Personal Statement coach is a Pro feature." },
      { status: 403 },
    );
  }
  if (!allowance.allowed) {
    return Response.json(
      {
        error:
          "You've reached your Personal Statement coaching limit for this month. It resets at the start of next month.",
      },
      { status: 429 },
    );
  }

  // Read the student's saved brainstorm inputs (persisted by the client first).
  const { data: row } = await admin
    .from("personal_statement_brainstorms")
    .select("inputs")
    .eq("user_id", user.id)
    .maybeSingle();

  const parsedInputs = brainstormInputsSchema.safeParse(row?.inputs);
  const inputs: BrainstormInputs = parsedInputs.success
    ? parsedInputs.data
    : EMPTY_BRAINSTORM_INPUTS;

  if (!hasBrainstormContent(inputs)) {
    return Response.json(
      {
        error:
          "Add a little to the exercises first — a few objects, a value, or an answer — then reflect.",
      },
      { status: 400 },
    );
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { insights, promptTokens, completionTokens } =
      await generateBrainstorm(inputs, profile, model);

    // Ledger first — authoritative, decoupled from the cache write below.
    await recordFeatureUsage(admin, user.id, "personalStatementCoach", tier);

    const { error: upsertError } = await admin
      .from("personal_statement_brainstorms")
      .upsert(
        {
          user_id: user.id,
          insights,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    if (upsertError) {
      console.error(
        "[API] brainstorm: failed to store insights:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      user.id,
      "personal_statement_brainstormed",
      "Brainstormed a personal statement",
      { directions: insights.directions.length },
    );

    return Response.json({ success: true, insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] brainstorm error:", message);
    return Response.json(
      { error: "Couldn't reflect on your brainstorming. Please try again." },
      { status: 500 },
    );
  }
}
