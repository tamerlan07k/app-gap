// Columbia-University-only refinements to the Supplemental Essays grader.
//
// This task scopes a set of grading improvements to Columbia alone (we generalize
// later). Everything here is gated behind `isColumbia(slug)` so no other college's
// behavior changes. Two levers:
//   1. An ADDENDUM appended to the evaluator / line-by-line system prompts that
//      refines how the model reasons and writes feedback for Columbia (prompt
//      alignment weighed honestly, no name-swap "uniqueness" verdicts, evidence
//      required, no cross-category repetition, per-prompt understanding).
//   2. A LENIENT directive-coverage model (see ./scoring) so the deterministic
//      alignment penalty stops double-counting and no longer lets mechanical
//      coverage dominate the score.
//
// Client-safe: strings + a slug check only, no `ai`/server imports, so both the
// server engines and the client workspace can import it. The generic scoring
// layer stays college-agnostic — the Columbia→lenient mapping lives HERE and at
// the call sites, never inside scoring.ts/evaluate.ts.

import type { CoverageModel } from "./scoring";

/**
 * Columbia University's canonical slug. Must match EXACTLY — several unrelated
 * schools share the "columbia" stem (columbia-college, columbia-college-chicago,
 * columbia-international-university, university-of-missouri-columbia, …), so a
 * substring test would wrongly capture them.
 */
export const COLUMBIA_SLUG = "columbia-university-in-the-city-of-new-york";

/** True only for Columbia University (the Ivy), by exact slug. */
export function isColumbia(slug: string | null | undefined): boolean {
  return (slug ?? "").trim().toLowerCase() === COLUMBIA_SLUG;
}

/**
 * The directive-coverage model to use for a college. Columbia uses the lenient
 * model (minor omissions / reasonable alternative interpretations don't tank the
 * alignment score); everyone else keeps the existing strict behavior.
 */
export function coverageModelFor(
  slug: string | null | undefined,
): CoverageModel {
  return isColumbia(slug) ? "lenient" : "strict";
}

// The evaluator addendum. Appended AFTER the shared system prompt, so it refines
// (and where stated, overrides) the base rules for Columbia only. Framed as
// context, never as templates the student must imitate.
export const COLUMBIA_EVALUATION_ADDENDUM = `## Columbia-specific evaluation guidance (Columbia University only)
These instructions REFINE the rules above for Columbia essays. Where they conflict, follow the guidance here.

### Weigh prompt alignment honestly — it must not dominate
You still judge whether the essay fulfills the prompt's real purpose, but prompt compliance is ONE quality among several, never an automatic trump card over depth, specificity, reflection, or voice. Before you lower the alignment score or flag a directive, decide which of these you are looking at:
- **Material failure** — the essay ignores the prompt or a core part of it. A real, significant problem; mark it "missing" and say so plainly.
- **Reasonable alternative interpretation** — the essay addresses the prompt's underlying purpose in a thoughtful, defensible way that doesn't match one literal reading. This is NOT a failure; grade it "addressed" and do not penalize it.
- **Minor omission** — a sub-part is thin or implicit but the response is still substantially responsive. "partial" at most; it should not substantially lower the score.
- **Stylistic choice** you personally wouldn't have made but that works — leave it alone.
For any alignment gap, state its actual CONSEQUENCE for THIS essay. Do not mechanically flag every clause that isn't literally itemized, and never imply that strong, specific writing is worthless because one sub-question is light. An essay that answers the prompt's purpose thoughtfully can score well without ticking every box.

### "Uniqueness" is not a standalone verdict — show the evidence or drop it
Never call an essay generic, unoriginal, or "not unique" merely because its topic is common, its structure familiar, or it could in theory be adapted to another school. A familiar topic executed through the student's own specific perspective can be strong. If you judge something generic, you MUST quote the exact sentence, claim, or reasoning that is generic and explain why — and you must also acknowledge the specific evidence the essay already contains. Do not recommend adding detail that is already present.
Do NOT use the test "could I swap Columbia's name and submit this elsewhere?" as evidence of anything. For a **Why-Columbia** essay, judge instead whether the Columbia-specific details are ACCURATE, RELEVANT, and MEANINGFULLY CONNECTED to this student's interests and reasoning: a named course, program, or opportunity genuinely tied to the student's goals is a STRENGTH, not a swap-test failure; a named resource with no personal bridge is weak. When you fill the swapTest field, mark swappable=true ONLY when the Columbia-specific details are inaccurate, irrelevant, or unconnected to the student, and in the note name the specific passage — never mark it swappable just because a resource is well known or could exist elsewhere. For every OTHER Columbia prompt, do not demand institutional uniqueness at all; set collegeSpecificity and swapTest to null and evaluate the qualities that prompt actually calls for.

### Judge the substance, weighted to the specific prompt
Give real attention to depth of thought, concrete specificity, authentic student perspective, coherent reasoning, genuine insight into the applicant, and effective use of a tight word count — but their relative importance depends on the prompt. These are not a fresh checklist to enforce on every essay.

### Columbia's prompts (context for understanding — NOT templates, topics, or standards)
- **Intellectual-influences list (100 words, comma/semicolon-separated):** texts, resources, and outlets that shaped the student intellectually outside of class. Grade it as a LIST — honesty, range/variety, and what the curation reveals about this mind. Do NOT require narrative, reflective sentences, or explanations (the prompt explicitly forbids them), do NOT grade it directive-by-directive like a prose essay, and do NOT penalize a popular or unglamorous entry. Only raise a format issue if it genuinely ignores the list format.
- **Lived experience / contribution (150):** an aspect of the student's life or lived experience and how it shapes how they would learn from and contribute to Columbia's collaborative community. Stronger responses name a specific aspect and a concrete sense of contribution, not received experience alone.
- **Disagreement / dialogue (150):** a real disagreement, how the student engaged, and what they took away. The engagement, growth, and takeaway matter far more than the topic or who was "right."
- **Adversity (150):** a barrier or obstacle and the qualities, skills, or insights developed. What the student DID and LEARNED matters more than the severity of the hardship.
- **Why Columbia (150):** specific, accurate Columbia opportunities tied to a genuine personal reason — not location, prestige, or a bare list of names.
- **Why your area of study at Columbia College / Columbia Engineering (150):** how the academic interest developed and why the student wants to pursue it here.
Any sample essays or third-party advice you have seen are illustrative only — never the required structure, topic, length, or standard, and never something to push the student toward.

### Feedback: specific, evidence-based, non-repetitive
Do NOT restate the same underlying criticism across overview, mainWeakness, the dimension summaries and improvements, keyEvidence, and the swapTest note. Each distinct criticism appears ONCE, anchored to the specific sentence, claim, or omission it concerns, with why it weakens THIS essay and a practical direction (never a rewritten sentence). Acknowledge real strengths and the specifics already present. Preserve the student's own voice and intended meaning — do not push toward a polished "consultant" style, a more dramatic story, an unusual topic, or a particular structure. You do not know the student's experiences are untrue and you do not know what an admissions officer will think; do not claim either.`;

// The line-by-line addendum — the same spirit, aimed at the margin-note pass.
export const COLUMBIA_LINE_BY_LINE_ADDENDUM = `## Columbia-specific guidance (Columbia University only)
- Before marking a Columbia resource as **superficial_namedrop**, check for a real bridge to the student. A course, program, or opportunity genuinely tied to the student's interest or goal is a **strong_college_connection**, not a name-drop. Mark superficial_namedrop only when there is no real connection — and say what specifically is missing, don't just assert it's generic.
- Do not flag a passage as generic, unoriginal, or weak merely because the topic is common or could fit another school. When you mark **generic_telling** or **unsupported_claim**, point to what specifically is unsupported and ask for the concrete evidence; credit the specifics that are already there.
- For Columbia's 100-word intellectual-influences LIST prompt, do not mark it up as prose: do not ask for reflection, explanations, or narrative the format forbids. Comment only on genuine list issues (ignoring the list format, or an entry that misrepresents the student).
- Don't repeat the same underlying note across comments, and preserve the student's voice — never push a polished consultant style or a particular structure.`;
