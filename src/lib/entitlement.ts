// Entitlement resolution — the single source of truth for a user's *effective*
// subscription tier. An admin "complimentary" override takes priority over
// Stripe while active; when it expires we fall straight back to whatever Stripe
// state was already on the profile (which is never modified by overrides).
//
// Server-only: reconcileExpiredOverride talks to Stripe and the service-role DB.

import type { SupabaseClient } from "@supabase/supabase-js";
import { stripe } from "~/lib/stripe";

export type Tier = "free" | "pro";
export type EntitlementSource = "admin_override" | "stripe";

/** The subset of `profiles` columns entitlement logic reads. */
export interface EntitlementProfile {
  id?: string;
  subscription_tier?: string | null;
  subscription_status?: string | null;
  current_period_end?: string | null;
  stripe_subscription_id?: string | null;
  admin_override?: boolean | null;
  admin_override_tier?: string | null;
  admin_override_start?: string | null;
  admin_override_expires_at?: string | null;
  admin_override_paused_stripe?: boolean | null;
}

export interface Entitlement {
  /** The effective tier the app should treat this user as. */
  tier: Tier;
  /** The effective subscription status label. */
  status: string | null;
  /** When the current entitlement ends (override expiry or Stripe period end). */
  expiresAt: string | null;
  /** Where the effective tier came from. */
  source: EntitlementSource;
  /** True when an active admin override is the reason for the tier. */
  isAdminOverride: boolean;
}

function toTier(value: string | null | undefined): Tier {
  return value === "pro" ? "pro" : "free";
}

/**
 * Is an admin override currently active? True when the flag is set and either
 * there is no expiry (indefinite) or the expiry is still in the future.
 */
export function isOverrideActive(
  profile: EntitlementProfile,
  now: Date = new Date(),
): boolean {
  if (!profile.admin_override) return false;
  if (!profile.admin_override_expires_at) return true;
  return new Date(profile.admin_override_expires_at) > now;
}

/**
 * Pure resolver — no side effects. An expired-but-not-yet-reconciled override is
 * treated as inactive, so display is correct even before reconciliation writes.
 */
export function resolveEntitlement(
  profile: EntitlementProfile | null | undefined,
  now: Date = new Date(),
): Entitlement {
  if (profile && isOverrideActive(profile, now)) {
    return {
      tier: toTier(profile.admin_override_tier),
      status: "active",
      expiresAt: profile.admin_override_expires_at ?? null,
      source: "admin_override",
      isAdminOverride: true,
    };
  }

  return {
    tier: toTier(profile?.subscription_tier),
    status: profile?.subscription_status ?? null,
    expiresAt: profile?.current_period_end ?? null,
    source: "stripe",
    isAdminOverride: false,
  };
}

/** Convenience: does the effective entitlement grant Pro-level access? */
export function isProEntitled(ent: Entitlement): boolean {
  if (ent.tier !== "pro") return false;
  // Stripe Pro requires an active status; an override is always "active".
  return ent.isAdminOverride || ent.status === "active";
}

const EXPIRY_MESSAGE =
  "Your admin-granted Pro subscription tier has expired. If you would like to keep the plan, check Billing — you can purchase it this time.";

/**
 * If the profile has an override whose expiry has passed but which is still
 * flagged active, wind it down exactly once:
 *   1. Resume the Stripe subscription's collection if we paused it.
 *   2. Clear the override flag on the profile (Stripe columns untouched).
 *   3. Drop an "expired" notification for the user.
 *
 * Safe to call on every relevant read; the `.eq("admin_override", true)` guard
 * makes the flip idempotent under concurrency. Returns true if it reconciled.
 */
export async function reconcileExpiredOverride(
  admin: SupabaseClient,
  profile: EntitlementProfile,
  now: Date = new Date(),
): Promise<boolean> {
  if (!profile.id) return false;
  if (!profile.admin_override) return false;
  if (
    !profile.admin_override_expires_at ||
    new Date(profile.admin_override_expires_at) > now
  ) {
    return false;
  }

  // Atomically claim the expiry: only one caller flips the flag from true.
  const { data: claimed, error: claimError } = await admin
    .from("profiles")
    .update({
      admin_override: false,
      admin_override_paused_stripe: false,
    })
    .eq("id", profile.id)
    .eq("admin_override", true)
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) return false;

  // Resume Stripe billing if we had paused this user's active subscription.
  if (profile.admin_override_paused_stripe && profile.stripe_subscription_id) {
    try {
      await stripe.subscriptions.update(profile.stripe_subscription_id, {
        pause_collection: "",
      });
    } catch (err) {
      // Non-fatal: log and continue. The override is already cleared, so the
      // user simply resumes normal billing on their next cycle.
      console.error("[entitlement] failed to resume Stripe collection:", err);
    }
  }

  const expiredTier = toTier(profile.admin_override_tier);
  const { error: notifyError } = await admin
    .from("subscription_notifications")
    .insert({
      user_id: profile.id,
      type: "expired",
      tier: expiredTier,
      duration_label: null,
      expires_at: profile.admin_override_expires_at,
      message: EXPIRY_MESSAGE,
    });
  if (notifyError) {
    console.error(
      "[entitlement] failed to insert expiry notification:",
      notifyError.message,
    );
  }

  return true;
}
