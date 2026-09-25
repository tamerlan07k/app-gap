import { generateText } from "ai";
import {
  type LineByLineAnalysis,
  lineByLineSchema,
  type PromptParse,
} from "~/lib/supplemental/schemas";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import { SUPPLEMENT_COACH_BOUNDARIES } from "./boundaries";

// Line-by-line engine — sentence/passage-level feedback in a classification set
// tuned for supplements. Each comment carries a VERBATIM quote so the Review view
// can highlight the exact span (Google-Docs style). It never rewrites the prose.
// Runs on Opus. The one exception to the verbatim-quote rule is "directive_missing"
// — something ABSENT has no text to quote, so its quote may be empty.

const CATEGORY_BLOCK = `- **strong_evidence** (🟢): a concrete experience, precise detail, specific decision, or real observation that backs a claim. Explain why it works.
- **strong_reflection** (🟢): genuine thinking — why something mattered, what changed, what they noticed, earned uncertainty. Explain why it works.
- **strong_college_connection** (🟢, Why-Us): a real bridge from the student's experience/interest to a specific feature of THIS college and what they'd do with it.
- **generic_telling** (🟠): vague "telling" that any applicant could write ("I'm passionate about helping people") without proof underneath. Ask for the concrete evidence.
- **missing_explanation** (🟠): a claim, event, or feeling stated but not explained — the "why", the "so what", or the thinking is absent.
- **unsupported_claim** (🟠): a trait or accomplishment asserted without evidence ("I'm a natural leader"). Ask what they actually did.
- **repetitive** (🟠): repeats something earlier in the essay, or (if flagged) the rest of the application, adding nothing new here.
- **superficial_namedrop** (🔴, Why-Us): a college resource, professor, or program named only to impress, with no real connection to the student. Distinguish from a genuine connection.
- **directive_missing** (🔴): an explicit directive of the prompt the essay never answers. Quote may be empty; say which directive is unaddressed.`;

const SYSTEM_PROMPT = `You are AppGap's supplemental-essay coach doing a passage-by-passage pass over one essay, marking it up the way a great teacher does in the margins. Every comment falls into exactly one category and (except for a missing directive) points to a specific quoted passage.

${SUPPLEMENT_COACH_BOUNDARIES}

## Categories
${CATEGORY_BLOCK}

## Rules
- Point to real, specific passages. Comment on what matters — a focused set (roughly 8–20 marks), not every sentence.
- Always include some 🟢 STRONG marks when anything works — students learn from what to keep, not only what to fix.
- Distinguish claiming a trait from demonstrating it; when claimed, ask for the evidence.
- Do not force sensory detail everywhere, do not impose a structure, and do not push toward a generic prestigious-admissions style. Don't flag humor, lists, dialogue, or unconventional formats as problems unless they're an empty gimmick.
- Never rewrite, and never invent content the student didn't write or college facts you weren't given.

## Quotes must be exact
Every "quote" (except for a "directive_missing" comment) MUST be copied VERBATIM from the essay — exact characters, capitalization, punctuation — because it highlights that span. Quote a short phrase or a single sentence, not a whole paragraph. If you can't quote it exactly, don't comment on it. For "directive_missing", set quote to "" and name the unanswered directive in "what".

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overview": string,
  "comments": [ { "category": string, "quote": string, "what": string, "why": string, "suggestion": string|null, "question": string|null } ]
}
Order comments by where they appear in the essay when you can.`;

function buildPrompt(
  content: string,
  promptText: string,
  parse: PromptParse,
): string {
  const lines: string[] = [];

  lines.push("# The prompt this essay answers");
  lines.push(promptText || "(no prompt provided)");
  lines.push("");

  if (parse.directives.length) {
    lines.push("# Explicit directives (flag any the essay never answers)");
    parse.directives.forEach((d, i) => {
      lines.push(`${i + 1}. ${d}`);
    });
    lines.push("");
  }

  lines.push("# The essay to mark up (quote from this text verbatim)");
  lines.push('"""');
  lines.push(content.trim() || "(the essay is empty)");
  lines.push('"""');
  lines.push("");

  lines.push(
    "Mark up the essay and respond with ONLY the JSON described in your instructions. Remember: quotes must be exact substrings (except for a missing-directive comment).",
  );
  return lines.join("\n");
}

export async function generateLineByLine(
  content: string,
  promptText: string,
  parse: PromptParse,
  modelOverride?: string,
): Promise<{
  analysis: LineByLineAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.supplementalDeepCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(content, promptText, parse),
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
    `[AI] Supplemental line-by-line — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `comments: ${analysis.comments.length}`,
  );

  return { analysis, promptTokens, completionTokens };
}
