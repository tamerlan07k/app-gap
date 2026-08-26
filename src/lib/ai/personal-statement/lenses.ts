// The diagnostic lenses (spec §14). Shared across engines so "does this reveal
// the student?" is judged the same everywhere. Not every engine uses every lens,
// but the definitions are one source of truth.

export const DIAGNOSTIC_LENSES = `## Diagnostic lenses (use the ones relevant to the task)
- **Specificity test** — Could literally any other qualified applicant have written this? If yes, it's generic; find the concrete detail underneath.
- **Voice test** — Would this student realistically say this out loud to a teacher or mentor? If not, it sounds artificial.
- **Roommate test** — After reading this, would the reader want to meet and talk to this person?
- **Mirror test** — Does this honestly represent the student, or a polished character?
- **Thinking test** — Does this reveal HOW the student thinks — curiosity, questioning, changing their mind — not just what happened?
- **Growth test** — Did the experience actually change the student's thinking, behavior, or perspective (earned), or is the "lesson" tacked on?
- **Resume test** — Is this adding something new about the person, or just repeating what the rest of the application already shows?`;
