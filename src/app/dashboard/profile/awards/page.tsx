import { recognitionAnalysisSchema } from "~/lib/ai/awards-schema";
import { loadAwards, loadOpportunities } from "~/lib/awards/db";
import { rankOpportunities } from "~/lib/awards/opportunities";
import { buildRecognitionProfile } from "~/lib/awards/recognition";
import { createClient } from "~/lib/supabase/server";
import { AwardsWorkspace } from "./awards-workspace";

// Awards — the application recognition + opportunity strategy workspace inside My
// Profile. Loads the student's awards (auto-populated from their profile/onboarding,
// editable in place), their grade + intended field, the verified opportunity
// catalog, and the latest cached AI interpretation; runs the DETERMINISTIC
// recognition + opportunity engines server-side (no AI on page load); and renders
// the workspace. The Recognition Map assesses AWARDS ONLY — activities are the
// Activities section's job. Profile-analysis only; never touches chancing.

export default async function AwardsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [awards, opportunities, profileRes, analysisRes] = await Promise.all([
    loadAwards(supabase, user.id),
    loadOpportunities(supabase),
    supabase
      .from("profiles")
      .select("grade_level, major_category")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("award_recognition_analyses")
      .select("analysis, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profile = profileRes.data as {
    grade_level: string | null;
    major_category: string | null;
  } | null;
  const gradeLevel = profile?.grade_level ?? null;
  const fieldKey = profile?.major_category || null;

  const recognition = buildRecognitionProfile({ awards, fieldKey });

  // Deterministic, date-aware opportunity ranking — computed fresh on every load
  // against the current date (no AI).
  const fits = rankOpportunities({
    opportunities,
    profile: recognition,
    gradeLevel,
    fieldKey,
    now: new Date(),
  });

  // Latest cached analysis, validated defensively — an older-shape row simply
  // fails validation and is treated as "not analyzed yet".
  const analysisRow = analysisRes.data as {
    analysis: unknown;
    created_at: string;
    updated_at: string | null;
  } | null;
  const parsed = analysisRow
    ? recognitionAnalysisSchema.safeParse(analysisRow.analysis)
    : null;
  const initialAnalysis = parsed?.success ? parsed.data : null;
  const initialAnalyzedAt =
    parsed?.success && analysisRow
      ? (analysisRow.updated_at ?? analysisRow.created_at)
      : null;

  return (
    <AwardsWorkspace
      awards={awards}
      recognition={recognition}
      fits={fits}
      initialAnalysis={initialAnalysis}
      initialAnalyzedAt={initialAnalyzedAt}
    />
  );
}
