// Supplemental-essay archetypes and the DYNAMIC weighting they drive.
//
// The system is prompt-first: the parser reads the ACTUAL prompt and classifies
// it into a primary archetype (plus optional secondaries when several genuinely
// apply — we never force a hybrid prompt into one box). The archetype then
// selects the weight balance used to combine the four dimension scores into an
// overall (see ./scoring). These weights are AppGap heuristics informed by
// admissions guidance — starting points, not scientific constants — and the UI
// always explains which balance was used and why.
//
// Client-safe (no server imports).

import {
  DIMENSION_KEYS,
  type DimensionKey,
  type DimensionWeights,
} from "./scoring";

export type SupplementArchetype =
  | "why_us" // Why Us / institutional fit
  | "why_major" // Why Major / academic interest
  | "community" // Community / contribution
  | "identity" // Identity / background / lived experience
  | "intellectual_curiosity" // Intellectual curiosity
  | "challenge" // Challenge / adversity / failure
  | "leadership" // Leadership
  | "activity" // Activity depth
  | "values" // Values / what matters and why
  | "future_goals" // Future goals
  | "personality" // Personality / roommate / quirky
  | "open_ended" // Open-ended
  | "short_answer" // Very short answer
  | "hybrid"; // Hybrid / custom / doesn't fit cleanly

export const ARCHETYPES: SupplementArchetype[] = [
  "why_us",
  "why_major",
  "community",
  "identity",
  "intellectual_curiosity",
  "challenge",
  "leadership",
  "activity",
  "values",
  "future_goals",
  "personality",
  "open_ended",
  "short_answer",
  "hybrid",
];

export const ARCHETYPE_LABELS: Record<SupplementArchetype, string> = {
  why_us: "Why Us / Institutional Fit",
  why_major: "Why Major / Academic Interest",
  community: "Community / Contribution",
  identity: "Identity / Background / Lived Experience",
  intellectual_curiosity: "Intellectual Curiosity",
  challenge: "Challenge / Adversity / Failure",
  leadership: "Leadership",
  activity: "Activity Depth",
  values: "Values / What Matters and Why",
  future_goals: "Future Goals",
  personality: "Personality / Roommate / Quirky",
  open_ended: "Open-Ended",
  short_answer: "Very Short Answer",
  hybrid: "Hybrid / Custom",
};

// Short descriptions handed to the parser so it classifies consistently. These
// are guidance for the model, not user-facing copy.
export const ARCHETYPE_DESCRIPTIONS: Record<SupplementArchetype, string> = {
  why_us:
    "Why this specific college — fit between the student and the institution's concrete resources, culture, or approach.",
  why_major:
    "Why this field/major — the academic interest, what sparked it, and what the student wants to study.",
  community:
    "A community the student belongs to or contributes to, and what they bring to or take from it.",
  identity:
    "The student's background, identity, or lived experience and how it shaped them.",
  intellectual_curiosity:
    "What the student is intellectually curious about — an idea, question, or topic they explore for its own sake.",
  challenge:
    "A challenge, setback, adversity, or failure and how the student responded (agency and learning, not severity).",
  leadership:
    "A leadership experience — influencing, organizing, or taking responsibility for others.",
  activity:
    "Deeper reflection on one activity, project, or commitment the student is involved in.",
  values:
    "What the student values or cares about and why — a belief, principle, or what matters to them.",
  future_goals: "The student's goals and what they hope to do or become.",
  personality:
    "Personality-revealing, roommate-style, or 'quirky' prompts meant to show who the student is.",
  open_ended:
    "Open-ended or 'write about anything' prompts with wide latitude.",
  short_answer:
    "A very short answer (roughly a sentence to ~100 words) — a list, a favorite, a quick take.",
  hybrid: "A custom or hybrid prompt that doesn't fit one category cleanly.",
};

// ─── Base weight table (integers, each row sums to 100) ───────────────────────
//
// Starting points, informed by what each essay type is really testing. The spec's
// examples are encoded directly: Why Us leans on specificity/proof-of-fit; a
// short answer on alignment + specificity (there's no room for deep reflection);
// open-ended/creative on reflection + voice. Order per row: alignment, reflection,
// specificity, voice.

export const ARCHETYPE_WEIGHTS: Record<SupplementArchetype, DimensionWeights> =
  {
    why_us: { alignment: 30, reflection: 15, specificity: 40, voice: 15 },
    why_major: { alignment: 25, reflection: 25, specificity: 35, voice: 15 },
    community: { alignment: 25, reflection: 30, specificity: 30, voice: 15 },
    identity: { alignment: 15, reflection: 35, specificity: 25, voice: 25 },
    intellectual_curiosity: {
      alignment: 20,
      reflection: 35,
      specificity: 30,
      voice: 15,
    },
    challenge: { alignment: 15, reflection: 40, specificity: 25, voice: 20 },
    leadership: { alignment: 25, reflection: 30, specificity: 30, voice: 15 },
    activity: { alignment: 20, reflection: 30, specificity: 35, voice: 15 },
    values: { alignment: 20, reflection: 35, specificity: 30, voice: 15 },
    future_goals: { alignment: 25, reflection: 30, specificity: 30, voice: 15 },
    personality: { alignment: 15, reflection: 25, specificity: 25, voice: 35 },
    open_ended: { alignment: 15, reflection: 35, specificity: 20, voice: 30 },
    short_answer: { alignment: 35, reflection: 15, specificity: 35, voice: 15 },
    hybrid: { alignment: 25, reflection: 25, specificity: 25, voice: 25 },
  };

// A balanced fallback used when an archetype is somehow unknown.
export const DEFAULT_WEIGHTS: DimensionWeights = {
  alignment: 30,
  reflection: 25,
  specificity: 25,
  voice: 20,
};

/**
 * Word limit at/under which a prompt is treated as a "very short answer" for
 * weighting, regardless of its topical archetype: there is no room for developed
 * reflection in ~100 words, so alignment + specificity carry the balance.
 */
export const SHORT_ANSWER_WORD_MAX = 100;

// Weight the primary archetype gets when blending with a single secondary.
const PRIMARY_BLEND = 0.7;
const SECONDARY_BLEND = 0.3;

/**
 * Normalize a set of (possibly fractional) weights to integers summing to
 * exactly 100 using the largest-remainder method, so the displayed percentages
 * always add up.
 */
export function normalizeWeightsTo100(
  raw: Record<DimensionKey, number>,
): DimensionWeights {
  const total = DIMENSION_KEYS.reduce((acc, k) => acc + (raw[k] ?? 0), 0);
  if (total <= 0) return { ...DEFAULT_WEIGHTS };

  const scaled = DIMENSION_KEYS.map((k) => {
    const exact = ((raw[k] ?? 0) / total) * 100;
    return {
      key: k,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  const used = scaled.reduce((acc, s) => acc + s.floor, 0);
  let leftover = 100 - used;
  // Hand the leftover points to the largest remainders first.
  const byRemainder = [...scaled].sort((a, b) => b.remainder - a.remainder);
  const result = {} as DimensionWeights;
  for (const s of scaled) result[s.key] = s.floor;
  let i = 0;
  while (leftover > 0 && byRemainder.length > 0) {
    result[byRemainder[i % byRemainder.length].key] += 1;
    leftover -= 1;
    i += 1;
  }
  return result;
}

export type ResolvedWeighting = {
  weights: DimensionWeights;
  /** Plain-language explanation of why this balance was chosen. */
  rationale: string;
};

/**
 * Resolve the dimension weights for an essay from its parsed archetype(s) and
 * word limit. Rules, in order:
 *   1. A very short word limit forces the short-answer balance (brevity wins over
 *      topic — you can't grade deep reflection in 60 words).
 *   2. Otherwise the primary archetype's weights are used, optionally blended
 *      70/30 with the FIRST secondary archetype (so a "Why Major + Intellectual
 *      Curiosity" prompt isn't judged as pure Why Major).
 * Always returns integer weights summing to 100, plus a rationale for the UI.
 */
export function resolveWeights(
  primary: SupplementArchetype,
  secondaries: SupplementArchetype[] = [],
  wordLimit: number | null = null,
): ResolvedWeighting {
  if (
    wordLimit != null &&
    wordLimit > 0 &&
    wordLimit <= SHORT_ANSWER_WORD_MAX
  ) {
    return {
      weights: { ...ARCHETYPE_WEIGHTS.short_answer },
      rationale: `With about ${wordLimit} words there isn't room for developed reflection, so the score leans on directly answering the prompt and concrete specifics over depth.`,
    };
  }

  const base = ARCHETYPE_WEIGHTS[primary] ?? DEFAULT_WEIGHTS;
  const secondary = secondaries.find(
    (s) => s !== primary && ARCHETYPE_WEIGHTS[s],
  );

  if (!secondary) {
    return {
      weights: { ...base },
      rationale: `${ARCHETYPE_LABELS[primary]} prompts are weighted toward ${topWeighted(base)} — that's what this kind of question is really testing.`,
    };
  }

  const secBase = ARCHETYPE_WEIGHTS[secondary];
  const blended = {} as Record<DimensionKey, number>;
  for (const k of DIMENSION_KEYS) {
    blended[k] = base[k] * PRIMARY_BLEND + secBase[k] * SECONDARY_BLEND;
  }
  const weights = normalizeWeightsTo100(blended);
  return {
    weights,
    rationale: `Weighted mostly as a ${ARCHETYPE_LABELS[primary]} prompt with a ${ARCHETYPE_LABELS[secondary]} element, so the balance emphasizes ${topWeighted(weights)}.`,
  };
}

// The two highest-weighted dimensions, as a human phrase for the rationale.
function topWeighted(weights: DimensionWeights): string {
  const labels: Record<DimensionKey, string> = {
    alignment: "answering every part of the prompt",
    reflection: "reflective depth",
    specificity: "concrete specifics",
    voice: "authentic voice",
  };
  const sorted = DIMENSION_KEYS.slice().sort((a, b) => weights[b] - weights[a]);
  return `${labels[sorted[0]]} and ${labels[sorted[1]]}`;
}
