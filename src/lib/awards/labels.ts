// Presentational metadata for the Awards section — status/effort/category badge
// styling and labels. Kept out of the engines so visuals can evolve without
// touching deterministic logic. Uses design-token classes only.

import type {
  OpportunityCategory,
  OpportunityEffort,
  OpportunityStatus,
} from "./types";

export const STATUS_META: Record<
  OpportunityStatus,
  { label: string; badge: string; dot: string }
> = {
  good_fit: {
    label: "Good fit",
    badge: "bg-brand-teal/10 text-brand-teal",
    dot: "bg-brand-teal",
  },
  worth_exploring: {
    label: "Worth exploring",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  time_sensitive: {
    label: "Time-sensitive",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  low_priority: {
    label: "Low priority",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/60",
  },
  not_enough_time: {
    label: "Not enough time",
    badge: "bg-muted text-muted-foreground",
    dot: "bg-muted-foreground/40",
  },
};

export const EFFORT_META: Record<
  OpportunityEffort,
  { label: string; blurb: string }
> = {
  quick: { label: "Quick", blurb: "Minutes to a few hours" },
  moderate: { label: "Moderate", blurb: "A few weeks" },
  substantial: { label: "Substantial", blurb: "Weeks to a couple of months" },
  intensive: { label: "Intensive", blurb: "Months of sustained work" },
};

export const CATEGORY_LABELS: Record<OpportunityCategory, string> = {
  competition: "Competition",
  hackathon: "Hackathon",
  olympiad: "Olympiad",
  research: "Research",
  conference: "Conference",
  fellowship: "Fellowship",
  entrepreneurship: "Entrepreneurship",
  pitch: "Pitch competition",
  academic_challenge: "Academic challenge",
  publication: "Publication",
  selective_program: "Selective program",
  service: "Service",
  scholarship: "Scholarship",
  other: "Opportunity",
};

// Suggested award categories for the Recognition Map form (free-text allowed).
export const AWARD_CATEGORY_OPTIONS: { value: string; label: string }[] = [
  { value: "academic", label: "Academic / Subject" },
  { value: "stem", label: "STEM / Science" },
  { value: "cs", label: "Computer Science / Tech" },
  { value: "math", label: "Math / Quantitative" },
  { value: "research", label: "Research" },
  { value: "humanities", label: "Humanities / Writing" },
  { value: "arts", label: "Arts / Creative" },
  { value: "athletics", label: "Athletics" },
  { value: "leadership", label: "Leadership" },
  { value: "service", label: "Service / Community" },
  { value: "entrepreneurship", label: "Business / Entrepreneurship" },
  { value: "other", label: "Other" },
];
