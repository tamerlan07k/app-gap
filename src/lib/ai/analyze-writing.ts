import { generateText } from "ai";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import type { FullProfile } from "./prompt";
import { buildWritingPrompt, WRITING_SYSTEM_PROMPT } from "./writing-prompt";
import { type WritingAnalysis, writingAnalysisSchema } from "./writing-schema";

// Application Writing analysis. Mirrors analyze-profile.ts: same
// generateText → strip fences → JSON.parse → zod validate pipeline, but with the
// writing schema/prompt and no scoring step (this feature never computes a
// gap score).

export async function analyzeWriting(
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  analysis: WritingAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.applicationWriting;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: WRITING_SYSTEM_PROMPT,
    prompt: buildWritingPrompt(profile),
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

  const analysis = writingAnalysisSchema.parse(raw);

  // AI SDK v7 renamed tokens: inputTokens/outputTokens (previously promptTokens/completionTokens)
  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Application Writing analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
