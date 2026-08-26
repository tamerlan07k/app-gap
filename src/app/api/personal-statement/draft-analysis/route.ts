import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { generateDraftAnalysis } from "~/lib/ai/personal-statement/draft-analysis";
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

// Personal Statement — holistic draft-analysis endpoint. Same metered flow as
// the brainstorm route, but scoped to ONE draft (id in the request body). Reads
// the draft + its prompt + the student's activities (for coherence), returns a
// holistic read, and caches it per (draft_id, kind="draft"). Metered under
// "personalStatementCoach" (Gemini 2.5 Pro, Pro-only, 20/month — shared with the
// other Gemini coaching operations).
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
    // fall through to the missing-id check
  }
  if (!draftId) {
    return Response.json({ error: "Missing draft." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Load the draft (owner-scoped) and its parent statement's prompt.
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
      { error: "Write a little of your draft first, then ask for feedback." },
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
      "[API] draft-analysis: failed to verify usage:",
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
    const { analysis, promptTokens, completionTokens } =
      await generateDraftAnalysis(
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
          kind: "draft",
          analysis,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "draft_id,kind" },
      );
    if (upsertError) {
      console.error(
        "[API] draft-analysis: failed to store analysis:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      user.id,
      "personal_statement_draft_analyzed",
      "Analyzed a personal-statement draft",
      { focusAreas: analysis.focusAreas.length },
    );

    return Response.json({ success: true, analysis });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] draft-analysis error:", message);
    return Response.json(
      { error: "Couldn't analyze your draft. Please try again." },
      { status: 500 },
    );
  }
}
