import { generateText } from "ai";
import {
  type RedundancyAnalysis,
  redundancySchema,
} from "~/lib/supplemental/schemas";
import { gateway } from "../client";
import { AI_FEATURES } from "../config";
import { SUPPLEMENT_COACH_BOUNDARIES } from "./boundaries";

// Application-level redundancy / value-add — compares ONE supplement against the
// rest of the application (Personal Statement, Activities, Additional Information,
// and other finalized supplements for the same college) to answer two questions:
// does it REPEAT what the application already shows, and does it ADD a genuinely
// new dimension of the student? This is a DIAGNOSTIC — it never changes the
// essay's score; it only flags overlap and value-add so the student can decide.
// Runs on the cheap Gemini tier. Supplements are different pieces of one
// application, not copies of one story — but they should not all connect to a
// single artificial "brand" either.

export type RedundancyContext = {
  /** The student's Personal Statement (finalized text preferred). */
  personalStatement: string | null;
  /** Activities already on the application. */
  activities: Array<{ name: string; role: string; description: string }>;
  /** The Common App Additional Information section, if written. */
  additionalInfo: string | null;
  /** Other FINALIZED supplements for the same college. */
  otherSupplements: Array<{ promptText: string; content: string }>;
};

const SYSTEM_PROMPT = `You are AppGap's application-level reviewer. You look at ONE supplemental essay in the context of the rest of a student's application and judge two things: how much it REPEATS what the application already shows, and whether it ADDS a genuinely new dimension of who the student is.

${SUPPLEMENT_COACH_BOUNDARIES}

## What to judge
- repetition: "distinct" (covers new ground), "some_overlap" (reuses a story/theme in places), or "repetitive" (mostly restates the Personal Statement, an activity, or another supplement).
- newDimension: true if this essay reveals a NEW facet of the student (a different interest, relationship, side, or way of thinking) beyond the rest of the application; false if the reader learns essentially nothing new.
- valueAdd: one honest sentence on what new dimension it adds — or what it merely repeats.
- overlaps: specific overlaps, each naming the source (personal_statement, activities, additional_info, or other_supplement), what overlaps, and severity (minor / notable / heavy).
- suggestions: up to 4 concrete directions to make it add something new — as guidance/questions, never rewritten prose.

## Important
- This is DIAGNOSTIC. Do not assign or imply a score. Overlap is information, not a verdict — reusing a core activity across essays can be fine if each essay reveals a different angle on it. Only flag genuine redundancy.
- A coherent application shows different pieces of the same person; it does NOT require every essay to serve one artificial "brand". Do not push the student toward forced thematic branding.
- Do not invent anything about the student or the college. Judge only from the texts you are given.

## Output format
Respond with ONLY valid JSON in this exact shape — no markdown, no code fences, no commentary:
{
  "overview": string,
  "repetition": "distinct"|"some_overlap"|"repetitive",
  "newDimension": boolean,
  "valueAdd": string,
  "overlaps": [ { "source": "personal_statement"|"activities"|"additional_info"|"other_supplement", "detail": string, "severity": "minor"|"notable"|"heavy" } ],
  "suggestions": [string]
}`;

function buildPrompt(
  content: string,
  promptText: string,
  ctx: RedundancyContext,
): string {
  const lines: string[] = [];

  lines.push("# The supplement under review");
  lines.push(`Prompt: ${promptText || "(none)"}`);
  lines.push('"""');
  lines.push(content.trim() || "(the essay is empty)");
  lines.push('"""');
  lines.push("");

  lines.push("# The rest of the application (compare against this)");
  lines.push("");

  lines.push("## Personal Statement");
  lines.push(
    ctx.personalStatement?.trim()
      ? `"""\n${ctx.personalStatement.trim()}\n"""`
      : "(not written / not available)",
  );
  lines.push("");

  lines.push("## Activities");
  if (ctx.activities.length) {
    for (const a of ctx.activities) {
      const role = a.role ? ` (${a.role})` : "";
      const desc = a.description ? ` — ${a.description}` : "";
      lines.push(`- ${a.name}${role}${desc}`);
    }
  } else {
    lines.push("(none listed)");
  }
  lines.push("");

  lines.push("## Additional Information (Common App)");
  lines.push(
    ctx.additionalInfo?.trim()
      ? `"""\n${ctx.additionalInfo.trim()}\n"""`
      : "(not written / not available)",
  );
  lines.push("");

  lines.push("## Other finalized supplements for this college");
  if (ctx.otherSupplements.length) {
    ctx.otherSupplements.forEach((s, i) => {
      lines.push(
        `### Supplement ${i + 1} — prompt: ${s.promptText || "(none)"}`,
      );
      lines.push(`"""\n${s.content.trim()}\n"""`);
    });
  } else {
    lines.push("(none finalized yet)");
  }
  lines.push("");

  lines.push(
    "Compare the supplement against the rest of the application and respond with ONLY the JSON described in your instructions.",
  );
  return lines.join("\n");
}

export async function generateRedundancy(
  content: string,
  promptText: string,
  ctx: RedundancyContext,
  modelOverride?: string,
): Promise<{
  analysis: RedundancyAnalysis;
  promptTokens: number;
  completionTokens: number;
}> {
  const { model: defaultModel, temperature } = AI_FEATURES.supplementalCoach;
  const model = modelOverride ?? defaultModel;

  const result = await generateText({
    model: gateway(model),
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(content, promptText, ctx),
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

  const analysis = redundancySchema.parse(raw);

  const u = result.usage as unknown as {
    inputTokens?: number;
    outputTokens?: number;
  };
  const promptTokens = u.inputTokens ?? 0;
  const completionTokens = u.outputTokens ?? 0;

  console.log(
    `[AI] Supplemental redundancy — model: ${model}, ` +
      `prompt_tokens: ${promptTokens}, completion_tokens: ${completionTokens}, ` +
      `repetition: ${analysis.repetition}`,
  );

  return { analysis, promptTokens, completionTokens };
}
