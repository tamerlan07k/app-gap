import { generateText } from "ai";
import { z } from "zod";
import type { BrainstormInputs } from "~/lib/personal-statement/brainstorm";
import { FREEWRITING_QUESTIONS } from "~/lib/personal-statement/brainstorm";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";
import { DIAGNOSTIC_LENSES } from "./lenses";

// Brainstorming engine. Takes the student's own exercise answers and reflects
// back PATTERNS and candidate DIRECTIONS — it never picks a topic for them and
// never writes essay prose. Reads the student's activities/field only to judge
// cross-application coherence (what's already visible vs a fresh side of them).

// ─── Output contract ─────────────────────────────────────────────────────────

const patternSchema = z.object({
  title: z.string(),
  description: z.string(),
});

const directionSchema = z.object({
  // A short handle for the possible essay, NOT a finished topic sentence.
  title: z.string(),
  // What this essay would actually be about, in one or two sentences.
  angle: z.string(),
  // The specificity/mirror test: what THIS student's version reveals that
  // another applicant's version of a similar topic would not.
  whyItRevealsYou: z.string(),
  // Open questions to explore if they pursue it — prompts, never answers.
  seedQuestions: z.array(z.string()).max(4),
  // Which of the student's inputs sparked this (an object, a value, an answer).
  drawnFrom: z.string(),
});

const tensionSchema = z.object({
  tension: z.string(),
  whyInteresting: z.string(),
});

export const brainstormInsightsSchema = z.object({
  // Recurring themes the coach notices across the student's material.
  patterns: z.array(patternSchema).max(6),
  // Candidate essay directions — options to consider, never a chosen topic.
  directions: z.array(directionSchema).max(6),
  // Contradictions / surprising combinations worth exploring (optional, honest).
  tensions: z.array(tensionSchema).max(4),
  // Cross-application coherence: what already shows up in their Activities/profile
  // vs. what would reveal a NEW side of them. Empty string if nothing to say.
  overlapWithApplication: z.string(),
  // Warm, honest encouragement — including that a focused, "well-lopsided" self
  // is fine. Never flattery, never admissions promises.
  encouragement: z.string(),
  // A few further freewriting-style questions to push the exploration deeper.
  nextPrompts: z.array(z.string()).max(5),
});

export type BrainstormInsights = z.infer<typeof brainstormInsightsSchema>;

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AppGap's personal-statement brainstorming coach. A student is at the very start — "I have no idea what to write about" — and has done some brainstorming exercises. Your job is to help them SEE what's already in their own material: patterns, values, contradictions, and possible directions for a Common App personal statement.

${COACH_BOUNDARIES}

## What good brainstorming help looks like
- Work ONLY from what the student actually wrote. Read their "student who…" line, their objects, their values, and their freewriting answers closely, and reflect back what those specifically suggest.
- Surface PATTERNS across the material (a recurring theme, an unexpected throughline) — things they may not have noticed themselves.
- Offer several possible DIRECTIONS as options, each with an honest reason it could reveal this particular student. Do NOT rank them or tell them which to pick. A slice-of-life moment, a quirky habit, a small vivid memory, a contradiction, or an ordinary experience with unusual meaning is often stronger than an "impressive" topic.
- Point out TENSIONS or contradictions (the disciplined kid who loves chaos; the quiet one who argues) — these are gifts, not problems.
- Encourage a focused, "well-lopsided" self. They do NOT need to seem well-rounded. Never push them toward what sounds impressive over what's true.
- If they gave you very little, say so gently and give them a couple of concrete next questions rather than inventing material.

## Do NOT
- Do NOT choose their topic for them or declare one direction "the best."
- Do NOT invent objects, memories, feelings, or details they didn't provide.
- Do NOT write any essay sentences, hooks, or paragraphs.
- Do NOT force a trauma story or a tidy inspirational arc.

${DIAGNOSTIC_LENSES}

## Cross-application coherence
You are given the student's activities and intended field only so you can note whether a possible direction would REPEAT what their application already shows, or reveal a NEW side of them. Prefer directions that add depth the rest of the application can't. The essay does not need to mention any activity.

## Output format
Respond with ONLY valid JSON matching this exact shape — no markdown, no code fences, no commentary:
{
  "patterns": [{ "title": string, "description": string }],
  "directions": [{ "title": string, "angle": string, "whyItRevealsYou": string, "seedQuestions": [string], "drawnFrom": string }],
  "tensions": [{ "tension": string, "whyInteresting": string }],
  "overlapWithApplication": string,
  "encouragement": string,
  "nextPrompts": [string]
}
Keep every field grounded in what the student gave you. Use "" or [] where you genuinely have nothing honest to add.`;

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(inputs: BrainstormInputs, profile: FullProfile): string {
  const lines: string[] = [];
  lines.push("# This student's brainstorming material\n");

  lines.push(
    `## "The student who…"\n${inputs.studentWho.trim() || "(left blank)"}\n`,
  );

  lines.push("## Essence objects (ordinary things connected to their life)");
  lines.push(
    inputs.objects.length
      ? inputs.objects.map((o) => `- ${o}`).join("\n")
      : "(none listed)",
  );
  lines.push("");

  lines.push("## Values");
  lines.push(inputs.values.length ? inputs.values.join(", ") : "(none listed)");
  if (inputs.centralValue.trim()) {
    lines.push(`Central / non-negotiable value: ${inputs.centralValue.trim()}`);
  }
  lines.push("");

  lines.push("## Freewriting answers");
  const answered = FREEWRITING_QUESTIONS.filter((q) =>
    inputs.freewrites[q.id]?.trim(),
  );
  if (answered.length) {
    for (const q of answered) {
      lines.push(`Q: ${q.question}\nA: ${inputs.freewrites[q.id].trim()}\n`);
    }
  } else {
    lines.push("(none answered)\n");
  }

  // Coherence context — activities + field only, clearly framed as read-only.
  lines.push(
    "# Application context (for coherence only — do NOT summarize it)",
  );
  const field =
    profile.specificMajor || profile.majorCategory || profile.careerInterest;
  lines.push(`Intended field: ${field || "undecided"}`);
  lines.push(`Grade level: ${profile.gradeLevel || "unknown"}`);
  if (profile.activities.length) {
    lines.push("Activities already on their application:");
    for (const a of profile.activities) {
      const role = a.leadershipRole ? ` (${a.leadershipRole})` : "";
      lines.push(`- ${a.name}${role}`);
    }
  } else {
    lines.push("Activities already on their application: (none listed)");
  }
  lines.push("");

  lines.push(
    "Reflect on the material above and respond with ONLY the JSON described in your instructions.",
  );
  return lines.join("\n");
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateBrainstorm(
  inputs: BrainstormInputs,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  insights: BrainstormInsights;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.personalStatementCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(inputs, profile),
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

  const insights = brainstormInsightsSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Brainstorm complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { insights, promptTokens, completionTokens };
}
