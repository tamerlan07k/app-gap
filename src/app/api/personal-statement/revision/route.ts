import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { generateRevision } from "~/lib/ai/personal-statement/revision";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { getPrompt, isCustomPrompt } from "~/lib/personal-statement/prompts";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Personal Statement — revision-guidance endpoint. Gemini tier, metered under
// "personalStatementCoach" (20/month, shared with the other Gemini coaching).
// Scoped to one draft; caches per (draft_id, kind="revision").
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let draftId: string | undefined;
  try {
    const body = (await req.json()) as { draftId?: unknown };
    if (typeof body.draftId === "string") draftId = body.draftId;
  } catch {
    // fall through
  }
  if (!draftId) {
    return Response.json({ error: "Missing draft." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: draft } = await admin
    .from("personal_statement_drafts")
    .select("id, content, statement_id")
    .eq("id", draftId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!draft) {
    return Response.json({ error: "Draft not found." }, { status: 404 });
  }
  if (!((draft.content as string) ?? "").trim()) {
    return Response.json(
      { error: "Write a little of your draft first, then plan a revision." },
      { status: 400 },
    );
  }

  const { data: statement } = await admin
    .from("personal_statements")
    .select("prompt_id, custom_prompt")
    .eq("id", draft.statement_id)
    .eq("user_id", user.id)
    .maybeSingle();
  const promptId = (statement?.prompt_id as string) ?? "";
  const promptText = isCustomPrompt(promptId)
    ? ((statement?.custom_prompt as string) ?? "")
    : (getPrompt(promptId)?.text ?? "");

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
      "personalStatementCoach",
      tier,
    );
  } catch (err) {
    console.error(
      "[API] revision: failed to verify usage:",
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

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { revision, promptTokens, completionTokens } = await generateRevision(
      draft.content as string,
      promptText,
      profile,
      model,
    );

    await recordFeatureUsage(admin, user.id, "personalStatementCoach", tier);

    const { error: upsertError } = await admin
      .from("personal_statement_analyses")
      .upsert(
        {
          draft_id: draftId,
          user_id: user.id,
          kind: "revision",
          analysis: revision,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "draft_id,kind" },
      );
    if (upsertError) {
      console.error(
        "[API] revision: failed to store plan:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      user.id,
      "personal_statement_revision",
      "Planned a personal-statement revision",
      { stage: revision.stage },
    );

    return Response.json({ success: true, revision });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] revision error:", message);
    return Response.json(
      { error: "Couldn't build your revision plan. Please try again." },
      { status: 500 },
    );
  }
}
