// My Roadmap — the generation lifecycle orchestrator. This is the single place
// that enforces the "one successful roadmap, ever" rule and the recoverable-
// failure contract. It is written against a small RoadmapStore interface so the
// whole lifecycle (Pro gating, lifetime enforcement, concurrency, failure
// recovery, "second request returns the saved roadmap") is unit-testable with an
// in-memory store and no database or AI. The HTTP route supplies the real,
// Supabase-backed store.
//
// Concurrency + lifetime guarantees:
//   • The ONLY way to begin generating is store.reserve(), which is atomic (the
//     real store relies on the unique roadmaps.user_id constraint). Of two
//     concurrent requests exactly one gets "reserved"/"recovered"; the other gets
//     "exists" and returns the saved/in-flight roadmap — never a second generation.
//   • Usage is recorded in the append-only ledger ONLY after a roadmap is marked
//     'ready'. A transient generation failure marks the row 'failed' (recoverable)
//     and records no usage, so the lifetime allowance is never lost to an error.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { TierKey } from "~/lib/ai/config";
import { recordFeatureUsage } from "~/lib/feature-usage";
import { deriveRoadmap } from "./select";
import type { RoadmapContext, SavedMilestone, StoredRoadmap } from "./types";

/** Result of an atomic reservation attempt. */
export type ReserveOutcome = "reserved" | "recovered" | "exists";

export interface RoadmapStore {
  /** The current saved roadmap, or null when none exists. */
  get(): Promise<StoredRoadmap | null>;
  /** Atomically claim the right to generate. See ReserveOutcome. */
  reserve(): Promise<ReserveOutcome>;
  /** Persist a completed roadmap (status → 'ready'). */
  markReady(
    milestones: SavedMilestone[],
    nextStepId: string | null,
  ): Promise<void>;
  /** Mark a reservation as recoverable-failed (status → 'failed'). */
  markFailed(error: string): Promise<void>;
}

export interface GenerationDeps {
  store: RoadmapStore;
  /** True when the student is entitled to generate (Pro / override / admin). */
  isPro: boolean;
  /** True only for the admin account — never consumes the ledger. */
  unlimited: boolean;
  /** Reads the feature allowance (throws → caller fails closed). */
  checkAllowance: () => Promise<{ allowed: boolean; enabled: boolean }>;
  /** Produces validated milestones; throws on transient failure (recoverable). */
  generate: () => Promise<SavedMilestone[]>;
  /** Records one lifetime generation in the ledger (after 'ready'). */
  recordUsage: () => Promise<void>;
  /** Deterministic next-step for a milestone set. */
  deriveNextStep: (milestones: SavedMilestone[]) => string | null;
}

export type GenerationResult =
  | { status: "ready"; roadmap: StoredRoadmap }
  | { status: "in_progress" }
  | { status: "not_pro" }
  | { status: "limit_reached" }
  | { status: "failed" };

export async function runRoadmapGeneration(
  deps: GenerationDeps,
): Promise<GenerationResult> {
  if (!deps.isPro) return { status: "not_pro" };

  // A ready roadmap is always returned as-is — never regenerated, no allowance
  // check needed. (generating/failed/none all fall through to reserve.)
  const existing = await deps.store.get();
  if (existing?.status === "ready") {
    return { status: "ready", roadmap: existing };
  }

  // Allowance check. Throwing propagates so the route can fail CLOSED (503).
  const allowance = await deps.checkAllowance();
  if (!allowance.enabled) return { status: "not_pro" };
  if (!allowance.allowed) return { status: "limit_reached" };

  // Atomically claim the generation. The loser of a concurrent race returns the
  // saved/in-flight roadmap instead of generating a second one.
  const outcome = await deps.store.reserve();
  if (outcome === "exists") {
    const current = await deps.store.get();
    if (current?.status === "ready") {
      return { status: "ready", roadmap: current };
    }
    return { status: "in_progress" };
  }

  // We own the generation (reserved a fresh row or recovered a failed/stale one).
  try {
    const milestones = await deps.generate();
    const nextStepId = deps.deriveNextStep(milestones);
    await deps.store.markReady(milestones, nextStepId);
    // Record the single lifetime use ONLY after the roadmap is safely persisted.
    if (!deps.unlimited) await deps.recordUsage();
    return {
      status: "ready",
      roadmap: { status: "ready", milestones, nextStepId },
    };
  } catch (err) {
    // Recoverable: mark failed, record NO usage, allow a later retry.
    await deps.store.markFailed(
      err instanceof Error ? err.message : String(err),
    );
    return { status: "failed" };
  }
}

// ─── Supabase-backed store ───────────────────────────────────────────────────

/** Reservations older than this are considered stale (a crashed generation) and
 *  may be reclaimed for retry. */
const STALE_MS = 3 * 60 * 1000;

type RoadmapRow = {
  status: "generating" | "ready" | "failed";
  milestones: SavedMilestone[] | null;
  next_step_id: string | null;
  error: string | null;
  started_at: string;
};

/** The real, Supabase-backed store. Writes use the service-role client (bypasses
 *  RLS); the unique user_id constraint makes reserve() atomic across requests. */
export function createRoadmapStore(
  admin: SupabaseClient,
  userId: string,
  tier: TierKey,
  now: Date = new Date(),
): RoadmapStore {
  const nowISO = now.toISOString();

  // A DB error must never be swallowed: silently treating a failed read/write as
  // "no row" would, in reserve(), look like a conflict and loop the client in a
  // perpetual "generating" state. Surfacing the error lets the route fail closed
  // (503) with an honest message instead. The most common cause in practice is
  // the roadmaps table not existing yet (migration not applied to this DB).
  const fetchRow = async (): Promise<RoadmapRow | null> => {
    const { data, error } = await admin
      .from("roadmaps")
      .select("status, milestones, next_step_id, error, started_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read roadmap: ${error.message}`);
    }
    return (data as RoadmapRow | null) ?? null;
  };

  return {
    async get() {
      const row = await fetchRow();
      if (!row) return null;
      return {
        status: row.status,
        milestones: row.milestones ?? [],
        nextStepId: row.next_step_id,
        error: row.error,
      };
    },

    async reserve() {
      // 1) Try a fresh insert. ON CONFLICT DO NOTHING via ignoreDuplicates — an
      //    empty returned set means a row already existed. A real DB error here
      //    must THROW (not be read as a conflict), or the client loops forever.
      const { data: inserted, error: insertError } = await admin
        .from("roadmaps")
        .upsert(
          {
            user_id: userId,
            status: "generating",
            milestones: [],
            next_step_id: null,
            tier,
            error: null,
            started_at: nowISO,
            generated_at: null,
            updated_at: nowISO,
          },
          { onConflict: "user_id", ignoreDuplicates: true },
        )
        .select("id");
      if (insertError) {
        throw new Error(`Failed to reserve roadmap: ${insertError.message}`);
      }
      if (inserted && inserted.length > 0) return "reserved";

      // 2) A row exists (genuine conflict). Return it as-is if it's ready or a
      //    fresh in-flight run. fetchRow throws on a read error.
      const row = await fetchRow();
      if (!row) return "exists";
      if (row.status === "ready") return "exists";
      const fresh =
        row.status === "generating" &&
        now.getTime() - new Date(row.started_at).getTime() < STALE_MS;
      if (fresh) return "exists";

      // 3) Reclaim a failed or stale-generating row with a guarded, atomic update.
      let q = admin
        .from("roadmaps")
        .update({
          status: "generating",
          started_at: nowISO,
          error: null,
          updated_at: nowISO,
        })
        .eq("user_id", userId);
      q =
        row.status === "failed"
          ? q.eq("status", "failed")
          : q
              .eq("status", "generating")
              .lt(
                "started_at",
                new Date(now.getTime() - STALE_MS).toISOString(),
              );
      const { data: recovered, error: recoverError } = await q.select("id");
      if (recoverError) {
        throw new Error(`Failed to reserve roadmap: ${recoverError.message}`);
      }
      return recovered && recovered.length > 0 ? "recovered" : "exists";
    },

    async markReady(milestones, nextStepId) {
      // markReady MUST confirm the write — if it silently failed, the orchestrator
      // would report "ready" while nothing persisted, and the next load would show
      // an in-flight roadmap forever. Throwing routes it to markFailed (recoverable).
      const { error } = await admin
        .from("roadmaps")
        .update({
          status: "ready",
          milestones,
          next_step_id: nextStepId,
          error: null,
          generated_at: nowISO,
          updated_at: nowISO,
        })
        .eq("user_id", userId);
      if (error) {
        throw new Error(`Failed to save roadmap: ${error.message}`);
      }
    },

    async markFailed(error) {
      // Best-effort — this already runs on an error path; a failure to record the
      // 'failed' status is non-fatal (the stale-generating guard reclaims it later).
      const { error: writeError } = await admin
        .from("roadmaps")
        .update({ status: "failed", error, updated_at: nowISO })
        .eq("user_id", userId);
      if (writeError) {
        console.error(
          "[roadmap] failed to mark generation failed:",
          writeError.message,
        );
      }
    },
  };
}

/** Record one lifetime roadmap generation in the append-only ledger. */
export function recordRoadmapUsage(
  admin: SupabaseClient,
  userId: string,
  tier: TierKey,
): Promise<void> {
  return recordFeatureUsage(admin, userId, "roadmapGeneration", tier);
}

/** Convenience: deterministic next step for a stored milestone set + context. */
export function nextStepFor(
  milestones: SavedMilestone[],
  ctx: RoadmapContext,
): string | null {
  return deriveRoadmap(milestones, ctx).nextStepId;
}
