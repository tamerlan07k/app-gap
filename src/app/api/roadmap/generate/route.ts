import { resolveFeatureAccess, type TierKey } from "~/lib/ai/config";
import { generateRoadmap } from "~/lib/ai/generate-roadmap";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { checkFeatureAllowance } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import {
  createRoadmapStore,
  nextStepFor,
  recordRoadmapUsage,
  runRoadmapGeneration,
} from "~/lib/roadmap/generation";
import { deriveRoadmap, roadmapProgress } from "~/lib/roadmap/select";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// My Roadmap generation endpoint. Enforces the one-roadmap-per-account-ever rule
// server-side. The heavy lifting (gating, atomic reservation, failure recovery)
// lives in runRoadmapGeneration + the Supabase-backed store; this route just
// wires real dependencies and maps the outcome to HTTP.

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const loaded = await loadFullProfile(admin, user.id);
  if (!loaded) {
    return Response.json(
      { error: "Complete your profile before generating a roadmap." },
      { status: 400 },
    );
  }
  const { profileRow, profile } = loaded;

  // Effective tier (reconcile a lapsed override first).
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(
    profileRow as EntitlementProfile,
    new Date(),
    user.email,
  );
  const tier: TierKey = entitlement.tier;
  // Roadmap generation is available to BOTH tiers now (one lifetime generation
  // each — see FEATURE_ACCESS). "Entitled" means the feature is enabled for the
  // tier; the per-account lifetime cap is enforced by the allowance check below.
  const entitled = resolveFeatureAccess("roadmapGeneration", tier).enabled;

  // The four branches are only generated AFTER the shared foundation is complete
  // (diagnostic + career direction + calendar). "Begin your journey" is what calls
  // this endpoint; guard it server-side too.
  const [analysisRes, careerRes, calendarRes] = await Promise.all([
    admin
      .from("ai_analyses")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    admin
      .from("career_assessments")
      .select("confirmed")
      .eq("user_id", user.id)
      .maybeSingle(),
    admin
      .from("calendars")
      .select("status, confirmed")
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);
  const foundationComplete =
    (analysisRes.count ?? 0) > 0 &&
    (careerRes.data as { confirmed: boolean } | null)?.confirmed === true &&
    (calendarRes.data as { status: string; confirmed: boolean } | null)
      ?.confirmed === true;

  // Only block a FIRST generation on an incomplete foundation. If a roadmap is
  // already in flight / ready, fall through so the saved result is returned.
  if (!foundationComplete) {
    const { data: existing } = await admin
      .from("roadmaps")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!existing) {
      return Response.json(
        {
          error:
            "Complete your foundation (diagnostic, career direction, and calendar) before beginning your journey.",
        },
        { status: 400 },
      );
    }
  }

  // How many target colleges the student has saved (context for personalization).
  const { count: targetCollegeCount } = await admin
    .from("user_colleges")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  const now = new Date();
  const ctx = buildRoadmapContext(profile, {
    now,
    targetCollegeCount: targetCollegeCount ?? 0,
  });

  const store = createRoadmapStore(admin, user.id, tier, now);

  let result: Awaited<ReturnType<typeof runRoadmapGeneration>>;
  try {
    result = await runRoadmapGeneration({
      store,
      isPro: entitled,
      unlimited: entitlement.unlimited,
      checkAllowance: () =>
        checkFeatureAllowance(
          admin,
          user.id,
          "roadmapGeneration",
          tier,
          now,
          entitlement.unlimited,
        ),
      generate: async () =>
        (
          await generateRoadmap(profile, {
            now,
            targetCollegeCount: targetCollegeCount ?? 0,
          })
        ).milestones,
      recordUsage: () => recordRoadmapUsage(admin, user.id, tier),
      deriveNextStep: (milestones) => nextStepFor(milestones, ctx),
    });
  } catch (err) {
    // A throw here means allowance verification or a store write failed — fail
    // CLOSED (never grant a free extra generation on an unverifiable state).
    console.error(
      "[API] roadmap generation error:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't process your roadmap right now. Please try again." },
      { status: 503 },
    );
  }

  switch (result.status) {
    case "not_pro":
      return Response.json(
        { error: "Roadmap generation isn't available on your plan." },
        { status: 403 },
      );
    case "limit_reached":
      return Response.json(
        {
          error:
            "You've already used your roadmap generation. Your saved roadmap is still available.",
        },
        { status: 409 },
      );
    case "in_progress":
      return Response.json({ success: true, status: "generating" });
    case "failed":
      return Response.json(
        {
          error:
            "We couldn't generate your roadmap just now. Please try again — this didn't use your generation.",
        },
        { status: 500 },
      );
    case "ready": {
      const { milestones, nextStepId } = deriveRoadmap(
        result.roadmap.milestones,
        ctx,
      );
      return Response.json({
        success: true,
        status: "ready",
        milestones,
        nextStepId,
        progress: roadmapProgress(milestones),
      });
    }
  }
}
