// Keep the calendar and the roadmap in sync when they represent the same work.
// A calendar_tasks row carries a milestone_id when it mirrors a roadmap milestone;
// completing one side updates the other. All deterministic — never an AI call and
// never a new generation.

import type { SupabaseClient } from "@supabase/supabase-js";
import { deriveRoadmap } from "~/lib/roadmap/select";
import type { RoadmapContext, SavedMilestone } from "~/lib/roadmap/types";

/** Mark all calendar tasks that mirror a milestone done/undone. */
export async function setMilestoneCalendarTasks(
  admin: SupabaseClient,
  userId: string,
  milestoneId: string,
  done: boolean,
): Promise<void> {
  await admin
    .from("calendar_tasks")
    .update({
      status: done ? "done" : "todo",
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("milestone_id", milestoneId);
}

/**
 * Apply a milestone completion change to the roadmap (if one exists) and return
 * the re-derived state. Pure DB + deterministic re-derivation; returns null when
 * there's no ready roadmap (e.g. the student is still in the foundation phase).
 */
export async function setRoadmapMilestoneState(
  admin: SupabaseClient,
  userId: string,
  milestoneId: string,
  done: boolean,
  ctx: RoadmapContext,
): Promise<{ milestones: SavedMilestone[]; nextStepId: string | null } | null> {
  const { data: row } = await admin
    .from("roadmaps")
    .select("status, milestones")
    .eq("user_id", userId)
    .maybeSingle();
  const r = row as {
    status: string;
    milestones: SavedMilestone[] | null;
  } | null;
  if (!r || r.status !== "ready") return null;

  const saved = r.milestones ?? [];
  if (!saved.some((m) => m.id === milestoneId)) return null;

  const updated: SavedMilestone[] = saved.map((m) =>
    m.id === milestoneId ? { ...m, state: done ? "complete" : "upcoming" } : m,
  );
  const { nextStepId } = deriveRoadmap(updated, ctx);

  await admin
    .from("roadmaps")
    .update({
      milestones: updated,
      next_step_id: nextStepId,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return { milestones: updated, nextStepId };
}
