import type { SupabaseClient } from "@supabase/supabase-js";

// Server-side data access for the Activities workspace.
//
// The opportunity loader is the deterministic half of recommendations: verified,
// linkable opportunities come ONLY from the activity_opportunities reference
// table, filtered in CODE by grade eligibility and (optionally) intended field —
// never invented by the AI. The table ships empty, so this returns [] today; the
// architecture is in place for when a verified ingestion pipeline populates it.

export type VerifiedOpportunity = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  applicableGrades: string[];
  difficulty: string | null;
  estHoursPerWeekMin: number | null;
  estHoursPerWeekMax: number | null;
  estDuration: string | null;
  isOngoing: boolean | null;
  prerequisites: string | null;
  skills: string[];
  fieldKeys: string[];
  leadershipProgression: string | null;
  potentialImpact: string | null;
  applicationUrl: string | null;
  sourceUrl: string | null;
};

type OpportunityRow = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  applicable_grades: string[] | null;
  difficulty: string | null;
  est_hours_per_week_min: number | null;
  est_hours_per_week_max: number | null;
  est_duration: string | null;
  is_ongoing: boolean | null;
  prerequisites: string | null;
  skills: string[] | null;
  field_keys: string[] | null;
  leadership_progression: string | null;
  potential_impact: string | null;
  application_url: string | null;
  source_url: string | null;
};

/**
 * Load verified opportunities relevant to a student, filtered deterministically
 * by grade eligibility and intended field. Only rows with verified_at set are
 * ever returned — anything pending/unverified is treated as unavailable (the
 * same rule the college matching engine applies). Fail-soft: returns [] on any
 * error or before the table is populated, so the workspace always renders.
 */
export async function loadVerifiedOpportunities(
  client: SupabaseClient,
  gradeLevel: string,
  fieldKey: string | null,
): Promise<VerifiedOpportunity[]> {
  try {
    let query = client
      .from("activity_opportunities")
      .select("*")
      .eq("status", "active")
      .not("verified_at", "is", null);

    // Grade eligibility: an empty applicable_grades array means "any grade".
    if (gradeLevel && gradeLevel !== "gap") {
      query = query.or(
        `applicable_grades.cs.{${gradeLevel}},applicable_grades.eq.{}`,
      );
    }

    const { data, error } = await query;
    if (error || !data) return [];

    let rows = data as OpportunityRow[];

    // Field filter kept in code (nullable field_keys = applies broadly). Applied
    // after fetch so an unscorable field ("", undecided, other) simply returns
    // everything grade-eligible rather than nothing.
    if (fieldKey && !["", "undecided", "other"].includes(fieldKey)) {
      rows = rows.filter(
        (r) =>
          !r.field_keys ||
          r.field_keys.length === 0 ||
          r.field_keys.includes(fieldKey),
      );
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      description: r.description,
      applicableGrades: r.applicable_grades ?? [],
      difficulty: r.difficulty,
      estHoursPerWeekMin: r.est_hours_per_week_min,
      estHoursPerWeekMax: r.est_hours_per_week_max,
      estDuration: r.est_duration,
      isOngoing: r.is_ongoing,
      prerequisites: r.prerequisites,
      skills: r.skills ?? [],
      fieldKeys: r.field_keys ?? [],
      leadershipProgression: r.leadership_progression,
      potentialImpact: r.potential_impact,
      applicationUrl: r.application_url,
      sourceUrl: r.source_url,
    }));
  } catch {
    return [];
  }
}
