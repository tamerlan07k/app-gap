// Field-fit engine — PURE functions, no DB, no network, no admission data.
//
// This module owns the SECOND dimension: how strong a college is for the
// student's intended field. It reads ONLY the source-attributed field-data
// layer (college_field_strengths / college_field_resources). If no record
// exists for a (college, field), the rating is `unknown` — we never infer field
// strength from prestige, admit rate, or anything else. Kept separate from
// matching.ts so chancing and field fit evolve independently.

import type {
  FieldFit,
  FieldRating,
  FieldResource,
  FieldStrengthRecord,
} from "./types";

// Display labels for the intended-field taxonomy (profiles.major_category keys).
export const FIELD_LABELS: Record<string, string> = {
  cs: "Computer Science / AI",
  engineering: "Engineering",
  "bio-premed": "Biology / Pre-Med",
  business: "Business / Finance",
  "math-physics": "Math / Physics",
  polisci: "Political Science / IR",
  psych: "Psychology / Neuroscience",
  humanities: "Humanities",
  design: "Architecture / Design / Arts",
  education: "Education / Public Policy",
  law: "Pre-Law",
  undecided: "Undecided",
  other: "Other",
};

// Fields where we can't meaningfully assess a college-specific strength.
const UNSCORABLE_FIELDS = new Set(["undecided", "other", ""]);

export function fieldLabel(fieldKey: string | null): string {
  if (!fieldKey) return "your field";
  return FIELD_LABELS[fieldKey] ?? fieldKey;
}

const RATING_BLURB: Record<Exclude<FieldRating, "not_applicable">, string> = {
  excellent: "a standout program in",
  strong: "strong in",
  moderate: "a solid option in",
  limited: "a more limited option in",
  unknown: "unrated in",
};

/**
 * Score the field dimension for one college. `strength` is the ingested record
 * for (college, field) or null; `resources` are the backing evidence items.
 */
export function scoreFieldFit(
  fieldKey: string | null,
  strength: FieldStrengthRecord | null,
  resources: FieldResource[] = [],
): FieldFit {
  const label = fieldLabel(fieldKey);

  // No specific field selected → nothing to assess.
  if (!fieldKey || UNSCORABLE_FIELDS.has(fieldKey)) {
    return {
      fieldKey: fieldKey || null,
      rating: "not_applicable",
      rationale:
        "Set a specific intended field in your profile to see field fit.",
      hasData: false,
      verified: false,
      resources: [],
    };
  }

  // No ingested record → honestly unknown (never inferred).
  if (!strength) {
    return {
      fieldKey,
      rating: "unknown",
      rationale: `Field-fit data for ${label} hasn't been added for this college yet.`,
      hasData: false,
      verified: false,
      resources: [],
    };
  }

  const rationale = strength.headline
    ? strength.headline
    : `${capitalize(RATING_BLURB[strength.strength])} ${label}.`;

  return {
    fieldKey,
    rating: strength.strength,
    rationale,
    hasData: true,
    verified: strength.verified,
    resources,
  };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Coarse rank for sorting/tie-breaking (higher = better fit). */
export function fieldRatingRank(rating: FieldRating): number {
  switch (rating) {
    case "excellent":
      return 4;
    case "strong":
      return 3;
    case "moderate":
      return 2;
    case "limited":
      return 1;
    default:
      return 0; // unknown / not_applicable
  }
}

export function fieldRatingLabel(rating: FieldRating): string {
  switch (rating) {
    case "excellent":
      return "Excellent fit";
    case "strong":
      return "Strong fit";
    case "moderate":
      return "Moderate fit";
    case "limited":
      return "Limited fit";
    case "not_applicable":
      return "No field set";
    default:
      return "Fit unknown";
  }
}
