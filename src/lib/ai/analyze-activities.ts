import { generateText } from "ai";
import {
  ACTIVITIES_SYSTEM_PROMPT,
  buildActivitiesPrompt,
} from "./activities-prompt";
import {
  type ActivitiesAnalysis,
  activitiesAnalysisSchema,
} from "./activities-schema";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import type { FullProfile } from "./prompt";

// Activities workspace analysis. Mirrors analyze-writing.ts exactly: the same
// generateText → strip fences → JSON.parse → zod validate pipeline, with the
// activities schema/prompt and no scoring step. There is deliberately no
// "overall activity score" — this feature reports qualitative bands, not an
// admissions number.

export async function analyzeActivities(
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  analysis: ActivitiesAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.activitiesAnalysis;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: ACTIVITIES_SYSTEM_PROMPT,
    prompt: buildActivitiesPrompt(profile),
    temperature,
  });

  const { text, usage } = result;

  // Strip markdown code fences if the model wraps output.
  const clean = text.replace(/^```(?:json)?\s*\n?|\s*```\s*$/g, "").trim();

  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch {
    throw new Error(
      `AI returned non-JSON response. Preview: ${clean.slice(0, 300)}`,
    );
  }

  const analysis = activitiesAnalysisSchema.parse(raw);

  // AI SDK v7 renamed tokens: inputTokens/outputTokens (previously promptTokens/completionTokens)
  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Activities analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
