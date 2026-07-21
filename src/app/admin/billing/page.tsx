import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { createAdminClient } from "~/lib/supabase/admin";
import { getFirstName, getLastName } from "~/lib/user";
import { BillingControl, type BillingUser } from "./billing-control";

export const metadata = { title: "Billing Control — AppGap Admin" };

interface ProfileRow extends EntitlementProfile {
  id: string;
  stripe_customer_id: string | null;
}

export default async function AdminBillingPage() {
  const admin = createAdminClient();

  const [usersRes, profilesRes] = await Promise.all([
    admin.auth.admin.listUsers({ perPage: 1000 }),
    admin
      .from("profiles")
      .select(
        "id, subscription_tier, subscription_status, current_period_end, stripe_customer_id, stripe_subscription_id, admin_override, admin_override_tier, admin_override_start, admin_override_expires_at, admin_override_paused_stripe",
      ),
  ]);

  const profileMap = new Map<string, ProfileRow>(
    (profilesRes.data ?? []).map((p) => [p.id, p as ProfileRow]),
  );

  const users: BillingUser[] = (usersRes.data?.users ?? [])
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )
    .map((u) => {
      const profile = profileMap.get(u.id);
      const ent = resolveEntitlement(profile);
      const name = [getFirstName(u), getLastName(u)].filter(Boolean).join(" ");
      return {
        id: u.id,
        name: name || "",
        email: u.email ?? "—",
        joinedAt: u.created_at,
        effectiveTier: ent.tier,
        source: ent.source,
        status: ent.status,
        expiresAt: ent.expiresAt,
        stripeCustomerId: profile?.stripe_customer_id ?? null,
        hasStripeSubscription: !!profile?.stripe_subscription_id,
        hasActiveOverride: ent.isAdminOverride,
        overrideTier: (profile?.admin_override_tier as "free" | "pro") ?? null,
        overrideExpiresAt: profile?.admin_override_expires_at ?? null,
      };
    });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Billing Control
        </h2>
        <p className="text-sm text-muted-foreground">
          Search users and manage complimentary subscription overrides.
          Overrides take priority over Stripe and never charge the user.
        </p>
      </div>
      <BillingControl users={users} />
    </div>
  );
}
