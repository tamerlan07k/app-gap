import type { SupabaseClient } from "@supabase/supabase-js";
import type { FullProfile } from "~/lib/ai/prompt";

// Shared loader that assembles a user's FullProfile from the profiles, courses,
// activities, and awards tables. Extracted so both the gap-analysis route and
// the Application Writing route build the exact same shape from one place.
//
// Returns the raw profile row alongside the mapped FullProfile so callers that
// also need billing/entitlement columns (e.g. generation-limit enforcement)
// don't have to re-query. Returns null when the user has no profile row yet.

export async function loadFullProfile(
  client: SupabaseClient,
  userId: string,
): Promise<{
  profileRow: Record<string, unknown>;
  profile: FullProfile;
} | null> {
  const [profileRes, coursesRes, activitiesRes, awardsRes] = await Promise.all([
    client.from("profiles").select("*").eq("id", userId).maybeSingle(),
    client
      .from("courses")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order"),
    client
      .from("activities")
      .select("*")
      .eq("user_id", userId)
      .order("sort_order"),
    client.from("awards").select("*").eq("user_id", userId).order("sort_order"),
  ]);

  if (!profileRes.data) return null;

  const p = profileRes.data as {
    grade_level: string | null;
    unweighted_gpa: number | null;
    sat_score: number | null;
    act_score: number | null;
    school_type: string | null;
    major_category: string | null;
    specific_major: string | null;
    career_interest: string | null;
    selectivity: string | null;
    additional_context: string | null;
  };

  const profile: FullProfile = {
    gradeLevel: p.grade_level ?? "",
    unweightedGpa: p.unweighted_gpa ?? null,
    satScore: p.sat_score ?? null,
    actScore: p.act_score ?? null,
    schoolType: p.school_type ?? null,
    courses: (coursesRes.data ?? []).map(
      (c: {
        name: string;
        type: string;
        status: string;
        grade_level: string;
        ap_exam_score: string;
      }) => ({
        name: c.name,
        type: c.type,
        status: c.status,
        gradeLevel: c.grade_level,
        apExamScore: c.ap_exam_score,
      }),
    ),
    majorCategory: p.major_category ?? "",
    specificMajor: p.specific_major ?? "",
    careerInterest: p.career_interest ?? "",
    selectivity: p.selectivity ?? "",
    additionalContext: p.additional_context ?? null,
    activities: (activitiesRes.data ?? []).map(
      (a: {
        name: string;
        category: string;
        grades: string[];
        leadership_role: string | null;
        description: string | null;
        hours_per_week: number | null;
        weeks_per_year: number | null;
        meaningfulness: number | null;
      }) => ({
        name: a.name,
        category: a.category,
        grades: a.grades ?? [],
        leadershipRole: a.leadership_role ?? "",
        description: a.description ?? "",
        hoursPerWeek: a.hours_per_week ?? null,
        weeksPerYear: a.weeks_per_year ?? null,
        meaningfulness: a.meaningfulness ?? null,
      }),
    ),
    awards: (awardsRes.data ?? []).map(
      (aw: { name: string; level: string; grade: string }) => ({
        name: aw.name,
        level: aw.level,
        grade: aw.grade,
      }),
    ),
  };

  return { profileRow: profileRes.data as Record<string, unknown>, profile };
}
