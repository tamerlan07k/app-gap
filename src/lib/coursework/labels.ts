// Client-safe display metadata for the Coursework workspace: labels, dots, and
// Tailwind tone classes for the five-state finding framework, preparation bands,
// trajectory, and course levels. No server imports, so client components can use
// these directly. The five-state colors follow the product's 🟢🟡🟠🔴⚪ framework
// but stay restrained — the "potential gap" tone is a soft rose, never an alarm,
// because a finding is analysis, not a verdict.

import type {
  AvailabilityState,
  CourseLevel,
  FieldStrengthRating,
  FindingStatus,
  Importance,
  PreparationBand,
  TrajectoryDirection,
  WhatIfEffect,
} from "./types";

type Tone = { label: string; badge: string; dot: string };

export const FINDING_STATUS_META: Record<
  FindingStatus,
  Tone & { blurb: string }
> = {
  strength: {
    label: "Strength",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
    blurb: "Genuinely well-prepared here.",
  },
  opportunity: {
    label: "Opportunity",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    blurb: "Available to you and worth considering — not a shortfall.",
  },
  developing: {
    label: "Developing",
    badge: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
    blurb: "Some preparation present, with room to go further.",
  },
  "potential-gap": {
    label: "Potential gap",
    badge: "bg-rose-500/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-500",
    blurb: "A widely-available foundation your coursework doesn't yet show.",
  },
  unavailable: {
    label: "Not available",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
    blurb: "Your school doesn't offer this — not counted against you.",
  },
  unknown: {
    label: "Needs context",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
    blurb: "Availability unknown — treated as context, not a gap.",
  },
};

export const PREPARATION_BAND_META: Record<PreparationBand, Tone> = {
  limited: {
    label: "Limited",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  developing: {
    label: "Developing",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  solid: {
    label: "Solid",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
  strong: {
    label: "Strong",
    badge: "bg-brand-teal/15 text-brand-teal",
    dot: "bg-brand-teal",
  },
};

export const TRAJECTORY_META: Record<
  TrajectoryDirection,
  { label: string; blurb: string }
> = {
  increasing: {
    label: "Rising rigor",
    blurb: "Your course rigor increases across your high-school years.",
  },
  steady: {
    label: "Steady rigor",
    blurb: "Your course rigor holds a consistent level across the years.",
  },
  decreasing: {
    label: "Easing rigor",
    blurb:
      "Your most rigorous coursework is earlier than later — worth a look.",
  },
  "insufficient-data": {
    label: "Not enough data",
    blurb: "Add the grade level for your courses to see your rigor trajectory.",
  },
};

export const LEVEL_META: Record<CourseLevel, Tone> = {
  regular: {
    label: "Regular",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  honors: {
    label: "Honors",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  ap: {
    label: "AP",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
  ib: {
    label: "IB",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
  "dual-enrollment": {
    label: "Dual Enrollment",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
};

export const IMPORTANCE_LABELS: Record<Importance, string> = {
  core: "Core for this field",
  recommended: "Recommended",
  supporting: "Supporting",
};

export const AVAILABILITY_LABELS: Record<AvailabilityState, string> = {
  offered: "Offered at my school",
  not_offered: "Not offered at my school",
  unsure: "Not sure",
};

// What-If effect tones. address-opportunity / add-depth / strengthen read as
// brand-teal positives; broaden is a neutral amber; limited-relevance is muted.
export const WHATIF_EFFECT_META: Record<
  WhatIfEffect,
  Tone & { blurb: string }
> = {
  "address-opportunity": {
    label: "Addresses an opportunity",
    badge: "bg-brand-teal/15 text-brand-teal",
    dot: "bg-brand-teal",
    blurb: "This would improve an area you can act on for your field.",
  },
  "add-depth": {
    label: "Adds depth",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
    blurb: "This would push an existing subject to a higher level.",
  },
  "broaden-preparation": {
    label: "Broadens preparation",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
    blurb: "This would add a subject you don't currently cover.",
  },
  "strengthen-existing": {
    label: "Strengthens an area",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
    blurb: "This would reinforce an area where you're already solid.",
  },
  "limited-relevance": {
    label: "Limited relevance",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
    blurb: "This would change little for your field preparation.",
  },
};

// Verified college field-strength rating (from college_field_strengths). This is
// a FIELD-STRENGTH signal, never a coursework requirement.
export const FIELD_STRENGTH_META: Record<FieldStrengthRating, Tone> = {
  excellent: {
    label: "Excellent",
    badge: "bg-brand-teal/15 text-brand-teal",
    dot: "bg-brand-teal",
  },
  strong: {
    label: "Strong",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
  moderate: {
    label: "Moderate",
    badge: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  limited: {
    label: "Limited",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
  unknown: {
    label: "Unrated",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};
