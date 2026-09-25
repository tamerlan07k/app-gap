import { generateText } from "ai";
import { ARCHETYPE_LABELS } from "~/lib/supplemental/archetypes";
import {
  evaluationSchema,
  type PromptParse,
  type RawEvaluation,
} from "~/lib/supplemental/schemas";
import { DIMENSIONS } from "~/lib/supplemental/scoring";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import { SUPPLEMENT_COACH_BOUNDARIES } from "./boundaries";

// Graded evaluation — scores one supplemental essay on the four dimensions
// (each 0–100), grades every explicit directive from the parse for coverage, and
// (for Why-Us prompts) runs the college-specificity + swap-test heuristics. The
// model returns the four sub-scores and the directive grades; the OVERALL and the
// coverage-based alignment adjustment are computed in code (see
// ~/lib/supplemental/evaluate). Runs on Opus, temperature 0. A diagnostic — never
// an admissions prediction.

const DIMENSION_BLOCK = DIMENSIONS.map(
  (d) => `- **${d.key}** (${d.label}): ${d.blurb}`,
).join("\n");

const SYSTEM_PROMPT = `You are AppGap's supplemental-essay evaluator. You score ONE supplemental essay against the prompt it answers, on four dimensions (each 0–100), grade how well it covers every explicit directive in the prompt, and explain everything so the student can revise. You are a diagnostic coach, not an admissions office.

${SUPPLEMENT_COACH_BOUNDARIES}

## The four dimensions (score each 0–100)
${DIMENSION_BLOCK}

## Directive coverage (grade every directive you are given)
You are given the explicit directives parsed from the prompt. For EACH one, mark:
- "addressed" — the essay clearly and substantively answers it.
- "partial" — the essay touches it but leaves it thin or implicit.
- "missing" — the essay does not answer it.
Be strict and literal: answering only some of the prompt's questions is a real problem even when the writing is excellent. (The system reduces the alignment score in proportion to coverage, so grade honestly.)

## Why-Us specificity & the swap test (ONLY for Why-Us / institutional-fit prompts)
When the prompt is about fitting THIS specific college:
- collegeSpecificity: "strong" (a real bridge: the student's experience/interest → a specific resource/feature of this college → what they'd explore or contribute), "adequate" (some specifics but a thin connection), or "weak" (generic; could be about many colleges).
- swapTest: could the college's name and resources be swapped for a similar college and the essay still work? If yes, swappable = true (specificity is weak). Judge the OVERALL connection and reasoning — do NOT mark it swappable merely because it mentions common resources like a well-known program, and never reward prestige or flattery.
For non-Why-Us prompts, set collegeSpecificity and swapTest to null.

## Verified college information
If you name any college resource in your feedback, it MUST come from the verified information block below (when provided). If a resource isn't there, say you can't verify a specific one rather than inventing it.

## Calibration (honest, not inflating)
Score against strong real applicants: 90–100 exceptional, 80–89 strong, 70–79 solid, 60–69 developing, 45–59 building, below 45 early. Most genuine early drafts land in the 60s–70s. A mundane topic (cooking, a job, a commute) can score high if the thinking is strong; prestige earns nothing. Reflect agency and learning, never trauma severity. Simple, clear language is fine; thesaurus-stuffing and a "consultant" voice are not rewarded.

## Category-specific emphasis (apply ONLY the bullets matching this prompt's type; ignore the rest)
Across every type, reward what REVEALS this student over what merely sounds impressive.
- Why Us: beyond the specificity & swap test above, a bare LIST of named programs or resources with no personal bridge — the student's own experience, question, or goal — is weak, as is location or general reputation offered as a main reason.
- Why Major: reward a real origin for the interest, a specific question or problem the student got pulled into, experiences that deepened or changed their understanding, and what they want to explore or apply next. "I've always loved X" with no origin or specifics is thin.
- Activity / Extracurricular: reward ONE concrete scene or moment over a summary of the whole activity, and a genuine before→after shift where one actually happened. Do NOT require a quantifiable achievement when one isn't naturally relevant to the prompt.
- Community / Identity: reward what the student CONTRIBUTED — a concrete action or initiative, and real relationships — not only what they received or generic statements about diversity or belonging. For cultural or identity essays, reward zooming into ONE tradition, interaction, responsibility, or tension over describing an entire background. A strong shape when it fits: difference or tension → action → change → learning.
- Intellectual Curiosity: reward a specific trigger and genuine depth of investigation — a real "rabbit hole" pursued beyond school requirements — over merely naming an interest, however advanced it sounds.
- Personality / roommate / "quick take": reward personality over explanation — habits, quirks, humor, and small revealing details that make the student feel real. For fun, hobby, or pleasure prompts, do not reward a résumé-style activity just because it is impressive; a mundane or unexpected interest can be stronger when it reveals how the student thinks.
- Societal challenge: reward a genuine personal or local connection — the reader should understand why THIS student cares about THIS problem (it may tie to their intended field). A generic global issue with no personal or local tie is weak, however important the issue.
- List / creative prompt: reward curation, personality, and originality over prestige; the strongest make the reader notice something in a way they had not considered.

## What each dimension score must include
For every dimension: the 0–100 score, a one-line summary of WHY, up to three specific strengths, and up to three specific, actionable improvements (guidance/questions — never rewritten sentences).

## Exact evidence & guided questions
- keyEvidence: up to 5 items, each a VERBATIM quote from the essay + why it creates an issue (or, occasionally, why it works).
- mainWeakness: the single biggest thing holding the essay back.
- guidedQuestions: up to 5 questions that make the student think and revise themselves.

## Honesty
This is a diagnostic to guide revision — NOT an admissions probability or official score. Never say an essay is "admittable", never estimate admission, never claim a college would accept it.

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overview": string,
  "dimensions": [ { "key": "alignment"|"reflection"|"specificity"|"voice", "score": number, "summary": string, "strengths": [string], "improvements": [string] } ],
  "directives": [ { "directive": string, "status": "addressed"|"partial"|"missing", "note": string } ],
  "mainWeakness": string,
  "keyEvidence": [ { "quote": string, "issue": string } ],
  "guidedQuestions": [string],
  "collegeSpecificity": "strong"|"adequate"|"weak"|null,
  "swapTest": { "swappable": boolean, "note": string }|null
}
Include all four dimensions exactly once. Grade every directive you were given. Do NOT include an overall score — it is computed from the four dimensions.`;

function buildPrompt(
  content: string,
  promptText: string,
  parse: PromptParse,
  collegeName: string,
  verifiedCollege: string | null,
): string {
  const lines: string[] = [];

  lines.push(`# The college`);
  lines.push(collegeName || "(unknown college)");
  lines.push("");

  lines.push("# The prompt this essay answers");
  lines.push(promptText || "(no prompt provided)");
  lines.push("");

  lines.push(
    `# Prompt analysis (classify coverage against these) — type: ${ARCHETYPE_LABELS[parse.primaryArchetype]}`,
  );
  lines.push("Explicit directives to grade for coverage:");
  if (parse.directives.length) {
    parse.directives.forEach((d, i) => {
      lines.push(`${i + 1}. ${d}`);
    });
  } else {
    lines.push(
      "(no explicit directives were parsed — grade alignment holistically)",
    );
  }
  if (parse.constraints.length) {
    lines.push("Constraints:");
    for (const c of parse.constraints) lines.push(`- ${c}`);
  }
  if (parse.wordLimit != null) lines.push(`Word limit: ${parse.wordLimit}`);
  lines.push("");

  lines.push("# The essay to evaluate");
  lines.push('"""');
  lines.push(content.trim() || "(the essay is empty)");
  lines.push('"""');
  lines.push("");

  lines.push(
    "# Verified college information (the ONLY college resources you may name in feedback)",
  );
  lines.push(
    verifiedCollege?.trim()
      ? verifiedCollege.trim()
      : "(no verified college resources are available — do not name specific courses, professors, labs, or programs; if the student needs specifics, tell them you can't verify a particular resource)",
  );
  lines.push("");

  lines.push(
    "Evaluate the essay and respond with ONLY the JSON described in your instructions. Quotes in keyEvidence must be exact substrings of the essay.",
  );
  return lines.join("\n");
}

export async function generateEvaluation(
  content: string,
  promptText: string,
  parse: PromptParse,
  collegeName: string,
  verifiedCollege: string | null,
  modelOverride?: string,
): Promise<{
  evaluation: RawEvaluation;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } =
    AI_FEATURES.supplementalDeepCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(
      content,
      promptText,
      parse,
      collegeName,
      verifiedCollege,
    ),
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
    `[AI] Supplemental evaluation — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}`,
  );

  return { evaluation, promptTokens, completionTokens };
}
