import type { TierKey } from "~/lib/ai/config";
import { buildSchedule } from "~/lib/calendar/schedule";
import {
  type EntitlementProfile,
  reconcileExpiredOverride,
  resolveEntitlement,
} from "~/lib/entitlement";
import { checkFeatureAllowance, recordFeatureUsage } from "~/lib/feature-usage";
import { loadFullProfile } from "~/lib/profile-full";
import { reserveGeneration } from "~/lib/reserve";
import { buildRoadmapContext } from "~/lib/roadmap/context";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Personalized Application Calendar — one DETERMINISTIC generation per account
// (free + Pro), plus a "confirm" action. No AI, so there is no model cost; the
// calendarGeneration ledger only enforces the single-generation rule. Routine
// edits (mark done / reschedule) go through /api/calendar/task and never consume
// the allowance.

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { action?: unknown };
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    body = {};
  }

  const admin = createAdminClient();
  const now = new Date();

  // ─── Confirm the reviewed schedule ─────────────────────────────────────────
  if (body.action === "confirm") {
    const { data: cal } = await admin
      .from("calendars")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!cal || (cal as { status: string }).status !== "ready") {
      return Response.json(
        { error: "Generate your calendar before confirming it." },
        { status: 400 },
      );
    }
    const { error } = await admin
      .from("calendars")
      .update({ confirmed: true, updated_at: now.toISOString() })
      .eq("user_id", user.id);
    if (error) {
      return Response.json(
        { error: "Couldn't confirm your calendar. Please try again." },
        { status: 500 },
      );
    }
    return Response.json({ success: true, confirmed: true });
  }

  // ─── Generate (lifetime-once) ──────────────────────────────────────────────
  const loaded = await loadFullProfile(admin, user.id);
  if (!loaded) {
    return Response.json(
      { error: "Complete your profile before building a calendar." },
      { status: 400 },
    );
  }
  const { profileRow, profile } = loaded;

  await reconcileExpiredOverride(admin, profileRow as EntitlementProfile);
  const entitlement = resolveEntitlement(
    profileRow as EntitlementProfile,
    now,
    user.email,
  );
  const tier: TierKey = entitlement.tier;

  // If a ready calendar already exists, return it (never a second generation).
  const { data: existing } = await admin
    .from("calendars")
    .select("status")
    .eq("user_id", user.id)
    .maybeSingle();
  if ((existing as { status: string } | null)?.status === "ready") {
    return respondWithCalendar(admin, user.id);
  }

  let allowance: Awaited<ReturnType<typeof checkFeatureAllowance>>;
  try {
    allowance = await checkFeatureAllowance(
      admin,
      user.id,
      "calendarGeneration",
      tier,
      now,
      entitlement.unlimited,
    );
  } catch (err) {
    console.error(
      "[API] calendar allowance check failed:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't verify your plan. Please try again." },
      { status: 503 },
    );
  }
  if (!allowance.enabled) {
    return Response.json(
      { error: "Calendar generation isn't available on your plan." },
      { status: 403 },
    );
  }
  if (!allowance.allowed) {
    // Used the lifetime generation but no ready calendar? Return whatever exists.
    return respondWithCalendar(admin, user.id);
  }

  let outcome: Awaited<ReturnType<typeof reserveGeneration>>;
  try {
    outcome = await reserveGeneration(admin, {
      table: "calendars",
      userId: user.id,
      now,
      extraInsert: { tier, confirmed: false, provisional: false },
    });
  } catch (err) {
    console.error(
      "[API] calendar reserve failed:",
      err instanceof Error ? err.message : String(err),
    );
    return Response.json(
      { error: "Couldn't start calendar generation. Please try again." },
      { status: 503 },
    );
  }

  if (outcome === "exists") {
    return respondWithCalendar(admin, user.id);
  }

  try {
    const { count } = await admin
      .from("user_colleges")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    const ctx = buildRoadmapContext(profile, {
      now,
      targetCollegeCount: count ?? 0,
    });
    const schedule = buildSchedule(ctx, now);

    // Replace any prior tasks for this user (single-generation, so this only runs
    // once per account, but stays idempotent on a recovered reservation).
    await admin.from("calendar_tasks").delete().eq("user_id", user.id);
    if (schedule.tasks.length > 0) {
      const rows = schedule.tasks.map((t) => ({
        user_id: user.id,
        title: t.title,
        description: t.description,
        branch: t.branch,
        milestone_id: t.milestoneId,
        href: t.href,
        due_date: t.dueDate,
        status: t.status,
        deadline_sensitive: t.deadlineSensitive,
        is_provisional: t.isProvisional,
        sort_order: t.sortOrder,
      }));
      const { error: insertError } = await admin
        .from("calendar_tasks")
        .insert(rows);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    await admin
      .from("calendars")
      .update({
        status: "ready",
        provisional: schedule.provisional,
        horizon_start: schedule.horizonStart,
        horizon_end: schedule.horizonEnd,
        deadline_label: schedule.deadlineLabel,
        generated_at: now.toISOString(),
        updated_at: now.toISOString(),
        error: null,
      })
      .eq("user_id", user.id);

    if (!entitlement.unlimited) {
      await recordFeatureUsage(admin, user.id, "calendarGeneration", tier);
    }

    return respondWithCalendar(admin, user.id);
  } catch (err) {
    console.error(
      "[API] calendar generation error:",
      err instanceof Error ? err.message : String(err),
    );
    await admin
      .from("calendars")
      .update({
        status: "failed",
        error: err instanceof Error ? err.message : String(err),
        updated_at: now.toISOString(),
      })
      .eq("user_id", user.id);
    return Response.json(
      {
        error:
          "Couldn't build your calendar just now. Please try again — this didn't use your generation.",
      },
      { status: 500 },
    );
  }
}

/** Shared success response: the calendar row + its tasks (with ids). */
async function respondWithCalendar(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<Response> {
  const [calRes, tasksRes] = await Promise.all([
    admin
      .from("calendars")
      .select(
        "status, confirmed, provisional, horizon_start, horizon_end, deadline_label",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("calendar_tasks")
      .select("*")
      .eq("user_id", userId)
      .order("due_date", { ascending: true }),
  ]);
  const cal = calRes.data as {
    status: string;
    confirmed: boolean;
    provisional: boolean;
    horizon_start: string | null;
    horizon_end: string | null;
    deadline_label: string | null;
  } | null;
  return Response.json({
    success: true,
    status: cal?.status ?? "ready",
    confirmed: cal?.confirmed ?? false,
    provisional: cal?.provisional ?? false,
    horizonStart: cal?.horizon_start ?? null,
    horizonEnd: cal?.horizon_end ?? null,
    deadlineLabel: cal?.deadline_label ?? null,
    tasks: tasksRes.data ?? [],
  });
}
