import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollegeAcademicRequirement } from "./requirements";
import type {
  FieldStrength,
  FieldStrengthRating,
  RequirementScope,
  SubjectArea,
} from "./types";

// Server-side loader for the Target-Program Fit data: the target college's name,
// its VERIFIED field strength for the student's field, and any VERIFIED scoped
// academic-requirement rows. Kept apart from the pure engine so the resolver and
// tests stay DB-free. Reads only public reference tables — never the AppGap
// Score / chancing data — and surfaces only human-verified rows.

export type TargetFitData = {
  collegeName: string | null;
  fieldStrength: FieldStrength | null;
  requirements: CollegeAcademicRequirement[];
};

const RATINGS = new Set<FieldStrengthRating>([
  "excellent",
  "strong",
  "moderate",
  "limited",
  "unknown",
]);

const SUBJECT_AREAS = new Set<SubjectArea>([
  "math",
  "science",
  "computer-science",
  "english",
  "social-studies",
  "world-language",
  "arts",
  "other",
]);

const SCOPES = new Set<RequirementScope>([
  "university",
  "school",
  "program",
  "track",
]);

export const EMPTY_TARGET_FIT: TargetFitData = {
  collegeName: null,
  fieldStrength: null,
  requirements: [],
};

export async function loadTargetFit(
  client: SupabaseClient,
  collegeId: string | null,
  fieldKey: string | null,
): Promise<TargetFitData> {
  if (!collegeId) return EMPTY_TARGET_FIT;

  const [collegeRes, fieldRes, reqRes] = await Promise.all([
    client
      .from("colleges")
      .select("canonical_name")
      .eq("id", collegeId)
      .maybeSingle(),
    fieldKey
      ? client
          .from("college_field_strengths")
          .select("field_key, strength, headline")
          .eq("college_id", collegeId)
          .eq("field_key", fieldKey)
          .not("verified_at", "is", null)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    client
      .from("college_academic_requirements")
      .select(
        "scope, school_id, program_id, track_id, requirement_type, subject_area, topic, label, source_url",
      )
      .eq("college_id", collegeId)
      .not("verified_at", "is", null),
  ]);

  const collegeName =
    (collegeRes.data as { canonical_name: string } | null)?.canonical_name ??
    null;

  // Field strength — only surface a MEANINGFUL rating (drop verified "unknown").
  let fieldStrength: FieldStrength | null = null;
  const fieldRow = fieldRes.data as {
    field_key: string;
    strength: string;
    headline: string | null;
  } | null;
  if (
    fieldRow &&
    RATINGS.has(fieldRow.strength as FieldStrengthRating) &&
    fieldRow.strength !== "unknown"
  ) {
    fieldStrength = {
      fieldKey: fieldRow.field_key,
      rating: fieldRow.strength as FieldStrengthRating,
      headline: fieldRow.headline ?? null,
    };
  }

  // Requirements — keep only rows whose scope/subject are recognizable; everything
  // else is ignored rather than guessed.
  const requirements: CollegeAcademicRequirement[] = (
    (reqRes.data ?? []) as Array<{
      scope: string;
      school_id: string | null;
      program_id: string | null;
      track_id: string | null;
      requirement_type: string;
      subject_area: string;
      topic: string | null;
      label: string;
      source_url: string;
    }>
  )
    .filter(
      (r) =>
        SCOPES.has(r.scope as RequirementScope) &&
        SUBJECT_AREAS.has(r.subject_area as SubjectArea) &&
        (r.requirement_type === "required" ||
          r.requirement_type === "recommended"),
    )
    .map((r) => ({
      scope: r.scope as RequirementScope,
      schoolId: r.school_id,
      programId: r.program_id,
      trackId: r.track_id,
      requirementType: r.requirement_type as "required" | "recommended",
      subjectArea: r.subject_area as SubjectArea,
      topic: r.topic,
      label: r.label,
      sourceUrl: r.source_url,
    }));

  return { collegeName, fieldStrength, requirements };
}
