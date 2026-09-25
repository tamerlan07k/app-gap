// Shared Pro-gate for the Supplemental Essays pages. Resolves the signed-in user
// and whether their tier can use the feature (FEATURE_ACCESS: supplementalCoach).
// Server-only.

import { resolveFeatureAccess } from "~/lib/ai/config";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { createClient } from "~/lib/supabase/server";

export type SupplementalGate = {
  userId: string;
  enabled: boolean;
};

/** Returns the gate, or null when there is no signed-in user. */
export async function resolveSupplementalGate(): Promise<SupplementalGate | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRow } = await supabase
    .from("profiles")
    .select(
      "subscription_tier, subscription_status, admin_override, admin_override_tier, admin_override_expires_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  const entitlement = resolveEntitlement(
    profileRow as EntitlementProfile | null,
  );
  const access = resolveFeatureAccess("supplementalCoach", entitlement.tier);
  return { userId: user.id, enabled: access.enabled };
}
