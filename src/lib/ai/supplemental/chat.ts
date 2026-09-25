import { generateText } from "ai";
import { CHAT_HISTORY_TURNS, type ChatMessage } from "~/lib/supplemental/chat";
import { DIMENSIONS } from "~/lib/supplemental/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import { SUPPLEMENT_COACH_BOUNDARIES } from "./boundaries";

// GapCoach live chat for a supplemental essay — a conversational coach the student
// talks to WHILE writing. It sees the prompt, their current draft, and the
// VERIFIED college information, and it answers questions, but it never writes the
// essay for them and never invents college facts. Plain-text replies (no JSON).
// Gemini, cheap, metered per message.

const FRAMEWORK = DIMENSIONS.map((d) => d.label).join(", ");

export type ChatContext = {
  content: string;
  promptText: string;
  collegeName: string;
  /** Verified, citable college resources (see verified-data loader). */
  verifiedCollege: string | null;
};

function buildSystem(ctx: ChatContext): string {
  const draft = ctx.content.trim();
  return `You are GapCoach, AppGap's supplemental-essay coach, chatting with a student in real time while they write a supplemental essay for ${ctx.collegeName || "a college"}. You're warm, direct, and concrete — like a favorite teacher leaning over their shoulder.

${SUPPLEMENT_COACH_BOUNDARIES}

## How you chat
- Keep replies SHORT — usually 2–5 sentences. This is a conversation, not an essay of your own.
- Be Socratic: ask a sharp question, point to a specific spot in their draft, or give a concrete direction — then let them write.
- You may reference their current draft (below) and quote a short phrase from it, but NEVER write or rewrite sentences for them.
- If they ask you to "write it" or "fix this paragraph", gently redirect: offer what to think about or a question to answer, and let them do the writing.
- When useful, connect your advice to how the essay is evaluated: ${FRAMEWORK}.
- If they ask for college-specific ideas (courses, programs, opportunities), you may ONLY point to resources in the VERIFIED college information below, and frame them around the student's own interest ("that connects to X — what about it lets you continue the question you started with?"). If the verified information doesn't cover what they need, say you can't verify a specific resource rather than naming one. Never invent a course code, professor, or program.
- No admissions promises, no "this will get you in", no guarantees.
- Formatting: plain, conversational text. If you emphasize a word or phrase, use Markdown bold with double asterisks (**like this**) — never single asterisks or underscores. Use a simple "- " hyphen for any short list. Keep formatting minimal.

## The prompt they're answering
${ctx.promptText || "(no prompt provided yet)"}

## Verified college information (the ONLY college resources you may name)
${ctx.verifiedCollege?.trim() || "(no verified college resources available — do not name specific courses, professors, labs, or programs)"}

## Their current draft
${draft ? `"""\n${draft}\n"""` : "(the draft is currently empty)"}`;
}

export async function generateChatReply(
  history: ChatMessage[],
  userMessage: string,
  ctx: ChatContext,
  modelOverride?: string,
): Promise<{ reply: string; promptTokens: number; completionTokens: number }> {
  const { model: defaultModel, temperature } = AI_FEATURES.supplementalChat;
  const model = modelOverride ?? defaultModel;

  const recent = history.slice(-CHAT_HISTORY_TURNS).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const result = await generateText({
    model: gateway(model),
    system: buildSystem(ctx),
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
    `[AI] Supplemental chat — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { reply, promptTokens, completionTokens };
}
