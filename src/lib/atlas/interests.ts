// Map AppGap's own academic-direction taxonomy onto Atlas of Opportunity's fixed
// interest names, and derive an Atlas grade from the stored grade level.
//
// WHY the academic direction and not activity categories: Atlas interests are
// academic SUBJECTS (Biology, Economics, Music…). AppGap's activity categories
// (sports, clubs, volunteering, internship…) are activity TYPES, not subjects, so
// almost none of them map to an Atlas interest — the genuine subject signal is the
// student's declared academic direction (`profiles.academic_major` /
// `profiles.major_category`). We therefore map from that taxonomy.
//
// Two signals, most-specific-first:
//   1. `academic_major`  — the granular major key (academic-interests.ts). Precise.
//   2. `major_category`  — the coarse field-fit key (FieldKey). Fallback for older
//                          profiles that never set a granular major.
// Anything with no sensible subject match is skipped (returns no interest), per the
// rule "skip anything with no match / never send an invalid value".

import type { FieldKey } from "~/lib/academic-interests";
import type { AtlasInterest } from "./link";

// ─── Granular major key → Atlas interest(s) ──────────────────────────────────
// Keys are `Major.key` values from academic-interests.ts. A major may map to more
// than one Atlas interest where both are genuinely implied (e.g. environmental
// engineering → Engineering + Environmental Science).
const MAJOR_TO_ATLAS: Record<string, AtlasInterest[]> = {
  // Computing & Information
  "computer-science": ["Computer Science"],
  "software-engineering": ["Computer Science"],
  "data-science": ["Data Science"],
  "ai-ml": ["AI / Machine Learning"],
  cybersecurity: ["Computer Science"],
  "information-systems": ["Computer Science"],

  // Engineering
  "mechanical-engineering": ["Engineering"],
  "electrical-engineering": ["Engineering"],
  "computer-engineering": ["Engineering"],
  "civil-engineering": ["Engineering"],
  "chemical-engineering": ["Engineering"],
  "biomedical-engineering": ["Engineering"],
  "aerospace-engineering": ["Engineering"],
  "environmental-engineering": ["Engineering", "Environmental Science"],
  "materials-science": ["Engineering"],
  "industrial-systems-engineering": ["Engineering"],
  "general-engineering": ["Engineering"],

  // Mathematics & Statistics
  mathematics: ["Math"],
  "applied-mathematics": ["Math"],
  statistics: ["Data Science"],
  "actuarial-science": ["Math"],

  // Physical Sciences
  physics: ["Physics"],
  astronomy: ["Astronomy"],
  chemistry: ["Chemistry"],
  "earth-sciences": ["Environmental Science"],

  // Life Sciences
  biology: ["Biology"],
  biochemistry: ["Biology"],
  "molecular-cell-biology": ["Biology"],
  genetics: ["Biology"],
  microbiology: ["Biology"],
  "ecology-evolution": ["Biology", "Environmental Science"],

  // Health & Medicine
  "pre-med": ["Medicine"],
  nursing: ["Medicine"],
  "public-health": ["Public Health"],
  kinesiology: ["Medicine"],
  nutrition: ["Public Health"],
  pharmacy: ["Medicine"],
  "allied-health": ["Medicine"],

  // Psychology & Cognitive Science
  psychology: ["Psychology"],
  neuroscience: ["Neuroscience"],
  "cognitive-science": ["Neuroscience"],

  // Business & Economics
  economics: ["Economics"],
  finance: ["Business"],
  accounting: ["Business"],
  "business-administration": ["Business"],
  marketing: ["Business"],
  entrepreneurship: ["Entrepreneurship"],
  "operations-supply-chain": ["Business"],
  "international-business": ["Business"],

  // Social Sciences
  "political-science": ["Political Science"],
  "international-relations": ["International Relations"],
  sociology: ["Social Science"],
  anthropology: ["Social Science"],
  geography: ["Social Science"],
  criminology: ["Social Science"],

  // Humanities
  english: ["Literature"],
  "comparative-literature": ["Literature"],
  history: ["History"],
  philosophy: ["Philosophy"],
  linguistics: ["Linguistics"],
  "religious-studies": ["Humanities"],
  classics: ["Humanities"],
  "languages-literatures": ["Literature"],
  "area-ethnic-gender-studies": ["Humanities"],

  // Communication & Media
  communications: ["Film & Media"],
  journalism: ["Journalism"],
  "media-studies": ["Film & Media"],
  "public-relations": ["Journalism"],
  "film-media-production": ["Film & Media"],

  // Arts & Design
  architecture: ["Architecture & Design"],
  "fine-arts": ["Visual Arts"],
  "graphic-design": ["Visual Arts"],
  "industrial-design": ["Architecture & Design"],
  music: ["Music"],
  // theater / dance have no Atlas interest — intentionally omitted.
  "art-history": ["Visual Arts"],
  "fashion-design": ["Architecture & Design"],

  // Education
  "elementary-education": ["Education"],
  "secondary-education": ["Education"],
  "special-education": ["Education"],
  "educational-studies": ["Education"],

  // Public & Environmental Affairs
  "public-policy": ["Public Policy"],
  "public-administration": ["Public Policy"],
  "urban-planning": ["Public Policy"],
  "environmental-studies": ["Environmental Science"],
  sustainability: ["Sustainability"],
  "international-development": ["International Relations"],

  // Law & Legal
  "pre-law": ["Law"],
  "legal-studies": ["Law"],

  // Interdisciplinary / Undecided → no subject match (omitted)
};

// ─── Coarse field key → Atlas interest ───────────────────────────────────────
// Fallback for profiles with no granular major. Coarse keys are broad, so each
// maps to the single best-fit Atlas interest. `undecided`/`other` have no match.
const FIELD_KEY_TO_ATLAS: Partial<Record<FieldKey, AtlasInterest[]>> = {
  cs: ["Computer Science"],
  engineering: ["Engineering"],
  "bio-premed": ["Biology"],
  business: ["Business"],
  "math-physics": ["Math"],
  polisci: ["Political Science"],
  psych: ["Psychology"],
  humanities: ["Humanities"],
  design: ["Architecture & Design"],
  education: ["Education"],
  law: ["Law"],
};

/**
 * Resolve a student's academic direction to Atlas interest names. Prefers the
 * granular major; falls back to the coarse field key; returns `[]` when neither
 * maps (e.g. undecided), which the link builder renders as no interest filter.
 */
export function atlasInterestsForDirection({
  academicMajor,
  fieldKey,
}: {
  academicMajor?: string | null;
  fieldKey?: string | null;
}): AtlasInterest[] {
  if (academicMajor && MAJOR_TO_ATLAS[academicMajor]) {
    return [...MAJOR_TO_ATLAS[academicMajor]];
  }
  if (fieldKey && FIELD_KEY_TO_ATLAS[fieldKey as FieldKey]) {
    return [...(FIELD_KEY_TO_ATLAS[fieldKey as FieldKey] as AtlasInterest[])];
  }
  return [];
}

/**
 * Convert a stored grade level ("9".."12", or "gap"/other) to an Atlas grade
 * integer (6–12), or `null` when it isn't a usable 6–12 grade.
 */
export function atlasGradeFromLevel(
  gradeLevel: string | null | undefined,
): number | null {
  if (!gradeLevel) return null;
  const n = Number.parseInt(gradeLevel, 10);
  if (!Number.isInteger(n) || n < 6 || n > 12) return null;
  return n;
}
