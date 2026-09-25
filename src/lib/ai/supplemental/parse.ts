import { generateText } from "ai";
import {
  ARCHETYPE_DESCRIPTIONS,
  ARCHETYPES,
} from "~/lib/supplemental/archetypes";
import { type PromptParse, parseSchema } from "~/lib/supplemental/schemas";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import { SUPPLEMENT_COACH_BOUNDARIES } from "./boundaries";

// The prompt-first parser — the heart of the "works even for novel prompts"
// design. It reads the ACTUAL prompt (never a fixed list of known prompts) and
// extracts: core purpose, archetype(s), every explicit directive, constraints,
// word limit, what the prompt is trying to learn, and a plain-language "what this
// is really asking". Its output drives the dynamic rubric weighting and the
// directive-coverage grading downstream. Runs on the cheap Gemini tier.

const ARCHETYPE_BLOCK = ARCHETYPES.map(
  (a) => `- "${a}": ${ARCHETYPE_DESCRIPTIONS[a]}`,
).join("\n");

const SYSTEM_PROMPT = `You are AppGap's supplemental-essay prompt analyst. Given the EXACT text of a college's supplemental prompt, you break it down so a student understands precisely what it is asking. You never assume it matches a "known" prompt — you read what is actually written, including unusual, hybrid, or brand-new questions.

${SUPPLEMENT_COACH_BOUNDARIES}

## What to produce
1. corePurpose — the core intent: what this prompt is really trying to get the student to do.
2. plainLanguageAsk — "what this prompt is really asking", in simple, friendly language a nervous student can grasp in one read.
3. primaryArchetype — the single best-fit archetype from the list below.
4. secondaryArchetypes — 0–3 additional archetypes when several genuinely apply. Do NOT force a prompt into extra categories; only add one when a real, distinct element is present (e.g. a "why this major" prompt that also asks about intellectual curiosity).
5. directives — EVERY explicit directive or sub-question the prompt asks, each as its own concrete, answerable item. If a prompt asks three things, list three. This is the coverage checklist the essay will be graded against, so be precise and complete, and split compound asks ("what and why") into separate directives when they are genuinely separate.
6. constraints — required format or explicit constraints (e.g. "respond in a list", "one paragraph", "do not repeat your Common App essay"). Empty if none.
7. wordLimit — the stated word limit as a number, or null if the prompt states none. (A separate detected value may be supplied to you; trust the prompt text itself.)
8. whatItReveals — what the prompt appears designed to learn about the applicant.
9. thingsToAnswer — the actual things the student needs to answer to do this well, including implicit ones a strong response would cover (this is guidance, broader than the explicit directives).

## The archetypes
${ARCHETYPE_BLOCK}

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "corePurpose": string,
  "plainLanguageAsk": string,
  "primaryArchetype": string,
  "secondaryArchetypes": [string],
  "directives": [string],
  "constraints": [string],
  "wordLimit": number|null,
  "whatItReveals": string,
  "thingsToAnswer": [string]
}
Archetype values must be exactly from the list above.`;

function buildPrompt(
  promptText: string,
  detectedWordLimit: number | null,
): string {
  const lines: string[] = [];
  lines.push("# The supplemental prompt to analyze");
  lines.push('"""');
  lines.push(promptText.trim() || "(no prompt text provided)");
  lines.push('"""');
  lines.push("");
  if (detectedWordLimit != null) {
    lines.push(
      `# A word limit of ${detectedWordLimit} was detected in the text (confirm against the prompt; use null if the prompt states none).`,
    );
    lines.push("");
  }
  lines.push(
    "Analyze the prompt and respond with ONLY the JSON described in your instructions.",
  );
  return lines.join("\n");
}

export async function generatePromptParse(
  promptText: string,
  detectedWordLimit: number | null,
  modelOverride?: string,
): Promise<{
  parse: PromptParse;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.supplementalCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(promptText, detectedWordLimit),
    temperature,
  });

  const clean = result.text
    .replace(/^```(?:json)?\s*\n?|\s*```\s*$/g, "")
    .trim();

  let raw: unknown;
  try {
    raw = JSON.parse(clean);
  } catch {
    throw new Error(
      `AI returned non-JSON response. Preview: ${clean.slice(0, 300)}`,
    );
  }

  const parse = parseSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Supplemental parse — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `archetype: ${parse.primaryArchetype}, directives: ${parse.directives.length}`,
  );

  return { parse, promptTokens, completionTokens };
}
