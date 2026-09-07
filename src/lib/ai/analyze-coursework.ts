import { generateText } from "ai";
import type { CourseworkProfile } from "~/lib/coursework/types";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import {
  buildCourseworkPrompt,
  COURSEWORK_SYSTEM_PROMPT,
} from "./coursework-prompt";
import {
  type CourseworkAnalysis,
  courseworkAnalysisSchema,
} from "./coursework-schema";
import type { FullProfile } from "./prompt";

// Coursework workspace analysis. Mirrors analyze-activities exactly: the same
// generateText → strip fences → JSON.parse → zod validate pipeline, with the
// coursework schema/prompt and no scoring step. There is deliberately no overall
// numeric "coursework score" — this is a profile-analysis feature and never feeds
// the AppGap Score or chancing engine. The deterministic CourseworkProfile is
// passed in (the caller computes it once and also renders it), so the model only
// interprets what the engine already classified.

export async function analyzeCoursework(
  profile: FullProfile,
  cw: CourseworkProfile,
  modelOverride?: string,
): Promise<{
  analysis: CourseworkAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.courseworkAnalysis;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: COURSEWORK_SYSTEM_PROMPT,
    prompt: buildCourseworkPrompt(profile, cw),
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

  const analysis = courseworkAnalysisSchema.parse(raw);

  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Coursework analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
