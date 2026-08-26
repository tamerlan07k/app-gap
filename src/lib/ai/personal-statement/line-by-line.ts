import { generateText } from "ai";
import { z } from "zod";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";
import { DIAGNOSTIC_LENSES } from "./lenses";

// Line-by-line engine — sentence/passage-level feedback in exactly three
// categories: 🔴 REMOVE, 🟠 REWRITE, 🟢 STRONG. Each comment carries the VERBATIM
// quote it refers to, so the Review view can highlight that exact span in the
// essay (Google-Docs style). It never rewrites the student's prose. Runs on Opus.

// ─── Output contract ─────────────────────────────────────────────────────────

export const LBL_CATEGORIES = ["remove", "rewrite", "strong"] as const;

const commentSchema = z.object({
  category: z.enum(LBL_CATEGORIES),
  // An EXACT substring copied verbatim from the essay (so the UI can locate and
  // highlight it). A phrase or a sentence — not a whole paragraph.
  quote: z.string(),
  // What's going on here (the issue for remove/rewrite; the strength for strong).
  what: z.string(),
  // Why it weakens the essay, or why it works.
  why: z.string(),
  // For rewrite: the KIND of change to make (never the rewritten sentence).
  // For remove: what to cut and why it's safe to. Null when not applicable.
  suggestion: z.string().nullable().optional(),
  // A question the student should answer to improve it themselves (mainly
  // rewrite). Null when not applicable.
  question: z.string().nullable().optional(),
});

export type LineByLineCategory = (typeof LBL_CATEGORIES)[number];
export type LineByLineComment = z.infer<typeof commentSchema>;

export const lineByLineSchema = z.object({
  // A short, honest overview of the pass (1–3 sentences).
  overview: z.string(),
  // The comments, in the order they appear in the essay where possible.
  comments: z.array(commentSchema).max(40),
});

export type LineByLineAnalysis = z.infer<typeof lineByLineSchema>;

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AppGap's personal-statement coach doing a sentence-by-sentence pass over one draft, the way a great teacher marks up an essay in the margins. Every comment falls into exactly one of three categories, and every comment points to a specific quoted passage.

${COACH_BOUNDARIES}

## The three categories
- **remove** (🔴): the passage genuinely weakens the essay — meaningless filler, resume repetition, generic clichés, throat-clearing, redundant explanation, unnecessary exposition, gimmicks, unprocessed trauma detail, or a claim that adds nothing. Say what to cut and why it's safe to. Do NOT flag something for removal merely because it is unconventional.
- **rewrite** (🟠): the underlying idea is worth keeping but the execution is weak — vague wording, a self-claim without evidence ("I am a natural leader"), stilted or overly formal prose, passive construction where active would help, a weak transition, superficial reflection, a summary-style conclusion, or missing specificity. For these, give: (1) what is weak, (2) why it's weak, (3) what KIND of change would help, and (4) a question the student should answer. NEVER supply the rewritten sentence.
- **strong** (🟢): the passage genuinely works — a distinctive detail, strong sensory writing, vulnerability, a specific action, authentic voice, interesting thinking, earned reflection, or effective narrative movement. Explain WHY it works so the student can do more of it.

## Rules
- Point to real, specific passages. Comment on what matters — a focused set of the most useful marks (roughly 8–20 for a full essay), not every sentence.
- Always include some 🟢 STRONG marks when anything works — students learn from what to keep, not only what to fix.
- Distinguish claiming a trait from demonstrating it; when something is claimed, ask for the evidence ("what did you actually do? what were you thinking then? what changed after?").
- Do not force sensory detail everywhere, do not impose a five-paragraph structure, and do not push the essay toward a generic prestigious-admissions style.
- Never rewrite, and never invent content the student didn't write.

${DIAGNOSTIC_LENSES}

## Quotes must be exact
The "quote" field MUST be copied VERBATIM from the essay — the exact characters, including capitalization and punctuation — because it is used to highlight that span. Quote a short phrase or a single sentence, not a whole paragraph. If you can't quote something exactly, don't comment on it.

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overview": string,
  "comments": [
    { "category": "remove"|"rewrite"|"strong", "quote": string, "what": string, "why": string, "suggestion": string|null, "question": string|null }
  ]
}
Order comments by where they appear in the essay when you can. Keep everything grounded in the actual text.`;

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

  lines.push("# The essay to mark up (quote from this text verbatim)");
  lines.push('"""');
  lines.push(content.trim() || "(the draft is empty)");
  lines.push('"""');
  lines.push("");

  lines.push(
    "# Application context (for spotting resume repetition — do NOT summarize it)",
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
  lines.push("");

  lines.push(
    "Mark up the essay and respond with ONLY the JSON described in your instructions. Remember: quotes must be exact substrings of the essay.",
  );
  return lines.join("\n");
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateLineByLine(
  content: string,
  promptText: string,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  analysis: LineByLineAnalysis;
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

  const analysis = lineByLineSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Line-by-line complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `comments: ${analysis.comments.length}`,
  );

  return { analysis, promptTokens, completionTokens };
}
