// Lightweight activity ledger (user_events) powering the dashboard "Jump In"
// card and future progress tracking. Every helper is fail-soft: if the
// user_events table is absent (migration not yet applied) or a write fails,
// nothing throws — the feature degrades to empty rather than breaking the page
// or the analysis generation.

import type { SupabaseClient } from "@supabase/supabase-js";

export type UserEvent = {
  eventType: string;
  title: string;
  createdAt: string;
  metadata: Record<string, unknown>;
};

/**
 * Record a meaningful action (e.g. "analysis_generated"). Best-effort and
 * non-fatal — callers should never let event recording break the real work.
 */
export async function recordEvent(
  client: SupabaseClient,
  userId: string,
  eventType: string,
  title: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await client
      .from("user_events")
      .insert({ user_id: userId, event_type: eventType, title, metadata });
  } catch {
    // Non-fatal: activity tracking must never break the underlying action.
  }
}

/** The most recent event for a user, or null on any error / missing table. */
export async function getLatestEvent(
  client: SupabaseClient,
  userId: string,
): Promise<UserEvent | null> {
  try {
    const { data, error } = await client
      .from("user_events")
      .select("event_type, title, created_at, metadata")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    return {
      eventType: data.event_type as string,
      title: data.title as string,
      createdAt: data.created_at as string,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
    };
  } catch {
    return null;
  }
}
