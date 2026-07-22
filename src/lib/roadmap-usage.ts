// Roadmap generation usage — the single source of truth for "how many
// generations has this user consumed this billing month". Reads the append-only
// `roadmap_generations` ledger, NOT the `ai_analyses` rows, so deleting a saved
// roadmap never affects the count. Both tiers use a calendar-month window that
// resets on the 1st, keeping the API and the dashboard UI perfectly consistent.

import type { SupabaseClient } from "@supabase/supabase-js";

/** First instant of the current calendar month (local server time). */
export function billingMonthStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return start;
}

/** First instant of the next calendar month — when the monthly limit resets. */
export function billingMonthEnd(now: Date = new Date()): Date {
  const end = billingMonthStart(now);
  end.setMonth(end.getMonth() + 1);
  return end;
}

/**
 * Count the generations a user has consumed in the current billing month.
 * Works with either the service-role admin client (API route) or a user-scoped
 * client (dashboard pages), since the ledger has an authenticated select-own
 * RLS policy.
 */
export async function countGenerationsThisMonth(
  client: SupabaseClient,
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const { count, error } = await client
    .from("roadmap_generations")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", billingMonthStart(now).toISOString());

  // Never swallow the error and return 0 — that would silently grant unlimited
  // generations (e.g. if the ledger table is missing or unreachable). Throw so
  // callers can fail closed (block generation) rather than fail open.
  if (error) {
    throw new Error(`Failed to count roadmap generations: ${error.message}`);
  }

  return count ?? 0;
}
