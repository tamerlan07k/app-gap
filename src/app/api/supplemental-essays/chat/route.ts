import { generateChatReply } from "~/lib/ai/supplemental/chat";
import { recordEvent } from "~/lib/events";
import { recordFeatureUsage } from "~/lib/feature-usage";
import {
  type ChatMessage,
  chatThreadSchema,
  MAX_CHAT_MESSAGE,
  MAX_STORED_MESSAGES,
} from "~/lib/supplemental/chat";
import { authorizeEssayRequest } from "~/lib/supplemental/route-helpers";
import { loadVerifiedCollege } from "~/lib/supplemental/verified-college";

// GapCoach live chat endpoint. Metered under "supplementalChat" (Gemini, Pro-only,
// per-message). Persists the whole thread per essay and returns GapCoach's reply.
// The essay's draft + prompt + verified college info are read server-side; the
// client sends only the essay id and the new message.
export async function POST(req: Request) {
  // Read the message from a CLONE so the original request body stays unread —
  // authorizeEssayRequest clones it again to read essayId.
  let message = "";
  try {
    const body = (await req.clone().json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message.trim();
  } catch {
    // fall through
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

  const auth = await authorizeEssayRequest(req, "supplementalChat");
  if ("response" in auth) return auth.response;
  const { userId, admin, essay, collegeName, fieldKey, tier, model } =
    auth.context;

  const verified = await loadVerifiedCollege(admin, essay.college_id, fieldKey);

  const { data: chatRow } = await admin
    .from("supplemental_essay_chats")
    .select("messages")
    .eq("essay_id", essay.id)
    .maybeSingle();
  const parsedThread = chatThreadSchema.safeParse(chatRow?.messages);
  const history: ChatMessage[] = parsedThread.success ? parsedThread.data : [];

  try {
    const { reply } = await generateChatReply(
      history,
      message,
      {
        content: essay.content,
        promptText: essay.prompt_text,
        collegeName,
        verifiedCollege: verified.block,
      },
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
      -MAX_STORED_MESSAGES,
    );

    await recordFeatureUsage(admin, userId, "supplementalChat", tier);

    const { error: upsertError } = await admin
      .from("supplemental_essay_chats")
      .upsert(
        {
          essay_id: essay.id,
          user_id: userId,
          messages: updated,
          updated_at: now,
        },
        { onConflict: "essay_id" },
      );
    if (upsertError) {
      console.error(
        "[API] supplemental chat: failed to store thread:",
        upsertError.message,
      );
    }

    await recordEvent(
      admin,
      userId,
      "supplemental_chat",
      "Chatted with GapCoach about a supplement",
      {},
    );

    return Response.json({ success: true, reply, messages: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[API] supplemental chat error:", msg);
    return Response.json(
      { error: "GapCoach couldn't reply. Please try again." },
      { status: 500 },
    );
  }
}
