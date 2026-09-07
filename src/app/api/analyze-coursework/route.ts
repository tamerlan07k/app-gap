import type { FieldKey } from "~/lib/academic-interests";
import { analyzeCoursework } from "~/lib/ai/analyze-coursework";
import { SUBSCRIPTION_TIERS, type TierKey } from "~/lib/ai/config";
import { buildCourseworkProfile, emptyTarget } from "~/lib/coursework/engine";
import { resolveRequirements } from "~/lib/coursework/requirements";
import { loadTargetFit } from "~/lib/coursework/requirements-db";
import type {
  AvailabilityMap,
  AvailabilityState,
  TargetContext,
} from "~/lib/coursework/types";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { recordEvent } from "~/lib/events";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Coursework workspace analysis endpoint. Copies the analyze-activities 7-step
// flow exactly (auth → admin load → reconcile+resolve entitlement → feature
// allowance check [503 on error, 429 on limit] → generate → record usage FIRST →
// cache → event). The DETERMINISTIC coursework engine runs server-side here and
// its output is fed to the model as ground truth, so the model only interprets —
// it never re-classifies. This feature is profile-analysis only: it writes to its
// own coursework_analyses table and NEVER touches the AppGap Score or chancing.

const FIELD_KEYS = new Set<FieldKey>([
  "cs",
  "engineering",
  "bio-premed",
  "business",
  "math-physics",
  "polisci",
  "psych",
  "humanities",
  "design",
  "education",
  "law",
  "undecided",
  "other",
]);

function toFieldKey(value: string | null | undefined): FieldKey {
  return value && FIELD_KEYS.has(value as FieldKey)
    ? (value as FieldKey)
    : "undecided";
}

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
      {
        error:
          "Profile not found. Please complete your profile setup before analyzing your coursework.",
      },
      { status: 400 },
    );
  }

  const { profileRow, profile } = loaded;

  // Effective tier: reconcile a lapsed admin override, then resolve with
  // priority active-override > Stripe > free.
  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "courseworkAnalysis",
      tier,
    );
  } catch (err) {
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
        ? "You've used your Coursework analysis for this week. It refreshes in a few days, or upgrade to Pro for more."
        : "You've reached your Coursework analysis limit for this month. It resets at the start of next month.";
    return Response.json({ error }, { status: 429 });
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  // Load the school-availability self-report + any saved college target, then
  // build the deterministic coursework profile the model will interpret.
  const [availabilityRes, collegesRes] = await Promise.all([
    admin
      .from("school_course_availability")
      .select("course_key, availability")
      .eq("user_id", user.id),
    admin
      .from("user_colleges")
      .select("college_id, school_id, program_id, track_id, intended_major")
      .eq("user_id", user.id)
      .limit(1),
  ]);

  const availability: AvailabilityMap = {};
  for (const row of (availabilityRes.data ?? []) as Array<{
    course_key: string;
    availability: AvailabilityState;
  }>) {
    availability[row.course_key] = row.availability;
  }

  const targetRow = (collegesRes.data ?? [])[0] as
    | {
        college_id: string | null;
        school_id: string | null;
        program_id: string | null;
        track_id: string | null;
        intended_major: string | null;
      }
    | undefined;

  const fieldKey = toFieldKey(profile.majorCategory);

  // Enrich the target with VERIFIED data only (field strength + scope-resolved
  // requirements); requirement claims are never fabricated.
  let target: TargetContext = emptyTarget();
  if (targetRow) {
    const fit = await loadTargetFit(admin, targetRow.college_id, fieldKey);
    target = {
      hasTarget: true,
      collegeId: targetRow.college_id ?? null,
      schoolId: targetRow.school_id ?? null,
      programId: targetRow.program_id ?? null,
      trackId: targetRow.track_id ?? null,
      collegeName: fit.collegeName,
      programLabel: targetRow.intended_major ?? null,
      fieldStrength: fit.fieldStrength,
      verifiedExpectations: resolveRequirements(fit.requirements, {
        schoolId: targetRow.school_id ?? null,
        programId: targetRow.program_id ?? null,
        trackId: targetRow.track_id ?? null,
      }),
    };
  }

  const courseworkProfile = buildCourseworkProfile({
    courses: profile.courses,
    gradeLevel: profile.gradeLevel,
    fieldKey,
    academicMajor: profile.academicMajor,
    academicInterests: profile.academicInterests,
    availability,
    target,
  });

  try {
    const { analysis, promptTokens, completionTokens } =
      await analyzeCoursework(profile, courseworkProfile, model);

    // Record the consumed use in the append-only ledger FIRST.
    await recordFeatureUsage(admin, user.id, "courseworkAnalysis", tier);

    // Cache the interpretation as the user's single latest analysis. Non-fatal.
    const { data: insertData, error: insertError } = await admin
      .from("coursework_analyses")
      .upsert(
        {
          user_id: user.id,
          analysis,
          model,
          prompt_tokens: promptTokens,
          completion_tokens: completionTokens,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select("id")
      .single();

    if (insertError) {
      console.error(
        "[API] Failed to store coursework analysis:",
        insertError.message,
      );
    }

    await recordEvent(
      admin,
      user.id,
      "coursework_analyzed",
      "Coursework analyzed",
      {
        findings: courseworkProfile.findings.length,
        strengths: courseworkProfile.summary.strengths,
      },
    );

    return Response.json({
      success: true,
      analysis,
      id: (insertData as { id: string } | null)?.id ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[API] analyze-coursework error:", message);
    return Response.json(
      { error: "Failed to analyze your coursework. Please try again." },
      { status: 500 },
    );
  }
}
