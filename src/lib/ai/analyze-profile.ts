import { generateText } from "ai";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import { buildProfilePrompt, type FullProfile, SYSTEM_PROMPT } from "./prompt";
import { type Analysis, analysisSchema } from "./schema";
import {
  computeComponentScore,
  computeOverallScore,
  extractCategoryScores,
  extractComponentScores,
} from "./score";

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

  // Overall AppGap score is computed deterministically — never the model's
  // free-hand number. V2: the weighted average of the three application-component
  // scores (Academics 35 / Activities 45 / Awards 20). Fall back to the legacy
  // six-category composite (for older response shapes), then to the model's own
  // gapScore, rather than failing the request.
  const componentScores = extractComponentScores(analysis.componentScores);
  if (componentScores) {
    analysis.gapScore = computeComponentScore(componentScores);
  } else {
    const categoryScores = extractCategoryScores(analysis.applicationNarrative);
    if (categoryScores) {
      const { score } = computeOverallScore(categoryScores, {
        activityCount: profile.activities.length,
      });
      analysis.gapScore = score;
    } else {
      console.warn(
        "[AI] No component or category scores in analysis — using model gapScore as fallback",
      );
    }
  }

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
