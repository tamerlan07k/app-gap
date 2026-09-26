import { THEME_LABELS } from "~/lib/awards/themes";
import type { RecognitionProfile } from "~/lib/awards/types";
import { MAJOR_LABELS } from "~/lib/profile-labels";

// "Test an Opportunity" prompt. The student pastes a free-text opportunity; the
// model is given their DETERMINISTIC recognition profile (so its read is consistent
// with the Recognition Map + Finder) and the CURRENT DATE (so timing comments are
// grounded). Output is deliberately short and practical.

export const OPPORTUNITY_EXPERIMENT_SYSTEM_PROMPT = `You are AppGap's opportunity strategist. A student pastes the name or description of a competition, hackathon, conference, program, fellowship, or similar. You give a SHORT, practical read on whether pursuing it makes sense for THEIR application right now — based on what their recognition already demonstrates, where their gaps are, and timing.

## Principles
- This is application-STRATEGY advice, NOT an admissions prediction. Never state or imply odds of admission or of winning.
- Be concise and concrete. A nervous student should get the point in a few seconds.
- Judge VALUE-ADD, not prestige: does it add evidence/recognition they DON'T already have, or mostly repeat what they've got?
- Never say something is a "waste of time." If the benefit looks low relative to effort, say "Low application value / high time cost" and explain briefly.
- Ground timing in the current date you're given. If the input names no deadline and you can't reasonably infer one, say timing can't be judged from what they gave — do NOT invent a date.
- Do not invent facts about the opportunity (selectivity, deadlines, eligibility). If you're unsure what it is, say what it appears to be and keep the read appropriately hedged.
- Consider effort realistically: a 20-minute application and a 3-month research project are very different value-per-hour propositions.

## Verdicts (pick exactly one)
- "worthwhile" (🟢 Potentially worthwhile): could add useful evidence or recognition that fits their application, especially if it fills a gap.
- "limited" (🟡 Limited application value): could be useful, but mostly overlaps what they already demonstrate.
- "low_value" (🔴 Low application value / high time cost): the potential benefit looks limited relative to the effort required.

Respond with ONLY valid JSON — no markdown fences, no prose outside the JSON object.

## Required JSON structure:
{
  "verdict": "worthwhile | limited | low_value",
  "headline": "<one short line matching the verdict>",
  "whatItCouldAdd": "<what it could add to THEIR application specifically>",
  "overlaps": "<what it overlaps with in their existing evidence; empty string if little>",
  "addressesGap": true/false,
  "gapNote": "<which recognition/evidence gap it addresses, or why it doesn't>",
  "effortNote": "<approximate time/effort if inferable; otherwise say it's unclear>",
  "timingNote": "<whether timing makes sense given today's date, or that it can't be judged>",
  "rationale": "<the concise reasoning behind the verdict>"
}`;

export function buildOpportunityExperimentPrompt(input: {
  opportunityText: string;
  fieldKey: string;
  recognition: RecognitionProfile;
  gradeLevel: string;
  today: string;
}): string {
  const { opportunityText, fieldKey, recognition, gradeLevel, today } = input;
  const lines: string[] = [];

  lines.push(`## Today's date\n${today}`);

  lines.push("\n## Student");
  lines.push(`Grade level: ${gradeLevel || "Not specified"}`);
  lines.push(
    `Intended field: ${MAJOR_LABELS[fieldKey] ?? (fieldKey || "Undecided")}`,
  );

  lines.push("\n## What their recognition already demonstrates (award-backed)");
  if (recognition.demonstrated.length > 0) {
    for (const d of recognition.demonstrated) {
      lines.push(`- ${THEME_LABELS[d.theme]} (${d.strength})`);
    }
  } else {
    lines.push("- Nothing with external recognition yet.");
  }

  lines.push(
    "\n## Their recognition gaps (evidence exists, recognition doesn't)",
  );
  if (recognition.gaps.length > 0) {
    for (const g of recognition.gaps) {
      lines.push(
        `- ${THEME_LABELS[g.theme]}${g.isIntendedField ? " (intended field)" : ""}`,
      );
    }
  } else {
    lines.push("- None flagged.");
  }
  if (recognition.uncoveredFieldThemes.length > 0) {
    lines.push(
      `Field-relevant themes with no evidence: ${recognition.uncoveredFieldThemes.map((t) => THEME_LABELS[t]).join(", ")}`,
    );
  }

  lines.push("\n## The opportunity the student wants to test");
  lines.push(opportunityText.trim());

  lines.push(
    "\n---\nGive your short, practical read. Respond with the JSON object only.",
  );

  return lines.join("\n");
}
