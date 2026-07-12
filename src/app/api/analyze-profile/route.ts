import { analyzeProfile, type FullProfile } from "~/lib/ai/analyze-profile";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { PRO_SYSTEM_PROMPT } from "~/lib/ai/prompt";
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

  // Enforce generation limits based on subscription tier
  const rawTier = (profileRes.data as { subscription_tier?: string })
    .subscription_tier;
  const tier: TierKey = rawTier === "pro" ? "pro" : "free";
  const tierConfig = SUBSCRIPTION_TIERS[tier];

  if (tier === "free") {
    // Free users: 1 generation per rolling month from the date of their last generation
    const { data: lastGen } = await admin
      .from("ai_analyses")
      .select("created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastGen) {
      const next = new Date(lastGen.created_at as string);
      next.setMonth(next.getMonth() + 1);
      if (new Date() < next) {
        const formatted = next.toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        return Response.json(
          {
            error: `You've used your 1 free roadmap generation. Your next generation will be available on ${formatted}. Upgrade to Pro for 4 generations per month.`,
          },
          { status: 429 },
        );
      }
    }
  } else {
    // Pro users: up to 4 generations per calendar month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count: usageCount } = await admin
      .from("ai_analyses")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth.toISOString());

    const used = usageCount ?? 0;
    if (used >= tierConfig.generationsPerMonth) {
      return Response.json(
        {
          error: `You've used all ${tierConfig.generationsPerMonth} roadmap generations for this month. Your limit resets at the start of next month.`,
        },
        { status: 429 },
      );
    }
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
