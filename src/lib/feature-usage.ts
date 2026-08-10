// Feature-based entitlement enforcement.
//
// The single server-side gate for "may this tier use this feature right now?".
// It reads the central FEATURE_ACCESS registry (enabled / limit / window / model)
// and counts the user's prior uses in the append-only feature_usage ledger. This
// replaces the old roadmap_generations "N per month" enforcement entirely.

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  type FeatureKey,
  resolveFeatureAccess,
  type TierKey,
  type UsageWindow,
} from "~/lib/ai/config";

/**
 * The first instant of a usage window, or null for a lifetime window (count all
 * rows ever). "week" is a rolling 7-day window; "month" is the calendar month.
 */
function windowStart(window: UsageWindow | null, now: Date): Date | null {
  if (window === null || window === "lifetime") return null;
  const start = new Date(now);
  if (window === "month") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }
  // "week" — rolling 7-day window.
  start.setDate(start.getDate() - 7);
  return start;
}

/**
 * Count a user's uses of a feature within the given window. Throws on error
 * (e.g. the ledger is missing/unreachable) so callers fail CLOSED — never silently
 * grant access.
 */
export async function countFeatureUsage(
  client: SupabaseClient,
  userId: string,
  feature: FeatureKey,
  window: UsageWindow | null,
  now: Date = new Date(),
): Promise<number> {
  let query = client
    .from("feature_usage")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("feature", feature);

  const start = windowStart(window, now);
  if (start) {
    query = query.gte("created_at", start.toISOString());
  }

  const { count, error } = await query;
  if (error) {
    throw new Error(`Failed to count feature usage: ${error.message}`);
  }
  return count ?? 0;
}

/**
 * Record one use of a feature in the append-only ledger. Service-role only.
 * Best-effort (logs on failure) — matches the previous ledger's non-fatal write.
 */
export async function recordFeatureUsage(
  admin: SupabaseClient,
  userId: string,
  feature: FeatureKey,
  tier: TierKey,
): Promise<void> {
  const { error } = await admin
    .from("feature_usage")
    .insert({ user_id: userId, feature, tier });
  if (error) {
    console.error(`[usage] failed to record ${feature} usage:`, error.message);
  }
}

export type Allowance = {
  /** Whether the tier may use the feature right now. */
  allowed: boolean;
  /** Whether the tier has the feature at all (false → locked/upgrade). */
  enabled: boolean;
  /** Max uses per window, or null for unlimited. */
  limit: number | null;
  /** Uses already consumed in the current window. */
  used: number;
  /** The window the limit is measured over. */
  window: UsageWindow | null;
  /** Model to use for this feature+tier (central AI-cost control). */
  model?: string;
};

/**
 * The central entitlement check. Resolves the feature's access rule for the tier,
 * then compares recorded usage against the limit. Call this BEFORE any AI request.
 * Throws only if the usage count fails (caller should fail closed).
 */
export async function checkFeatureAllowance(
  client: SupabaseClient,
  userId: string,
  feature: FeatureKey,
  tier: TierKey,
  now: Date = new Date(),
): Promise<Allowance> {
  const access = resolveFeatureAccess(feature, tier);

  if (!access.enabled) {
    return {
      allowed: false,
      enabled: false,
      limit: access.limit,
      used: 0,
      window: access.window,
      model: access.model,
    };
  }

  // Unlimited (limit === null): allowed without touching the ledger.
  if (access.limit === null) {
    return {
      allowed: true,
      enabled: true,
      limit: null,
      used: 0,
      window: access.window,
      model: access.model,
    };
  }

  const used = await countFeatureUsage(
    client,
    userId,
    feature,
    access.window,
    now,
  );

  return {
    allowed: used < access.limit,
    enabled: true,
    limit: access.limit,
    used,
    window: access.window,
    model: access.model,
  };
}
