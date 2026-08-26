import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { generateChatReply } from "~/lib/ai/personal-statement/chat";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import {
  type ChatMessage,
  chatThreadSchema,
  MAX_CHAT_MESSAGE,
} from "~/lib/personal-statement/chat";
import { getPrompt, isCustomPrompt } from "~/lib/personal-statement/prompts";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// GapCoach live chat endpoint. Metered under "personalStatementChat" (Gemini,
// Pro-only, per-message allowance). Persists the whole thread per statement and
// returns GapCoach's reply. The current draft + prompt are read server-side for
// context — the client only sends the statement id and the new message.
const MAX_STORED = 200;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let statementId: string | undefined;
  let message = "";
  try {
    const body = (await req.json()) as {
      statementId?: unknown;
      message?: unknown;
    };
    if (typeof body.statementId === "string") statementId = body.statementId;
    if (typeof body.message === "string") message = body.message.trim();
  } catch {
    // fall through
  }
  if (!statementId) {
    return Response.json({ error: "Missing statement." }, { status: 400 });
  }
  if (!message) {
    return Response.json({ error: "Type a message first." }, { status: 400 });
  }
  if (message.length > MAX_CHAT_MESSAGE) {
    return Response.json(
      { error: "That message is a bit long — please shorten it." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Confirm the statement is the user's, and grab its prompt.
  const { data: statement } = await admin
    .from("personal_statements")
    .select("id, prompt_id, custom_prompt")
    .eq("id", statementId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!statement) {
    return Response.json({ error: "Statement not found." }, { status: 404 });
  }
  const promptId = (statement.prompt_id as string) ?? "";
  const promptText = isCustomPrompt(promptId)
    ? ((statement.custom_prompt as string) ?? "")
    : (getPrompt(promptId)?.text ?? "");

  // The current (working) draft gives GapCoach context.
  const { data: drafts } = await admin
    .from("personal_statement_drafts")
    .select("content, is_current, sort_order")
    .eq("statement_id", statementId)
    .eq("user_id", user.id)
    .order("sort_order");
  const current = drafts?.find((d) => d.is_current) ?? drafts?.[0] ?? null;
  const draftContent = (current?.content as string) ?? "";

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
      "personalStatementChat",
      tier,
    );
  } catch (err) {
    console.error(
      "[API] chat: failed to verify usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your plan usage. Please try again." },
      { status: 503 },
    );
  }
  if (!allowance.enabled) {
    return Response.json(
      { error: "GapCoach chat is a Pro feature." },
      { status: 403 },
    );
  }
  if (!allowance.allowed) {
    return Response.json(
      {
        error:
          "You've used your GapCoach chat messages for this month. They reset at the start of next month.",
      },
      { status: 429 },
    );
  }

  // Load the existing thread.
  const { data: chatRow } = await admin
    .from("personal_statement_chats")
    .select("messages")
    .eq("statement_id", statementId)
    .maybeSingle();
  const parsedThread = chatThreadSchema.safeParse(chatRow?.messages);
  const history: ChatMessage[] = parsedThread.success ? parsedThread.data : [];

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  try {
    const { reply } = await generateChatReply(
      history,
      message,
      { draftContent, promptText, profile },
      model,
    );

    const now = new Date().toISOString();
    const userMsg: ChatMessage = { role: "user", content: message, at: now };
    const assistantMsg: ChatMessage = {
      role: "assistant",
      content: reply,
      at: now,
    };
    const updated: ChatMessage[] = [...history, userMsg, assistantMsg].slice(
      -MAX_STORED,
    );

    await recordFeatureUsage(admin, user.id, "personalStatementChat", tier);

    const { error: upsertError } = await admin
      .from("personal_statement_chats")
      .upsert(
        {
          statement_id: statementId,
          user_id: user.id,
          messages: updated,
          updated_at: now,
        },
        { onConflict: "statement_id" },
      );
    if (upsertError) {
      console.error("[API] chat: failed to store thread:", upsertError.message);
    }

    await recordEvent(
      admin,
      user.id,
      "personal_statement_chat",
      "Chatted with GapCoach",
      {},
    );

    // Report remaining messages so the UI can nudge before the cap.
    const remaining =
      allowance.limit == null
        ? null
        : Math.max(0, allowance.limit - allowance.used - 1);

    return Response.json({
      success: true,
      reply,
      messages: updated,
      remaining,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] chat error:", msg);
    return Response.json(
      { error: "GapCoach couldn't reply. Please try again." },
      { status: 500 },
    );
  }
}
