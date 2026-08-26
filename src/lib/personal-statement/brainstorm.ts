// Shared brainstorming constants + input types — imported by both the client
// panel and the AI engine, so the exercise set and the saved shape never drift.
// No server-only imports here (safe to use in a "use client" component).

import { z } from "zod";

export type FreewriteAnswers = Record<string, string>;

export type BrainstormInputs = {
  /** "The student who…" one-sentence completion. */
  studentWho: string;
  /** ~20 ordinary objects connected to the student's life. */
  objects: string[];
  /** Personal values the student named. */
  values: string[];
  /** The one central / non-negotiable value (chosen from `values`). */
  centralValue: string;
  /** Answers to the freewriting questions, keyed by question id. */
  freewrites: FreewriteAnswers;
};

export const EMPTY_BRAINSTORM_INPUTS: BrainstormInputs = {
  studentWho: "",
  objects: [],
  values: [],
  centralValue: "",
  freewrites: {},
};

/** The freewriting prompts (spec §3). All optional — the student answers any. */
export const FREEWRITING_QUESTIONS: { id: string; question: string }[] = [
  { id: "unprompted", question: "What do you do when nobody tells you to?" },
  { id: "curious", question: "What have you become unusually curious about?" },
  {
    id: "changed-belief",
    question: "What is something you once believed that you no longer believe?",
  },
  {
    id: "vivid-moment",
    question:
      "What small moment do you remember much more vividly than you expected?",
  },
  {
    id: "failure",
    question: "What failure or awkward experience changed how you think?",
  },
  {
    id: "off-transcript",
    question:
      "What is something about you that wouldn't appear anywhere on your transcript?",
  },
  {
    id: "return-to",
    question:
      "What is something you repeatedly return to simply because you care about it?",
  },
];

/** Optional value chips to help students who stare at a blank box. */
export const VALUE_SUGGESTIONS: string[] = [
  "Honesty",
  "Curiosity",
  "Loyalty",
  "Independence",
  "Creativity",
  "Fairness",
  "Perseverance",
  "Kindness",
  "Craft",
  "Family",
  "Freedom",
  "Growth",
  "Community",
  "Humor",
  "Discipline",
  "Adventure",
];

export const MAX_OBJECTS = 20;

/** Validation for persisted/submitted brainstorm inputs (bounds only). */
export const brainstormInputsSchema = z.object({
  studentWho: z.string().max(500).default(""),
  objects: z.array(z.string().trim().max(120)).max(MAX_OBJECTS).default([]),
  values: z.array(z.string().trim().max(60)).max(20).default([]),
  centralValue: z.string().max(60).default(""),
  freewrites: z.record(z.string(), z.string().max(2000)).default({}),
});

/** True when there's enough to reflect on (avoid spending a generation on nothing). */
export function hasBrainstormContent(inputs: BrainstormInputs): boolean {
  return (
    inputs.studentWho.trim().length > 0 ||
    inputs.objects.length > 0 ||
    inputs.values.length > 0 ||
    Object.values(inputs.freewrites).some((a) => a.trim().length > 0)
  );
}
