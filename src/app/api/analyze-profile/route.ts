import { analyzeProfile, type FullProfile } from "~/lib/ai/analyze-profile";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { PRO_SYSTEM_PROMPT } from "~/lib/ai/prompt";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export async function POST() {
  // Verify the session
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Load the full profile using the admin client (service role bypasses RLS
  // and is more reliable for loading across all tables in one shot)
  const admin = createAdminClient();

  const [profileRes, coursesRes, activitiesRes, awardsRes] = await Promise.all([
    admin.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    admin
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    admin
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    admin.from("awards").select("*").eq("user_id", user.id).order("sort_order"),
  ]);

  if (!profileRes.data) {
    return Response.json(
      {
        error:
          "Profile not found. Please complete your profile setup before generating an analysis.",
      },
      { status: 400 },
    );
  }

  // Enforce entitlement based on the *effective* subscription tier. Reconcile any
  // lapsed admin override first, then resolve with priority: active admin override
  // > Stripe > free (an expired override is treated as inactive by the resolver).
  await reconcileExpiredOverride(admin, profileRes.data as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRes.data as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  // Feature-based access check BEFORE any AI request. The diagnostic is a lifetime
  // allowance for Free (1) and a bounded monthly allowance for Pro — both defined
  // centrally in FEATURE_ACCESS and counted from the append-only feature_usage
  // ledger, so deleting a saved analysis can never restore an allowance.
  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "profileAnalysis",
      tier,
    );
  } catch (err) {
    // Fail closed: if we can't verify usage we must NOT allow a free generation.
    console.error(
      "[API] Failed to verify entitlement usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your plan usage. Please try again." },
      { status: 503 },
    );
  }
  if (!allowance.allowed) {
    const error =
      tier === "free"
        ? "You've already used your free AppGap analysis. Upgrade to Pro to generate more."
        : "You've reached your analysis limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  // Model for this diagnostic — FEATURE_ACCESS is the source of truth; fall back to
  // the tier default. Used for the AI call and stored on the analysis for audit.
  const diagnosticModel = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

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

  try {
    const { analysis, promptTokens, completionTokens } = await analyzeProfile(
      profile,
      diagnosticModel,
      tier === "pro" ? PRO_SYSTEM_PROMPT : undefined,
    );

    // Record the consumed diagnostic in the append-only feature_usage ledger FIRST.
    // This is the authoritative allowance record, decoupled from the ai_analyses
    // row: even if the analysis insert below fails, or the user later deletes the
    // saved analysis, this use still counts against their allowance.
    await recordFeatureUsage(admin, user.id, "profileAnalysis", tier);

    // Persist the analysis; errors here are non-fatal — we return the result either way
    const { data: insertData, error: insertError } = await admin
      .from("ai_analyses")
      .insert({
        user_id: user.id,
        analysis,
        model: diagnosticModel,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[API] Failed to store analysis:", insertError.message);
    }

    const analysisId = (insertData as { id: string } | null)?.id ?? null;

    // Record a "Jump In" activity event (best-effort; never blocks the response).
    await recordEvent(
      admin,
      user.id,
      "analysis_generated",
      "AppGap Analysis generated",
      { analysisId, score: analysis.gapScore },
    );

    return Response.json({
      success: true,
      analysis,
      id: analysisId,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] analyze-profile error:", message);
    return Response.json(
      { error: "Failed to generate analysis. Please try again." },
      { status: 500 },
    );
  }
}
