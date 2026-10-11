import { generateText } from "ai";
import { z } from "zod";
import { countWords, WORD_LIMIT } from "~/lib/personal-statement/prompts";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";
import { DIAGNOSTIC_LENSES } from "./lenses";

// Line-by-line engine — sentence/passage-level feedback in exactly four
// categories: 🔴 REMOVE, 🟠 REWRITE, 🔵 ADD, 🟢 STRONG. Each comment carries the
// VERBATIM quote it refers to, so the Review view can highlight that exact span
// in the essay (Google-Docs style). "add" anchors its quote to the sentence the
// missing beat attaches to. It never rewrites the student's prose, and additions
// are budgeted against the 650-word limit. Runs on Opus.

// ─── Output contract ─────────────────────────────────────────────────────────

export const LBL_CATEGORIES = ["remove", "rewrite", "add", "strong"] as const;

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
  // For remove: what to cut and why it's safe to. For add: the KIND of thing to
  // add (never the written-out addition). Null when not applicable.
  suggestion: z.string().nullable().optional(),
  // A question the student should answer to improve it themselves (mainly
  // rewrite and add). Null when not applicable.
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

## The four categories
- **remove** (🔴): the passage genuinely weakens the essay — meaningless filler, resume repetition, generic clichés, throat-clearing, redundant explanation, unnecessary exposition, gimmicks, unprocessed trauma detail, or a claim that adds nothing. Say what to cut and why it's safe to. Do NOT flag something for removal merely because it is unconventional.
- **rewrite** (🟠): the underlying idea is worth keeping but the execution is weak — vague wording, a self-claim without evidence ("I am a natural leader"), stilted or overly formal prose, passive construction where active would help, a weak transition, superficial reflection, a summary-style conclusion, or missing specificity. For these, give: (1) what is weak, (2) why it's weak, (3) what KIND of change would help, and (4) a question the student should answer. NEVER supply the rewritten sentence.
- **add** (🔵): something SPECIFIC to THIS essay is missing, and adding it would reveal more of the student — a moment that is summarized instead of shown, a decision made without the thinking behind it, a "so what" the essay skips over, reflection that is asserted but not earned, or a concrete detail that would ground a passage the reader can't quite see. Anchor the quote to the exact sentence the addition attaches to (the passage to expand, or the sentence it should follow). Give: (1) what is missing, (2) why adding it would strengthen the essay, (3) the KIND of thing to add, and (4) a question whose honest answer hands the student the raw material. The diagnostic lenses below tell you what THIS essay is actually missing — let them drive these marks. NEVER a generic "add more detail / more sensory language / more reflection" note that could apply to any essay, and NEVER invent the content yourself. If you can't name the specific missing beat, don't place the mark.
- **strong** (🟢): the passage genuinely works — a distinctive detail, strong sensory writing, vulnerability, a specific action, authentic voice, interesting thinking, earned reflection, or effective narrative movement. Explain WHY it works so the student can do more of it.

## Word budget — additions are NOT free (hard limit: ${WORD_LIMIT} words)
The draft's current length is given below the essay. Treat the whole pass as one word budget, not a wish list:
- When the draft is comfortably under ${WORD_LIMIT} words, additions can stand on their own.
- When the draft is AT or OVER ${WORD_LIMIT} words, do NOT pile on 🔵 add marks. Lead with 🔴 remove and 🟠 rewrite marks that free up room, and only suggest an addition when your own cuts make space for it — so a student who follows all your marks lands within about ${WORD_LIMIT} words. Prefer swaps: cut filler or repetition, then spend the reclaimed words on the single most valuable missing beat.
- Fewer, higher-value additions beat many. Never recommend more additions than an essay already at the limit could possibly fit.

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
    { "category": "remove"|"rewrite"|"add"|"strong", "quote": string, "what": string, "why": string, "suggestion": string|null, "question": string|null }
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

  const words = countWords(content);
  const headroom = WORD_LIMIT - words;
  lines.push(
    `# Current length: ${words} words (limit ${WORD_LIMIT}) — ${
      headroom > 0
        ? `about ${headroom} words of headroom for additions`
        : `${-headroom} words OVER the limit: additions must be paid for with cuts`
    }`,
  );
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
