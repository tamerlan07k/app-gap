// The seven Common App personal-statement prompts (2025–26 cycle, unchanged from
// 2024–25). These are the public, standard prompts every applicant chooses from.
//
// The final prompt ("own") is the free-choice option: selecting it reveals a
// text field where the student writes their own prompt (stored in
// personal_statements.custom_prompt). `custom: true` flags that behavior.
//
// Kept as plain data (not in the DB) so the workspace, and later the AI coach,
// share one source of truth. prompt_id is stored as text on the row; validate
// against this set with isKnownPromptId().

export type PromptId =
  | "background"
  | "challenge"
  | "belief"
  | "gratitude"
  | "accomplishment"
  | "engaging"
  | "own";

export type EssayPrompt = {
  id: PromptId;
  /** Short label for tabs/switchers. */
  label: string;
  /** The full official prompt text. */
  text: string;
  /** True for the free-choice prompt, which reveals a custom-prompt field. */
  custom?: boolean;
};

export const ESSAY_PROMPTS: EssayPrompt[] = [
  {
    id: "background",
    label: "Background & identity",
    text: "Some students have a background, identity, interest, or talent that is so meaningful they believe their application would be incomplete without it. If this sounds like you, then please share your story.",
  },
  {
    id: "challenge",
    label: "Challenge or setback",
    text: "The lessons we take from obstacles we encounter can be fundamental to later success. Recount a time when you faced a challenge, setback, or failure. How did it affect you, and what did you learn from the experience?",
  },
  {
    id: "belief",
    label: "Questioning a belief",
    text: "Reflect on a time when you questioned or challenged a belief or idea. What prompted your thinking? What was the outcome?",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    text: "Reflect on something that someone has done for you that has made you happy or thankful in a surprising way. How has this gratitude affected or motivated you?",
  },
  {
    id: "accomplishment",
    label: "Growth & realization",
    text: "Discuss an accomplishment, event, or realization that sparked a period of personal growth and a new understanding of yourself or others.",
  },
  {
    id: "engaging",
    label: "Engaging topic",
    text: "Describe a topic, idea, or concept you find so engaging that it makes you lose all track of time. Why does it captivate you? What or who do you turn to when you want to learn more?",
  },
  {
    id: "own",
    label: "Topic of your choice",
    text: "Share an essay on any topic of your choice. It can be one you've already written, one that responds to a different prompt, or one of your own design.",
    custom: true,
  },
];

const PROMPT_BY_ID = new Map<string, EssayPrompt>(
  ESSAY_PROMPTS.map((p) => [p.id, p]),
);

/** The official recommended maximum length for the Common App personal statement. */
export const WORD_LIMIT = 650;

export function isKnownPromptId(value: string): value is PromptId {
  return PROMPT_BY_ID.has(value);
}

export function getPrompt(id: string): EssayPrompt | null {
  return PROMPT_BY_ID.get(id) ?? null;
}

/** True when this prompt reveals the "write your own prompt" field. */
export function isCustomPrompt(id: string): boolean {
  return PROMPT_BY_ID.get(id)?.custom ?? false;
}

/** Count words the same way everywhere (workspace display + server persistence). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}
