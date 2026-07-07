import { redirect } from "next/navigation";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";
import { BillingCards } from "./billing-cards";

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
    .select("subscription_tier, subscription_status, current_period_end")
    .eq("id", user.id)
    .maybeSingle();

  const isPro =
    profile?.subscription_tier === "pro" &&
    profile?.subscription_status === "active";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your AppGap subscription and payment details.
        </p>
      </div>
      <BillingCards
        isPro={isPro}
        currentPeriodEnd={profile?.current_period_end ?? null}
      />
    </div>
  );
}
