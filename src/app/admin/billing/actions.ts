"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "~/lib/is-admin";
import { stripe } from "~/lib/stripe";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Stripe statuses where a subscription is (or could be) actively billing and so
// should have collection paused during a complimentary override.
const PAUSABLE_STATUSES = new Set(["active", "trialing", "past_due"]);

type Tier = "free" | "pro";

async function requireAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return isAdmin(user?.email);
}

export interface AssignResult {
  ok: boolean;
  error?: string;
}

export interface AssignInput {
  userId: string;
  tier: Tier;
  /** Preset duration in months; null when using a custom end date. */
  durationMonths: number | null;
  /** ISO date (YYYY-MM-DD) for a custom end date. */
  customEndDate?: string | null;
}

function tierLabel(tier: Tier): string {
  return tier === "pro" ? "Pro" : "Free";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Assign a complimentary subscription override. The user is NEVER charged while
 * it is active: we never create a Stripe subscription, and if the user already
 * has an actively-billing Stripe subscription we pause its collection (void
 * behavior) so no invoices are generated. Stripe data is never deleted or
 * cancelled — on expiry, reconciliation resumes collection.
 */
export async function assignSubscription(
  input: AssignInput,
): Promise<AssignResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Not authorized." };
  }

  const { userId, tier } = input;
  if (tier !== "free" && tier !== "pro") {
    return { ok: false, error: "Invalid tier." };
  }

  // Compute the override window.
  const start = new Date();
  let end: Date;
  let durationLabel: string;

  if (input.durationMonths != null) {
    const months = input.durationMonths;
    if (![1, 2, 3, 6, 12].includes(months)) {
      return { ok: false, error: "Invalid duration." };
    }
    end = new Date(start);
    end.setMonth(end.getMonth() + months);
    durationLabel = `${months} Month${months > 1 ? "s" : ""}`;
  } else {
    if (!input.customEndDate) {
      return { ok: false, error: "Please choose a custom end date." };
    }
    // Interpret the custom date as end-of-day so the full day is included.
    end = new Date(`${input.customEndDate}T23:59:59`);
    if (Number.isNaN(end.getTime()) || end <= start) {
      return { ok: false, error: "Custom end date must be in the future." };
    }
    durationLabel = `Until ${formatDate(end)}`;
  }

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, stripe_subscription_id, admin_override_paused_stripe")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    return { ok: false, error: "Could not load the user's profile." };
  }
  if (!profile) {
    // Profile row may not exist yet (user hasn't started onboarding). Create a
    // minimal row so the override has somewhere to live.
    const { error: insertError } = await admin
      .from("profiles")
      .insert({ id: userId });
    if (insertError) {
      return { ok: false, error: "Could not initialize the user's profile." };
    }
  }

  // Pause an actively-billing Stripe subscription so the user isn't charged.
  let pausedStripe = profile?.admin_override_paused_stripe ?? false;
  const stripeSubId = profile?.stripe_subscription_id ?? null;
  if (stripeSubId) {
    try {
      const sub = await stripe.subscriptions.retrieve(stripeSubId);
      if (PAUSABLE_STATUSES.has(sub.status)) {
        await stripe.subscriptions.update(stripeSubId, {
          pause_collection: { behavior: "void" },
        });
        pausedStripe = true;
      }
    } catch (err) {
      // Non-fatal: proceed with the override even if pausing fails; the user
      // still gets the granted tier via the entitlement resolver.
      console.error("[billing-control] failed to pause Stripe:", err);
    }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({
      admin_override: true,
      admin_override_tier: tier,
      admin_override_start: start.toISOString(),
      admin_override_expires_at: end.toISOString(),
      admin_override_paused_stripe: pausedStripe,
    })
    .eq("id", userId);

  if (updateError) {
    return { ok: false, error: "Could not save the override." };
  }

  // In-app notification for the user (red badge on their Billing page).
  const { error: notifyError } = await admin
    .from("subscription_notifications")
    .insert({
      user_id: userId,
      type: "granted",
      tier,
      duration_label: durationLabel,
      expires_at: end.toISOString(),
      message: `Your subscription has been updated by the AppGap Admin to ${tierLabel(
        tier,
      )} for ${durationLabel}.`,
    });
  if (notifyError) {
    console.error(
      "[billing-control] failed to insert notification:",
      notifyError.message,
    );
  }

  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

/**
 * End an active override immediately: resume Stripe collection if we paused it,
 * clear the override, and notify the user. Never cancels/deletes Stripe data.
 */
export async function revokeOverride(userId: string): Promise<AssignResult> {
  if (!(await requireAdmin())) {
    return { ok: false, error: "Not authorized." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select(
      "id, admin_override, admin_override_tier, admin_override_expires_at, admin_override_paused_stripe, stripe_subscription_id",
    )
    .eq("id", userId)
    .maybeSingle();

  if (!profile || !profile.admin_override) {
    return { ok: false, error: "No active override to revoke." };
  }

  if (profile.admin_override_paused_stripe && profile.stripe_subscription_id) {
    try {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        pause_collection: "",
      });
    } catch (err) {
      console.error("[billing-control] failed to resume Stripe:", err);
    }
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ admin_override: false, admin_override_paused_stripe: false })
    .eq("id", userId);

  if (updateError) {
    return { ok: false, error: "Could not revoke the override." };
  }

  await admin.from("subscription_notifications").insert({
    user_id: userId,
    type: "expired",
    tier: (profile.admin_override_tier as Tier) ?? "pro",
    duration_label: null,
    expires_at: profile.admin_override_expires_at,
    message:
      "Your admin-granted Pro subscription tier has expired. If you would like to keep the plan, check Billing — you can purchase it this time.",
  });

  revalidatePath("/admin/billing");
  revalidatePath("/admin");
  revalidatePath("/dashboard/billing");
  return { ok: true };
}

export interface BillingMethodResult {
  method: string | null;
  error?: string;
}

/** Fetch a human-readable default card for a user, on demand. */
export async function getBillingMethod(
  userId: string,
): Promise<BillingMethodResult> {
  if (!(await requireAdmin())) {
    return { method: null, error: "Not authorized." };
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  const customerId = profile?.stripe_customer_id;
  if (!customerId) return { method: null };

  try {
    const customer = await stripe.customers.retrieve(customerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if (customer.deleted) return { method: null };

    let pm = customer.invoice_settings?.default_payment_method;
    if (typeof pm === "string" || !pm) {
      // Fall back to the first card on file.
      const list = await stripe.paymentMethods.list({
        customer: customerId,
        type: "card",
        limit: 1,
      });
      pm = list.data[0] ?? null;
    }

    if (pm && typeof pm !== "string" && pm.card) {
      const brand = pm.card.brand
        ? pm.card.brand.charAt(0).toUpperCase() + pm.card.brand.slice(1)
        : "Card";
      return { method: `${brand} •••• ${pm.card.last4}` };
    }
    return { method: null };
  } catch (err) {
    console.error("[billing-control] failed to fetch billing method:", err);
    return { method: null, error: "Could not load billing method." };
  }
}
