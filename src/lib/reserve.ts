// Generic atomic "reserve a lifetime generation" primitive, shared by features
// that allow exactly one successful generation per account (the calendar; the
// roadmap has its own typed store). Relies on a UNIQUE user_id constraint on the
// target table: of two concurrent requests exactly one wins the insert. DB errors
// THROW (never swallowed) so callers fail closed instead of looping.

import type { SupabaseClient } from "@supabase/supabase-js";

export type ReserveOutcome = "reserved" | "recovered" | "exists";

/** Reservations older than this are stale (a crashed generation) and reclaimable. */
const STALE_MS = 3 * 60 * 1000;

export async function reserveGeneration(
  admin: SupabaseClient,
  opts: {
    table: string;
    userId: string;
    now: Date;
    /** Extra columns to set on the fresh reservation insert (e.g. tier). */
    extraInsert?: Record<string, unknown>;
  },
): Promise<ReserveOutcome> {
  const { table, userId, now } = opts;
  const nowISO = now.toISOString();

  // 1) Fresh insert (ON CONFLICT DO NOTHING). A DB error must throw.
  const { data: inserted, error: insertError } = await admin
    .from(table)
    .upsert(
      {
        user_id: userId,
        status: "generating",
        started_at: nowISO,
        updated_at: nowISO,
        ...opts.extraInsert,
      },
      { onConflict: "user_id", ignoreDuplicates: true },
    )
    .select("id");
  if (insertError) {
    throw new Error(`Failed to reserve ${table}: ${insertError.message}`);
  }
  if (inserted && inserted.length > 0) return "reserved";

  // 2) A row exists. Inspect it.
  const { data: row, error: readError } = await admin
    .from(table)
    .select("status, started_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (readError) {
    throw new Error(`Failed to read ${table}: ${readError.message}`);
  }
  if (!row) return "exists";
  const r = row as { status: string; started_at: string };
  if (r.status === "ready") return "exists";
  const fresh =
    r.status === "generating" &&
    now.getTime() - new Date(r.started_at).getTime() < STALE_MS;
  if (fresh) return "exists";

  // 3) Reclaim a failed or stale-generating row with a guarded atomic update.
  let q = admin
    .from(table)
    .update({
      status: "generating",
      started_at: nowISO,
      error: null,
      updated_at: nowISO,
    })
    .eq("user_id", userId);
  q =
    r.status === "failed"
      ? q.eq("status", "failed")
      : q
          .eq("status", "generating")
          .lt("started_at", new Date(now.getTime() - STALE_MS).toISOString());
  const { data: recovered, error: recoverError } = await q.select("id");
  if (recoverError) {
    throw new Error(`Failed to reserve ${table}: ${recoverError.message}`);
  }
  return recovered && recovered.length > 0 ? "recovered" : "exists";
}
