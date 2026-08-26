import { generateText } from "ai";
import { z } from "zod";
import {
  overallScore,
  SCORE_CATEGORIES,
} from "~/lib/personal-statement/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";

// LIGHTWEIGHT onboarding Personal Statement diagnostic — a rough signal only,
// deliberately NOT the full Personal Statement Coach. It reuses the same
// four-category framework (so scores are consistent with the dedicated feature),
// computes the overall as the equal-weight average IN CODE, and returns just an
// overall score + one strength + one opportunity. Runs on Gemini (cheap). Never
// rewrites the student's essay.

const categoryScoreSchema = z.object({
  key: z.enum(["voice", "depth", "storytelling", "creativity"]),
  score: z.number().int().min(0).max(100),
});

const diagnosticSchema = z.object({
  categories: z.array(categoryScoreSchema).min(1).max(4),
  // One short sentence each — the main strength and the biggest opportunity.
  strength: z.string(),
  opportunity: z.string(),
});

export type OnboardingPsDiagnostic = {
  score: number;
  strength: string;
  opportunity: string;
};

const CATEGORY_BLOCK = SCORE_CATEGORIES.map(
  (c) => `- **${c.key}** (${c.label}): ${c.blurb}`,
).join("\n");

const SYSTEM_PROMPT = `You are AppGap giving a QUICK, lightweight diagnostic read of a student's personal statement during onboarding — just a rough signal, not the full coaching experience. Score it, name one main strength, and name the single biggest opportunity to improve. Nothing more.

${COACH_BOUNDARIES}

## Score four equally-weighted categories, each 0–100
${CATEGORY_BLOCK}
For creativity, originality means a fresh perspective or way of telling — NEVER fancy vocabulary or more metaphors; a plain, simply-told story can score very high.

## Calibration (be honest, not inflating)
90–100 exceptional, 80–89 strong, 70–79 solid, 60–69 developing, 45–59 building, below 45 early. Most genuine drafts land in the 60s–70s; reserve 90+ for truly exceptional work.

## Output
- Give the four category scores.
- "strength": ONE short sentence on what's working best.
- "opportunity": ONE short sentence on the biggest thing to improve.
Do NOT rewrite the essay, invent details, or predict admissions outcomes.

Respond with ONLY valid JSON — no markdown, no code fences:
{
  "categories": [{ "key": "voice"|"depth"|"storytelling"|"creativity", "score": number }],
  "strength": string,
  "opportunity": string
}
Include all four categories exactly once.`;

function buildPrompt(text: string, profile: FullProfile): string {
  const field =
    profile.specificMajor || profile.majorCategory || profile.careerInterest;
  return [
    `# The student's personal statement (intended field: ${field || "undecided"})`,
    '"""',
    text.trim(),
    '"""',
    "",
    "Give the quick diagnostic and respond with ONLY the JSON described in your instructions.",
  ].join("\n");
}

export async function generateOnboardingPsDiagnostic(
  text: string,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  diagnostic: OnboardingPsDiagnostic;
  promptTokens: number;
  completionTokens: number;
}> {
  // Always a cheap Gemini-tier model — this is a rough onboarding signal, not the
  // Opus-powered full evaluation.
  const { model: defaultModel, temperature } =
    AI_FEATURES.personalStatementCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(text, profile),
    temperature: Math.min(temperature, 0.4),
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

  const parsed = diagnosticSchema.parse(raw);
  const score = overallScore(parsed.categories);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };

  return {
    diagnostic: {
      score,
      strength: parsed.strength,
      opportunity: parsed.opportunity,
    },
    promptTokens: u.inputTokens ?? 0,
    completionTokens: u.outputTokens ?? 0,
  };
}
