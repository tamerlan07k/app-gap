// Client-safe display metadata for the Activities workspace: qualitative-band
// labels and Tailwind tone classes. No server imports, so client components can
// use these without pulling in prompt/AI code. Colors use the brand-teal accent
// for the strong end and semantic amber/muted for weaker bands — deliberately
// NOT a red "bad" signal, because a low band never means an activity is bad.

import type {
  AlignmentBand,
  DifficultyBand,
  StrengthBand,
  Verdict,
} from "~/lib/ai/activities-schema";

type Tone = { label: string; badge: string };

export const STRENGTH_META: Record<StrengthBand, Tone> = {
  emerging: {
    label: "Emerging",
    badge: "bg-muted text-muted-foreground",
  },
  developing: {
    label: "Developing",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  strong: {
    label: "Strong",
    badge: "bg-brand-teal/10 text-brand-teal",
  },
  exceptional: {
    label: "Exceptional",
    badge: "bg-brand-teal/15 text-brand-teal",
  },
};

export const ALIGNMENT_META: Record<AlignmentBand, Tone> = {
  high: { label: "High field fit", badge: "bg-brand-teal/10 text-brand-teal" },
  medium: {
    label: "Medium field fit",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  low: { label: "Low field fit", badge: "bg-muted text-muted-foreground" },
  none: {
    label: "Different area",
    badge: "bg-muted text-muted-foreground",
  },
};

export const DIFFICULTY_META: Record<DifficultyBand, Tone> = {
  beginner: {
    label: "Beginner",
    badge: "bg-brand-teal/10 text-brand-teal",
  },
  moderate: {
    label: "Moderate",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  advanced: {
    label: "Advanced",
    badge: "bg-muted text-muted-foreground",
  },
};

export const VERDICT_META: Record<Verdict, Tone & { blurb: string }> = {
  continue: {
    label: "Continue",
    badge: "bg-brand-teal/10 text-brand-teal",
    blurb: "Meaningful involvement worth carrying forward.",
  },
  deepen: {
    label: "Deepen",
    badge: "bg-brand-teal/15 text-brand-teal",
    blurb: "Worth investing more into — there's room to grow.",
  },
  maintain: {
    label: "Maintain",
    badge: "bg-muted text-muted-foreground",
    blurb: "Fine to keep — just not where extra time is best spent.",
  },
  reconsider: {
    label: "Reconsider time",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    blurb: "The same hours might do more elsewhere — your call.",
  },
};
