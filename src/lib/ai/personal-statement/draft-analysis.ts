import { generateText } from "ai";
import { z } from "zod";
import { countWords, WORD_LIMIT } from "~/lib/personal-statement/prompts";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import type { FullProfile } from "../prompt";
import { COACH_BOUNDARIES } from "./boundaries";
import { DIAGNOSTIC_LENSES } from "./lenses";

// Draft-analysis engine — a holistic read of a whole draft: through-line, hook,
// reflection, arc, voice, specificity, and repetition vs. the rest of the
// application. It returns strengths + targeted questions, NEVER rewritten prose.
// (Sentence-level 🔴🟠🟢 feedback is a separate engine.)

// ─── Output contract ─────────────────────────────────────────────────────────

const bandSchema = z.enum(["strong", "developing", "needs_work"]);

export const DRAFT_DIMENSIONS = [
  "through_line",
  "hook",
  "reflection",
  "narrative_arc",
  "voice",
  "specificity",
] as const;

const dimensionSchema = z.object({
  key: z.enum(DRAFT_DIMENSIONS),
  band: bandSchema,
  // A short, specific read of this dimension in THIS draft.
  assessment: z.string(),
});

const strengthSchema = z.object({
  title: z.string(),
  detail: z.string(),
});

// The coaching core: what's weak, WHY it's weak, and a QUESTION the student
// should answer — never a replacement sentence.
const focusAreaSchema = z.object({
  title: z.string(),
  weak: z.string(),
  why: z.string(),
  question: z.string(),
});

export const draftAnalysisSchema = z.object({
  // A short, honest read of where this draft is right now.
  overallRead: z.string(),
  dimensions: z.array(dimensionSchema).max(6),
  strengths: z.array(strengthSchema).max(6),
  focusAreas: z.array(focusAreaSchema).max(6),
  // Coherence: does the draft repeat what the application already shows, or add
  // something new? Empty string if there's nothing worth saying.
  resumeCheck: z.string(),
  // 2–4 prioritized next moves for the NEXT revision of this draft.
  nextSteps: z.array(z.string()).max(4),
});

export type DraftBand = z.infer<typeof bandSchema>;
export type DraftDimensionKey = (typeof DRAFT_DIMENSIONS)[number];
export type DraftAnalysis = z.infer<typeof draftAnalysisSchema>;

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are AppGap's personal-statement coach giving a holistic read of one draft of a Common App personal statement. Your job is to help the student see what's working and what to focus on next — so their OWN next revision is stronger. You are a mentor, not an editor who rewrites.

${COACH_BOUNDARIES}

## What to evaluate (holistically, not line-by-line)
Rate each of these dimensions as "strong", "developing", or "needs_work", with a short, specific reason grounded in the actual draft:
- **through_line** — is there one clear thread the whole essay is about, or does it wander / read as disconnected anecdotes?
- **hook** — does the opening drop the reader into a moment or create curiosity, or is it a generic wind-up ("Ever since I was a child…", a dictionary definition, a famous quote, restating the prompt, a broad statement about life)?
- **reflection** — does it show genuine thinking (why this mattered, what changed in how they think), or does it just narrate events / tack on a tidy "lesson"?
- **narrative_arc** — is there meaningful movement (a before → tension/shift → after), with the turning point given enough room?
- **voice** — does it sound like a real high-schooler talking honestly, or thesaurus-heavy, stiff, or artificially "admissions-essay"?
- **specificity** — concrete, particular details and actions vs. vague self-claims ("I am a natural leader") and generic description. Apply the Specificity test.

## How to coach
- Name genuine STRENGTHS specifically, and say WHY they work, so the student can do more of it.
- For focus areas, give: what's weak, WHY it's weak, and a QUESTION the student should answer to fix it themselves. Never supply the fixed sentence.
- Distinguish claiming a trait from demonstrating it; ask for the evidence ("what did you actually do? what were you thinking at that moment? what changed after?").
- Do NOT reward a "lesson" just for being stated — reward earned reflection.
- Do NOT recommend cutting something merely for being unconventional. Do flag filler, resume repetition, clichés, throat-clearing, and unprocessed trauma-dumping.
- Do NOT force a five-paragraph structure or a single "correct" shape.

${DIAGNOSTIC_LENSES}

## Coherence with the rest of the application
You are given the student's activities and field. In resumeCheck, note whether the draft mostly re-lists accomplishments already visible elsewhere (and should instead reveal a new side of them) — or whether it adds real depth. The essay need not mention any activity.

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overallRead": string,
  "dimensions": [{ "key": "through_line"|"hook"|"reflection"|"narrative_arc"|"voice"|"specificity", "band": "strong"|"developing"|"needs_work", "assessment": string }],
  "strengths": [{ "title": string, "detail": string }],
  "focusAreas": [{ "title": string, "weak": string, "why": string, "question": string }],
  "resumeCheck": string,
  "nextSteps": [string]
}
Include all six dimensions. Keep everything grounded in the actual draft; never invent content the student didn't write.`;

// ─── Prompt builder ──────────────────────────────────────────────────────────

function buildPrompt(
  content: string,
  promptText: string,
  profile: FullProfile,
): string {
  const words = countWords(content);
  const lines: string[] = [];

  lines.push("# The prompt this essay answers");
  lines.push(promptText || "(no prompt selected)");
  lines.push("");

  lines.push(`# The draft (${words} words; recommended max ${WORD_LIMIT})`);
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
    "Give your holistic read and respond with ONLY the JSON described in your instructions.",
  );
  return lines.join("\n");
}

// ─── Generate ────────────────────────────────────────────────────────────────

export async function generateDraftAnalysis(
  content: string,
  promptText: string,
  profile: FullProfile,
  modelOverride?: string,
): Promise<{
  analysis: DraftAnalysis;
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
    // A touch cooler than brainstorming — this is diagnosis, not ideation.
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

  const analysis = draftAnalysisSchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Draft analysis complete — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { analysis, promptTokens, completionTokens };
}
