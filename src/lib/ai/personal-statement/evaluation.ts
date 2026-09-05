import { generateText } from "ai";
import { z } from "zod";
import { SCORE_CATEGORIES } from "~/lib/personal-statement/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";
import { ESSAY_SCORING_LENSES } from "./lenses";

// Graded evaluation engine — scores a draft on the four-category framework
// (Voice & Authenticity, Depth & Reflection, Storytelling & Structure,
// Creativity & Originality), each 0–100. The OVERALL score is computed in code
// as the average of the four (see ~/lib/personal-statement/scoring) — the model
// only produces the four sub-scores + reasons. Runs on Opus. It's a diagnostic,
// never an admissions prediction, and it never rewrites the essay.

// ─── Output contract ─────────────────────────────────────────────────────────

const categorySchema = z.object({
  key: z.enum(["voice", "depth", "storytelling", "creativity"]),
  score: z.number().int().min(0).max(100),
  // One line explaining why this score.
  summary: z.string(),
  strengths: z.array(z.string()).max(3),
  improvements: z.array(z.string()).max(3),
});

export type EvaluationCategory = z.infer<typeof categorySchema>;

export const evaluationSchema = z.object({
  // A short, honest holistic paragraph about the essay overall.
  overview: z.string(),
  // Exactly the four framework categories.
  categories: z.array(categorySchema).min(1).max(4),
});

export type Evaluation = z.infer<typeof evaluationSchema>;

// ─── System prompt ───────────────────────────────────────────────────────────

const CATEGORY_BLOCK = SCORE_CATEGORIES.map(
  (c) => `- **${c.key}** (${c.label}): ${c.blurb}`,
).join("\n");

export const SYSTEM_PROMPT = `You are AppGap's personal-statement evaluator. You score one draft of a Common App personal statement on four equally-weighted categories, each out of 100, and explain each score so the student understands it. You are a diagnostic coach, not an admissions office.

${COACH_BOUNDARIES}

## Scoring vs. feedback — a HARD separation (read first)
Your response has two jobs, and they use different inputs:
- **SCORING** — the four category scores — evaluates the ESSAY TEXT ALONE. Judge the writing purely on its own merits. The student's intended field, activities, and leadership roles (given below the draft) are NOT scoring input. You MUST NOT raise or lower any of the four scores because the essay overlaps with, repeats, matches, or diverges from anything already on the student's application. An essay about an activity the student already lists (e.g. their sport, club, or role) is scored EXACTLY as it would be if that activity were not on the application — never penalized for the overlap.
- **FEEDBACK** — the "overview" and the per-category "improvements" — MAY use the application context. If the essay mostly restates what the application already shows, you SHOULD note it as feedback, e.g. "this adds little beyond what your application already shows — consider revealing a different dimension of the experience." Phrase it as guidance the student can act on. This observation MUST NOT change any of the four scores.

## The four categories (score each 0–100 from the essay text alone)
${CATEGORY_BLOCK}

## Creativity is NOT vocabulary
For "creativity", originality means a fresh perspective, structure, or way of telling the story — a genuinely distinctive angle compared with a typical college essay. It does NOT mean fancy vocabulary, more metaphors, or ornate prose. A plain, simply-told story can earn a very high creativity score if its perspective or approach is genuinely original; an essay stuffed with elaborate language can score LOW if its framing is predictable.

## Calibration (be honest, not inflating)
Score against strong real applicants, not a generous curve:
- 90–100 exceptional; 80–89 strong; 70–79 solid; 60–69 developing; 45–59 building; below 45 early/needs significant work.
Most genuine early drafts land in the 60s–70s. Reserve 90+ for genuinely exceptional work. Do not cluster everything at 80+.

## What each score must include
For every category: the 0–100 score, a one-line summary of WHY, up to three specific strengths, and up to three specific, actionable improvements (as guidance/questions — never rewritten sentences).

## Honesty
This is a diagnostic to guide revision — NOT an admissions probability, chance, or official score. Never say an essay is "Ivy-worthy", never guarantee or estimate admission, and never claim a college would accept it.

${ESSAY_SCORING_LENSES}

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overview": string,
  "categories": [
    { "key": "voice"|"depth"|"storytelling"|"creativity", "score": number, "summary": string, "strengths": [string], "improvements": [string] }
  ]
}
Include all four categories exactly once. Do NOT include an overall score — it is computed as the average of the four.`;

// ─── Prompt builder ──────────────────────────────────────────────────────────
//
// The prompt is built from two DELIBERATELY SEPARATE blocks so the boundary
// between scoring and feedback is structural, not just a sentence in the system
// prompt:
//   • buildEssayBlock  — the SCORING input: the prompt + the draft, and nothing
//     about the profile. Identical for the same essay on any account, so the
//     four category scores cannot vary with the student's activities/field.
//   • buildContextBlock — the FEEDBACK-only application context (intended field
//     + activity names/roles). Present only so overlap can be surfaced as
//     guidance; the system prompt forbids it from moving any score.

/** The scoring input: prompt + draft. Takes NO profile — the four category
 *  scores are a function of the essay text alone. */
export function buildEssayBlock(content: string, promptText: string): string {
  const lines: string[] = [];

  lines.push("# The prompt this essay answers");
  lines.push(promptText || "(no prompt selected)");
  lines.push("");

  lines.push("# The draft to score (SCORE THIS TEXT ALONE)");
  lines.push('"""');
  lines.push(content.trim() || "(the draft is empty)");
  lines.push('"""');

  return lines.join("\n");
}

/** The feedback-only application context. NEVER a scoring input — used solely
 *  so the evaluator can note overlap with the rest of the application. */
export function buildContextBlock(profile: FullProfile): string {
  const lines: string[] = [];

  lines.push(
    "# Application context — FEEDBACK ONLY, NOT a scoring input (do NOT summarize it, do NOT let it change any score)",
  );
  const field =
    profile.specificMajor || profile.majorCategory || profile.careerInterest;
  lines.push(`Intended field: ${field || "undecided"}`);
  if (profile.activities.length) {
    lines.push("Activities already on their application:");
    for (const a of profile.activities) {
      const role = a.leadershipRole ? ` (${a.leadershipRole})` : "";
      lines.push(`- ${a.name}${role}`);
    }
  } else {
    lines.push("Activities already on their application: (none listed)");
  }

  return lines.join("\n");
}

export function buildPrompt(
  content: string,
  promptText: string,
  profile: FullProfile,
): string {
  return [
    buildEssayBlock(content, promptText),
    "",
    buildContextBlock(profile),
    "",
    "Score the draft from its text alone, use the application context only for feedback, and respond with ONLY the JSON described in your instructions.",
  ].join("\n");
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateEvaluation(
  content: string,
  promptText: string,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  evaluation: Evaluation;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.personalStatementDeepCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(content, promptText, profile),
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

  const evaluation = evaluationSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Evaluation complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { evaluation, promptTokens, completionTokens };
}
