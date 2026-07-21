import { redirect } from "next/navigation";
import {
  type EntitlementProfile,
  isProEntitled,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";
import { BillingCards } from "./billing-cards";
import {
  type BillingNotification,
  SubscriptionNotification,
} from "./subscription-notification";

export const metadata = { title: "Billing — AppGap" };

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, subscription_tier, subscription_status, current_period_end, stripe_subscription_id, admin_override, admin_override_tier, admin_override_start, admin_override_expires_at, admin_override_paused_stripe",
    )
    .eq("id", user.id)
    .maybeSingle();

  // If an admin override lapsed since the user last visited, wind it down now
  // (resumes Stripe, drops an "expired" notification). Resolver already treats
  // an expired override as inactive, so display stays correct regardless.
  if (profile) {
    await reconcileExpiredOverride(admin, profile as EntitlementProfile);
  }

  const entitlement = resolveEntitlement(profile as EntitlementProfile | null);
  const isPro = isProEntitled(entitlement);

  const { data: notifications } = await admin
    .from("subscription_notifications")
    .select("id, type, tier, duration_label, expires_at, message, created_at")
    .eq("user_id", user.id)
    .is("read_at", null)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your AppGap subscription and payment details.
          </p>
        </div>
        <SubscriptionNotification
          notifications={(notifications ?? []) as BillingNotification[]}
        />
      </div>
      <BillingCards
        isPro={isPro}
        currentPeriodEnd={entitlement.expiresAt}
        isAdminOverride={entitlement.isAdminOverride}
      />
    </div>
  );
}
