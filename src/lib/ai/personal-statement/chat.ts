import { generateText } from "ai";
import {
  CHAT_HISTORY_TURNS,
  type ChatMessage,
} from "~/lib/personal-statement/chat";
import { SCORE_CATEGORIES } from "~/lib/personal-statement/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";

// GapCoach live chat — a conversational coach the student talks to WHILE writing.
// It can see their current draft and the prompt, and it answers questions, but it
// never writes the essay for them. Plain-text replies (no JSON). Gemini, cheap,
// metered per message. Kept short and Socratic on purpose.

const FRAMEWORK = SCORE_CATEGORIES.map((c) => c.label).join(", ");

function buildSystem(
  draftContent: string,
  promptText: string,
  profile: FullProfile,
): string {
  const field =
    profile.specificMajor || profile.majorCategory || profile.careerInterest;
  const draft = draftContent.trim();
  return `You are GapCoach, AppGap's personal-statement writing coach, chatting with a student in real time while they write their Common App essay. You're warm, direct, and concrete — like a favorite teacher leaning over their shoulder.

${COACH_BOUNDARIES}

## How you chat
- Keep replies SHORT — usually 2–5 sentences. This is a conversation, not an essay of your own.
- Be Socratic: ask a sharp question, point to a specific spot, or give a concrete direction — then let them write.
- You may reference their current draft (below) and quote a short phrase from it, but NEVER write or rewrite sentences for them, and never hand them paste-ready prose.
- If they ask you to "write it" or "fix this paragraph", gently redirect: offer what to think about or a question to answer, and let them do the writing.
- When useful, connect your advice to the way the essay is scored: ${FRAMEWORK} (creativity means a fresh perspective or way of telling — never fancy vocabulary).
- If the draft is empty or you lack the detail to answer, ask them for the specific thing you need rather than inventing it.
- No admissions promises, no "this will get you in", no guarantees.

## The prompt they're answering
${promptText || "(no prompt selected yet)"}

## Their intended field
${field || "undecided"}

## Their current draft
${draft ? `"""\n${draft}\n"""` : "(the draft is currently empty)"}`;
}

export async function generateChatReply(
  history: ChatMessage[],
  userMessage: string,
  ctx: { draftContent: string; promptText: string; profile: FullProfile },
  modelOverride?: string,
): Promise<{ reply: string; promptTokens: number; completionTokens: number }> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.personalStatementChat;
  const model = modelOverride ?? defaultModel;

  // Only send the most recent turns to keep token cost bounded.
  const recent = history.slice(-CHAT_HISTORY_TURNS).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await generateText({
    model: gateway(model),
    system: buildSystem(ctx.draftContent, ctx.promptText, ctx.profile),
    messages: [...recent, { role: "user", content: userMessage }],
    temperature,
  });

  const reply = result.text.trim();

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] GapCoach chat — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { reply, promptTokens, completionTokens };
}
