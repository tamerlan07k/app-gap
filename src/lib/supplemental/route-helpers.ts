// Shared server-side prefix for the Supplemental Essays API routes: parse the
// body, authenticate, load the essay (owner-scoped) and its college, resolve the
// student's tier, and check the feature allowance. Keeps the five routes from
// duplicating the canonical entitlement flow while each still does its own
// generation + caching. Server-only (imports the admin client + entitlement).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type FeatureKey,
  SUBSCRIPTION_TIERS,
  type TierKey,
} from "~/lib/ai/config";
import type { FullProfile } from "~/lib/ai/prompt";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { checkFeatureAllowance } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

export type SupplementalEssayRow = {
  id: string;
  user_id: string;
  college_id: string;
  prompt_text: string;
  word_limit: number | null;
  content: string;
  status: string;
};

export type AuthorizedContext = {
  userId: string;
  admin: SupabaseClient;
  essay: SupplementalEssayRow;
  collegeName: string;
  /** The student's intended-field key (profiles.major_category), or null. */
  fieldKey: string | null;
  profile: FullProfile;
  profileRow: EntitlementProfile;
  tier: TierKey;
  /** The model to use for this feature/tier. */
  model: string;
};

const PRO_MESSAGE = "Supplemental Essays is a Pro feature.";

/**
 * Run the shared prefix. On success returns { context }. On any failure returns
 * { response } — a ready-to-return Response with the right status (401/400/404/
 * 403/429/503). `requireContent` gates ops that need essay text (evaluation,
 * line-by-line); parse does not require content.
 */
export async function authorizeEssayRequest(
  req: Request,
  featureKey: FeatureKey,
  opts: { requireContent?: boolean } = {},
): Promise<{ context: AuthorizedContext } | { response: Response }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  let essayId: string | undefined;
  try {
    const body = (await req.clone().json()) as { essayId?: unknown };
    if (typeof body.essayId === "string") essayId = body.essayId;
  } catch {
    // fall through
  }
  if (!essayId) {
    return {
      response: Response.json({ error: "Missing essay." }, { status: 400 }),
    };
  }

  const admin = createAdminClient();

  const { data: essay } = await admin
    .from("supplemental_essays")
    .select("id, user_id, college_id, prompt_text, word_limit, content, status")
    .eq("id", essayId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!essay) {
    return {
      response: Response.json({ error: "Essay not found." }, { status: 404 }),
    };
  }

  const essayRow = essay as SupplementalEssayRow;

  if (!essayRow.prompt_text.trim()) {
    return {
      response: Response.json(
        { error: "Add the prompt for this essay first." },
        { status: 400 },
      ),
    };
  }
  if (opts.requireContent && !essayRow.content.trim()) {
    return {
      response: Response.json(
        { error: "Write your essay first, then run this." },
        { status: 400 },
      ),
    };
  }

  const { data: college } = await admin
    .from("colleges")
    .select("canonical_name")
    .eq("id", essayRow.college_id)
    .maybeSingle();
  const collegeName = (college?.canonical_name as string) ?? "";

  const loaded = await loadFullProfile(admin, user.id);
  if (!loaded) {
    return {
      response: Response.json(
        { error: "Please complete your profile first." },
        { status: 400 },
      ),
    };
  }
  const { profileRow, profile } = loaded;

  // The intended-field key (profiles.major_category) drives verified field data.
  const fieldKey = profile.majorCategory || null;

  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(profileRow as EntitlementProfile);
  const tier: TierKey = entitlement.tier;

  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(admin, user.id, featureKey, tier);
  } catch (err) {
    console.error(
      `[API] supplemental ${featureKey}: failed to verify usage:`,
      err instanceof Error ? err.message : String(err),
    );
    return {
      response: Response.json(
        { error: "Couldn't verify your plan usage. Please try again." },
        { status: 503 },
      ),
    };
  }
  if (!allowance.enabled) {
    return { response: Response.json({ error: PRO_MESSAGE }, { status: 403 }) };
  }
  if (!allowance.allowed) {
    return {
      response: Response.json(
        {
          error:
            "You've reached your monthly limit for this. It resets at the start of next month.",
        },
        { status: 429 },
      ),
    };
  }

  const model = allowance.model ?? SUBSCRIPTION_TIERS[tier].model;

  return {
    context: {
      userId: user.id,
      admin,
      essay: essayRow,
      collegeName,
      fieldKey,
      profile,
      profileRow: profileRow as EntitlementProfile,
      tier,
      model,
    },
  };
}
