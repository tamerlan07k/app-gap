import {
  setMilestoneCalendarTasks,
  setRoadmapMilestoneState,
} from "~/lib/calendar/sync";
import { loadFullProfile } from "~/lib/profile-full";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Calendar task updates — mark complete/reopen or reschedule a single task. Never
// consumes a generation. When the task mirrors a roadmap milestone (milestone_id),
// completion is synced to the roadmap so the two never drift.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { id?: unknown; action?: unknown; dueDate?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  const id = typeof body.id === "string" ? body.id : null;
  if (!id) {
    return Response.json({ error: "Missing task id." }, { status: 400 });
  }
  const action =
    body.action === "reopen"
      ? "reopen"
      : body.action === "reschedule"
        ? "reschedule"
        : "complete";

  const admin = createAdminClient();
  const now = new Date();

  // Load the task (and confirm ownership).
  const { data: taskRow } = await admin
    .from("calendar_tasks")
    .select("id, milestone_id, due_date, status")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!taskRow) {
    return Response.json({ error: "Task not found." }, { status: 404 });
  }
  const task = taskRow as {
    id: string;
    milestone_id: string | null;
    due_date: string;
    status: string;
  };

  if (action === "reschedule") {
    const dueDate = typeof body.dueDate === "string" ? body.dueDate : null;
    if (!dueDate || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      return Response.json(
        { error: "A valid date (YYYY-MM-DD) is required." },
        { status: 400 },
      );
    }
    const { error } = await admin
      .from("calendar_tasks")
      .update({ due_date: dueDate, updated_at: now.toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      return Response.json(
        { error: "Couldn't reschedule the task." },
        { status: 500 },
      );
    }
    return Response.json({ success: true, id, dueDate });
  }

  // complete / reopen
  const done = action === "complete";
  const { error } = await admin
    .from("calendar_tasks")
    .update({
      status: done ? "done" : "todo",
      updated_at: now.toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return Response.json(
      { error: "Couldn't update the task." },
      { status: 500 },
    );
  }

  // Sync any OTHER calendar tasks for the same milestone + the roadmap milestone.
  let roadmapNextStepId: string | null = null;
  if (task.milestone_id) {
    await setMilestoneCalendarTasks(admin, user.id, task.milestone_id, done);
    const loaded = await loadFullProfile(admin, user.id);
    if (loaded) {
      const { count } = await admin
        .from("user_colleges")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      const ctx = buildRoadmapContext(loaded.profile, {
        now,
        targetCollegeCount: count ?? 0,
      });
      const synced = await setRoadmapMilestoneState(
        admin,
        user.id,
        task.milestone_id,
        done,
        ctx,
      );
      roadmapNextStepId = synced?.nextStepId ?? null;
    }
  }

  return Response.json({
    success: true,
    id,
    status: done ? "done" : "todo",
    roadmapNextStepId,
  });
}
