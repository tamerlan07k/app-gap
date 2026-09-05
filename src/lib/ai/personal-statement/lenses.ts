// The diagnostic lenses (spec §14). Shared across engines so "does this reveal
// the student?" is judged the same everywhere. Not every engine uses every lens,
// but the definitions are one source of truth.

type Lens = { name: string; text: string };

// The lenses, in order. The `scored` flag marks whether a lens may inform a
// numeric essay score. The Resume test compares the essay against the rest of
// the application, so it is feedback-only (scored: false) — a 0–100 essay-
// quality score must not move because of what else is on the application.
const LENSES: Array<Lens & { scored: boolean }> = [
  {
    name: "Specificity test",
    text: "Could literally any other qualified applicant have written this? If yes, it's generic; find the concrete detail underneath.",
    scored: true,
  },
  {
    name: "Voice test",
    text: "Would this student realistically say this out loud to a teacher or mentor? If not, it sounds artificial.",
    scored: true,
  },
  {
    name: "Roommate test",
    text: "After reading this, would the reader want to meet and talk to this person?",
    scored: true,
  },
  {
    name: "Mirror test",
    text: "Does this honestly represent the student, or a polished character?",
    scored: true,
  },
  {
    name: "Thinking test",
    text: "Does this reveal HOW the student thinks — curiosity, questioning, changing their mind — not just what happened?",
    scored: true,
  },
  {
    name: "Growth test",
    text: 'Did the experience actually change the student\'s thinking, behavior, or perspective (earned), or is the "lesson" tacked on?',
    scored: true,
  },
  {
    name: "Resume test",
    text: "Is this adding something new about the person, or just repeating what the rest of the application already shows?",
    scored: false,
  },
];

const HEADER = "## Diagnostic lenses (use the ones relevant to the task)";

function render(lenses: Lens[]): string {
  return [HEADER, ...lenses.map((l) => `- **${l.name}** — ${l.text}`)].join(
    "\n",
  );
}

// Every lens, including the Resume test. Used by the coaching/feedback engines
// (line-by-line, draft-analysis, brainstorm) whose output is guidance, never a
// numeric score.
export const DIAGNOSTIC_LENSES = render(LENSES);

// The scoring-safe subset — every lens EXCEPT the Resume test. Used by the
// graded evaluation, whose four category scores must judge the essay text alone
// and never be lowered because the essay overlaps with the rest of the
// application. Overlap is still handled, but as feedback (see evaluation.ts).
export const ESSAY_SCORING_LENSES = render(LENSES.filter((l) => l.scored));
