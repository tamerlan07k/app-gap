import { analyzeProfile, type FullProfile } from "~/lib/ai/analyze-profile";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { PRO_SYSTEM_PROMPT } from "~/lib/ai/prompt";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import {
  billingMonthEnd,
  countGenerationsThisMonth,
} from "~/lib/roadmap-usage";
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

  // Enforce generation limits based on the *effective* subscription tier.
  // Reconcile any lapsed admin override first, then resolve entitlement with
  // priority: active admin override > Stripe > free. An expired override is
  // treated as inactive by the resolver even before reconciliation writes land.
  await reconcileExpiredOverride(admin, profileRes.data as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRes.data as EntitlementProfile);
  const tier: TierKey = entitlement.tier;
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  // Count generations from the append-only usage ledger — NOT from ai_analyses —
  // so deleting a saved roadmap can never restore a user's monthly allowance.
  // Both tiers use the same calendar-month window (resets on the 1st).
  let used: number;
  try {
    used = await countGenerationsThisMonth(admin, user.id);
  } catch (err) {
    // Fail closed: if we can't verify usage we must NOT allow a free generation.
    console.error(
      "[API] Failed to verify generation usage:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your generation limit. Please try again." },
      { status: 503 },
    );
  }
  if (used >= tierConfig.generationsPerMonth) {
    const resets = billingMonthEnd().toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const error =
      tier === "free"
        ? `You've used your 1 free roadmap generation this month. Your next generation will be available on ${resets}. Upgrade to Pro for 4 generations per month.`
        : `You've used all ${tierConfig.generationsPerMonth} roadmap generations for this month. Your limit resets on ${resets}.`;
    return Response.json({ error }, { status: 429 });
  }

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
      tierConfig.model,
      tier === "pro" ? PRO_SYSTEM_PROMPT : undefined,
    );

    // Record the consumed generation in the usage ledger FIRST. This is the
    // authoritative monthly-limit record and is intentionally decoupled from the
    // ai_analyses row: even if the analysis insert below fails, or the user later
    // deletes the saved roadmap, this generation still counts against the month.
    const { error: usageError } = await admin
      .from("roadmap_generations")
      .insert({ user_id: user.id, tier });

    if (usageError) {
      console.error(
        "[API] Failed to record generation usage:",
        usageError.message,
      );
    }

    // Persist the analysis; errors here are non-fatal — we return the result either way
    const { data: insertData, error: insertError } = await admin
      .from("ai_analyses")
      .insert({
        user_id: user.id,
        analysis,
        model: tierConfig.model,
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[API] Failed to store analysis:", insertError.message);
    }

    return Response.json({
      success: true,
      analysis,
      id: (insertData as { id: string } | null)?.id ?? null,
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
