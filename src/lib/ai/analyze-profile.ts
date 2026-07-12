import { generateText } from "ai";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import { buildProfilePrompt, type FullProfile, SYSTEM_PROMPT } from "./prompt";
import { type Analysis, analysisSchema } from "./schema";

export type { FullProfile };

export async function analyzeProfile(
  profile: FullProfile,
  modelOverride?: string,
  systemPromptOverride?: string,
): Promise<{
  analysis: Analysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.profileAnalysis;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: systemPromptOverride ?? SYSTEM_PROMPT,
    prompt: buildProfilePrompt(profile),
    temperature,
  });

  const { text, usage } = result;

  // Strip markdown code fences if the model wraps output
  const clean = text.replace(/^```(?:json)?\s*\n?|\s*```\s*$/g, "").trim();

  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch {
    throw new Error(
      `AI returned non-JSON response. Preview: ${clean.slice(0, 300)}`,
    );
  }

  const analysis = analysisSchema.parse(raw);

  // AI SDK v7 renamed tokens: inputTokens/outputTokens (previously promptTokens/completionTokens)
  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Profile analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
