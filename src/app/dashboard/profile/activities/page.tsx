import { loadVerifiedOpportunities } from "~/lib/activities/db";
import { computeTimeline, timeRemainingLabel } from "~/lib/activities/timeline";
import { activitiesAnalysisSchema } from "~/lib/ai/activities-schema";
import { createClient } from "~/lib/supabase/server";
import { ActivitiesWorkspace } from "./activities-workspace";
import type { EditableActivity } from "./activity-form";

// Activities — the scored, managed workspace inside My Profile. Loads the
// student's live activities (editable in place), their grade/field, the latest
// cached AI analysis, and any VERIFIED opportunities (empty until the reference
// table is populated). Lives under the profile layout, so it inherits the
// profile sidebar and shared styling.
export default async function ActivitiesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [activitiesRes, profileRes, analysisRes] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id, name, category, grades, leadership_role, description, hours_per_week, weeks_per_year, meaningfulness",
      )
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("grade_level, major_category")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("activity_analyses")
      .select("analysis, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const activities: EditableActivity[] = (
    (activitiesRes.data ?? []) as Array<{
      id: string;
      name: string;
      category: string | null;
      grades: string[] | null;
      leadership_role: string | null;
      description: string | null;
      hours_per_week: number | null;
      weeks_per_year: number | null;
      meaningfulness: number | null;
    }>
  ).map((a) => ({
    id: a.id,
    name: a.name ?? "",
    category: a.category ?? "",
    grades: a.grades ?? [],
    leadershipRole: a.leadership_role ?? "",
    description: a.description ?? "",
    hoursPerWeek: a.hours_per_week,
    weeksPerYear: a.weeks_per_year,
    meaningfulness: a.meaningfulness,
  }));

  const profile = profileRes.data as {
    grade_level: string | null;
    major_category: string | null;
  } | null;
  const gradeLevel = profile?.grade_level ?? "";
  const fieldKey = profile?.major_category ?? null;

  // Deterministic timeline (grade + calendar) — the AI is told this, not asked.
  const timeline = computeTimeline(gradeLevel, new Date());

  // Verified, linkable opportunities (empty until the reference table is
  // populated — the workspace then only shows AI archetypes).
  const verifiedOpportunities = await loadVerifiedOpportunities(
    supabase,
    gradeLevel,
    fieldKey,
  );

  // Latest cached analysis, validated defensively — a row written by an older
  // schema simply fails validation and is treated as "not analyzed yet".
  const analysisRow = analysisRes.data as {
    analysis: unknown;
    created_at: string;
    updated_at: string | null;
  } | null;
  const parsed = analysisRow
    ? activitiesAnalysisSchema.safeParse(analysisRow.analysis)
    : null;
  const initialAnalysis = parsed?.success ? parsed.data : null;
  const initialAnalyzedAt =
    parsed?.success && analysisRow
      ? (analysisRow.updated_at ?? analysisRow.created_at)
      : null;

  return (
    <ActivitiesWorkspace
      activities={activities}
      timeline={{
        stage: timeline.stage,
        band: timeline.band,
        posture: timeline.posture,
        timeRemaining: timeRemainingLabel(timeline),
      }}
      initialAnalysis={initialAnalysis}
      initialAnalyzedAt={initialAnalyzedAt}
      verifiedOpportunities={verifiedOpportunities}
    />
  );
}
