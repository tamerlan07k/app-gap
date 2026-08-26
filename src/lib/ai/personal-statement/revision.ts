import { generateText } from "ai";
import { z } from "zod";
import { SCORE_CATEGORIES } from "~/lib/personal-statement/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";

// Revision-guidance engine — a stage-aware plan for the student's NEXT revision,
// organized around the same four scoring categories. It tells them what to work
// on and in what order (as guidance/questions), never rewriting the essay.
// Gemini-tier.

// ─── Output contract ─────────────────────────────────────────────────────────

export const REVISION_STAGES = [
  "draft_1",
  "draft_2",
  "draft_3",
  "final",
] as const;

const categoryPlanSchema = z.object({
  key: z.enum(["voice", "depth", "storytelling", "creativity"]),
  // Concrete revision moves for this category — guidance/questions, not prose.
  moves: z.array(z.string()).max(3),
});

export type RevisionCategoryPlan = z.infer<typeof categoryPlanSchema>;

export const revisionSchema = z.object({
  // Which revision stage this draft is roughly at (drives the focus).
  stage: z.enum(REVISION_STAGES),
  // Where the draft is and what THIS revision round should focus on.
  stageNote: z.string(),
  // A short, ordered list of the 2–3 most important things to do next.
  topPriorities: z.array(z.string()).max(3),
  // Per-category revision moves (the four scoring categories).
  categoryPlan: z.array(categoryPlanSchema).max(4),
  // Revision-process reminders (leave time, read aloud, limit outside opinions).
  processReminders: z.array(z.string()).max(4),
});

export type RevisionStage = (typeof REVISION_STAGES)[number];
export type Revision = z.infer<typeof revisionSchema>;

// ─── System prompt ───────────────────────────────────────────────────────────

const FRAMEWORK = SCORE_CATEGORIES.map(
  (c) => `- **${c.key}** (${c.label}): ${c.blurb}`,
).join("\n");

const SYSTEM_PROMPT = `You are AppGap's personal-statement revision coach. Given one draft, you produce a focused plan for the student's NEXT revision — what to work on, in what order — so they improve it themselves. You never rewrite the essay.

${COACH_BOUNDARIES}

## Revision happens in stages — meet the draft where it is
Assess how mature this draft is and pick the stage whose focus fits best:
- **draft_1** — the goal is to get the real story and honest thinking onto the page. Focus on substance and truth, not polish. Don't nitpick wording yet.
- **draft_2** — improve structure, pacing, specificity, and the depth of reflection. Cut what doesn't serve the through-line; add concrete detail and earned insight.
- **draft_3** — refine language and voice: make it sound like the student, trade vague claims for concrete ones, tighten sentences, smooth transitions.
- **final** — proofread: grammar, consistency, cadence, formatting, word count. Small touches only.
Do NOT tell a rough first draft to fix commas, and do NOT tell a nearly-final draft to rethink its whole topic.

## Organize the plan around the four scoring categories
${FRAMEWORK}
For creativity, originality means a fresh perspective or way of telling — NEVER fancy vocabulary or more metaphors.
Give each category a few concrete moves as guidance or questions the student can act on (e.g. "find the one moment that best shows X and slow it down" or "what were you actually thinking here?"). Never write replacement sentences. If a category is already strong for this stage, it's fine to give it one light note or none.

## Process reminders
Include a couple of honest revision-process reminders when relevant: leave time between drafts, read the essay aloud to catch what's off, and limit how many people you show it to (too many opinions dilute your voice).

## Honesty
This guides revision; it is not an admissions prediction or a guarantee.

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "stage": "draft_1"|"draft_2"|"draft_3"|"final",
  "stageNote": string,
  "topPriorities": [string],
  "categoryPlan": [{ "key": "voice"|"depth"|"storytelling"|"creativity", "moves": [string] }],
  "processReminders": [string]
}
Ground everything in the actual draft; never invent content the student didn't write.`;

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(
  content: string,
  promptText: string,
  profile: FullProfile,
): string {
  const lines: string[] = [];

  lines.push("# The prompt this essay answers");
  lines.push(promptText || "(no prompt selected)");
  lines.push("");

  lines.push("# The current draft");
  lines.push('"""');
  lines.push(content.trim() || "(the draft is empty)");
  lines.push('"""');
  lines.push("");

  lines.push(
    "# Application context (for coherence only — do NOT summarize it)",
  );
  const field =
    profile.specificMajor || profile.majorCategory || profile.careerInterest;
  lines.push(`Intended field: ${field || "undecided"}`);
  if (profile.activities.length) {
    lines.push(
      `Activities already on their application: ${profile.activities
        .map((a) => a.name)
        .join(", ")}`,
    );
  }
  lines.push("");

  lines.push(
    "Give the next-revision plan and respond with ONLY the JSON described in your instructions.",
  );
  return lines.join("\n");
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateRevision(
  content: string,
  promptText: string,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  revision: Revision;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.personalStatementCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(content, promptText, profile),
    temperature: Math.min(temperature, 0.5),
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

  const revision = revisionSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Revision plan complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { revision, promptTokens, completionTokens };
}
