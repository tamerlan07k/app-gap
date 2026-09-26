import { generateText } from "ai";
import type { RecognitionProfile } from "~/lib/awards/types";
import { gateway } from "./client";
import { AI_FEATURES } from "./config";
import {
  buildOpportunityExperimentPrompt,
  OPPORTUNITY_EXPERIMENT_SYSTEM_PROMPT,
} from "./opportunity-experiment-prompt";
import {
  type OpportunityExperiment,
  opportunityExperimentSchema,
} from "./opportunity-experiment-schema";

// "Test an Opportunity" assessment. Same generateText → strip fences → JSON.parse →
// zod validate pipeline as the other analytic engines. The current date is passed
// in so timing comments are grounded (never hardcoded).

export async function analyzeOpportunity(input: {
  opportunityText: string;
  fieldKey: string;
  recognition: RecognitionProfile;
  gradeLevel: string;
  today: string;
  modelOverride?: string;
}): Promise<{
  assessment: OpportunityExperiment;
  promptTokens: number;
  completionTokens: number;
}> {
  const { modelOverride, ...promptInput } = input;
  const { model: defaultModel, temperature } =
    AI_FEATURES.opportunityExperiment;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: OPPORTUNITY_EXPERIMENT_SYSTEM_PROMPT,
    prompt: buildOpportunityExperimentPrompt(promptInput),
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

  const assessment = opportunityExperimentSchema.parse(raw);

  const u = usage as unknown as { inputTokens?: number; outputTokens?: number };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Opportunity experiment complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `total: ${promptTokens + completionTokens}`,
  );

  return { assessment, promptTokens, completionTokens };
}
