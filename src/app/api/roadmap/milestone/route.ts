import { setMilestoneCalendarTasks } from "~/lib/calendar/sync";
import { loadFullProfile } from "~/lib/profile-full";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import {
  adaptRoadmap,
  deriveRoadmap,
  roadmapProgress,
} from "~/lib/roadmap/select";
import type { SavedMilestone } from "~/lib/roadmap/types";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Milestone progress update. Marks a milestone complete / reopens it, then
// DETERMINISTICALLY recomputes states and the next recommended step (no AI call).
// It also runs light, deterministic adaptation — skipping any now-ineligible
// milestone and adding newly-eligible ones — without ever resetting completed
// work. Opening a workspace never calls this; only an explicit complete/reopen.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; action?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : null;
  const action = body.action === "reopen" ? "reopen" : "complete";
  if (!id) {
    return Response.json({ error: "Missing milestone id." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: row } = await admin
    .from("roadmaps")
    .select("status, milestones")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row || row.status !== "ready") {
    return Response.json({ error: "No roadmap found." }, { status: 404 });
  }

  const saved = (row.milestones as SavedMilestone[] | null) ?? [];
  if (!saved.some((m) => m.id === id)) {
    return Response.json(
      { error: "That milestone isn't in your roadmap." },
      { status: 400 },
    );
  }

  // Apply the sticky state change for the one milestone.
  const updated: SavedMilestone[] = saved.map((m) =>
    m.id === id
      ? { ...m, state: action === "complete" ? "complete" : "upcoming" }
      : m,
  );

  // Keep any mirrored calendar task(s) in sync with this milestone's completion.
  await setMilestoneCalendarTasks(admin, user.id, id, action === "complete");

  // Rebuild the deterministic context (grade / deadlines may have shifted since
  // generation) and adapt — preserving completed work, no AI.
  const loaded = await loadFullProfile(admin, user.id);
  const now = new Date();
  let nextSaved = updated;
  let nextStepId: string | null = null;
  if (loaded) {
    const { count } = await admin
      .from("user_colleges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const ctx = buildRoadmapContext(loaded.profile, {
      now,
      targetCollegeCount: count ?? 0,
    });
    const adapted = adaptRoadmap(updated, ctx);
    nextSaved = adapted.milestones;
    nextStepId = adapted.nextStepId;

    await admin
      .from("roadmaps")
      .update({
        milestones: nextSaved,
        next_step_id: nextStepId,
        updated_at: now.toISOString(),
      })
      .eq("user_id", user.id);

    const { milestones, nextStepId: derivedNext } = deriveRoadmap(
      nextSaved,
      ctx,
    );
    return Response.json({
      success: true,
      milestones,
      nextStepId: derivedNext,
      progress: roadmapProgress(milestones),
    });
  }

  // Profile vanished (shouldn't happen) — persist the state change only.
  await admin
    .from("roadmaps")
    .update({ milestones: nextSaved, updated_at: now.toISOString() })
    .eq("user_id", user.id);
  return Response.json({ success: true, milestones: nextSaved, nextStepId });
}
