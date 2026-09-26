import { generateText } from "ai";
import type { AwardRecord, RecognitionProfile } from "~/lib/awards/types";
import { AWARDS_SYSTEM_PROMPT, buildAwardsPrompt } from "./awards-prompt";
import {
  type RecognitionAnalysis,
  recognitionAnalysisSchema,
} from "./awards-schema";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import type { FullProfile } from "./prompt";

// Awards → Recognition Map interpretation. Mirrors analyze-coursework exactly: the
// same generateText → strip fences → JSON.parse → zod validate pipeline, with the
// awards schema/prompt and NO scoring step (this never feeds the AppGap Score or
// chancing). The deterministic RecognitionProfile is passed in so the model only
// interprets what the engine already classified.

export async function analyzeAwards(input: {
  profile: FullProfile;
  awards: AwardRecord[];
  recognition: RecognitionProfile;
  modelOverride?: string;
}): Promise<{
  analysis: RecognitionAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { profile, awards, recognition, modelOverride } = input;
  const { model: defaultModel, temperature } = AI_FEATURES.awardsRecognition;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: AWARDS_SYSTEM_PROMPT,
    prompt: buildAwardsPrompt({ profile, awards, recognition }),
    temperature,
  });

  const { text, usage } = result;
  const clean = text.replace(/^```(?:json)?\s*\n?|\s*```\s*$/g, "").trim();

  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch {
    throw new Error(
      `AI returned non-JSON response. Preview: ${clean.slice(0, 300)}`,
    );
  }

  const analysis = recognitionAnalysisSchema.parse(raw);

  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Awards recognition analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
