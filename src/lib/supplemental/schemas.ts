// Zod output contracts for every Supplemental Essays AI engine, plus their
// inferred TS types. Kept here (zod only, no `ai`/server imports) so BOTH the
// server engines and the client workspace can import the schema/types without
// pulling the AI SDK into the browser bundle. The engines in
// src/lib/ai/supplemental/ import these; the client re-validates cached jsonb
// with them via safeParse.

import { z } from "zod";
import { ARCHETYPES, type SupplementArchetype } from "./archetypes";
import { DIMENSION_KEYS, type DimensionKey } from "./scoring";

const archetypeEnum = z.enum(
  ARCHETYPES as [SupplementArchetype, ...SupplementArchetype[]],
);
const dimensionEnum = z.enum(
  DIMENSION_KEYS as [DimensionKey, ...DimensionKey[]],
);

// ─── Prompt parse (the prompt-first core) ─────────────────────────────────────

export const parseSchema = z.object({
  // Core intent / what the prompt is really trying to learn.
  corePurpose: z.string(),
  // "What this prompt is really asking", in plain language for the student.
  plainLanguageAsk: z.string(),
  primaryArchetype: archetypeEnum,
  // Additional archetypes when several genuinely apply (don't force one box).
  secondaryArchetypes: z.array(archetypeEnum).max(3),
  // Every EXPLICIT directive / sub-question the prompt asks. These are what the
  // evaluation grades coverage against, so keep them concrete and answerable.
  directives: z.array(z.string()).max(8),
  // Required format or explicit constraints (e.g. "in a list", "one paragraph").
  constraints: z.array(z.string()).max(6),
  // The stated word limit, or null if none is stated.
  wordLimit: z.number().int().positive().nullable(),
  // What the prompt appears to be trying to learn about the applicant.
  whatItReveals: z.string(),
  // The actual things the student needs to answer (may include implicit ones) —
  // guidance for the "what is this really asking" panel.
  thingsToAnswer: z.array(z.string()).max(6),
});

export type PromptParse = z.infer<typeof parseSchema>;

// ─── Graded evaluation ────────────────────────────────────────────────────────

const evalDimensionSchema = z.object({
  key: dimensionEnum,
  score: z.number().int().min(0).max(100),
  summary: z.string(),
  strengths: z.array(z.string()).max(3),
  improvements: z.array(z.string()).max(3),
});

export type EvalDimension = z.infer<typeof evalDimensionSchema>;

const gradedDirectiveSchema = z.object({
  directive: z.string(),
  status: z.enum(["addressed", "partial", "missing"]),
  note: z.string(),
});

export const evaluationSchema = z.object({
  overview: z.string(),
  // Exactly the four dimensions (each once). Overall is computed in code.
  dimensions: z.array(evalDimensionSchema).min(1).max(4),
  // The parse's directives, each graded for coverage.
  directives: z.array(gradedDirectiveSchema).max(8),
  // The single biggest issue holding the essay back.
  mainWeakness: z.string(),
  // Exact evidence: a verbatim quote from the essay + why it creates an issue.
  keyEvidence: z
    .array(z.object({ quote: z.string(), issue: z.string() }))
    .max(5),
  // Questions that make the student think and revise themselves.
  guidedQuestions: z.array(z.string()).max(5),
  // College-specificity read, only for Why-Us / institutional-fit prompts.
  collegeSpecificity: z.enum(["strong", "adequate", "weak"]).nullable(),
  // The "swap test" heuristic for Why-Us: could the college name + resources be
  // swapped for a peer and the essay still work? null when not applicable.
  swapTest: z.object({ swappable: z.boolean(), note: z.string() }).nullable(),
});

export type RawEvaluation = z.infer<typeof evaluationSchema>;

// ─── Line-by-line ─────────────────────────────────────────────────────────────

export const LBL_CATEGORIES = [
  "strong_evidence",
  "strong_reflection",
  "generic_telling",
  "missing_explanation",
  "repetitive",
  "unsupported_claim",
  "strong_college_connection",
  "superficial_namedrop",
  "directive_missing",
] as const;

export type LineByLineCategory = (typeof LBL_CATEGORIES)[number];

const lblCommentSchema = z.object({
  category: z.enum(LBL_CATEGORIES),
  // Verbatim substring of the essay to highlight. May be empty ONLY for
  // "directive_missing" (there is no text to point at for something absent).
  quote: z.string(),
  what: z.string(),
  why: z.string(),
  suggestion: z.string().nullable().optional(),
  question: z.string().nullable().optional(),
});

export type LineByLineComment = z.infer<typeof lblCommentSchema>;

export const lineByLineSchema = z.object({
  overview: z.string(),
  comments: z.array(lblCommentSchema).max(40),
});

export type LineByLineAnalysis = z.infer<typeof lineByLineSchema>;

// ─── Application-level redundancy / value-add ─────────────────────────────────

export const REDUNDANCY_SOURCES = [
  "personal_statement",
  "activities",
  "additional_info",
  "other_supplement",
] as const;

export type RedundancySource = (typeof REDUNDANCY_SOURCES)[number];

export const redundancySchema = z.object({
  overview: z.string(),
  // Overall read: distinct / some overlap / repetitive.
  repetition: z.enum(["distinct", "some_overlap", "repetitive"]),
  // Whether the essay reveals a genuinely new dimension of the applicant.
  newDimension: z.boolean(),
  // What new dimension it adds (or what it merely repeats).
  valueAdd: z.string(),
  overlaps: z
    .array(
      z.object({
        source: z.enum(REDUNDANCY_SOURCES),
        detail: z.string(),
        severity: z.enum(["minor", "notable", "heavy"]),
      }),
    )
    .max(6),
  suggestions: z.array(z.string()).max(4),
});

export type RedundancyAnalysis = z.infer<typeof redundancySchema>;
