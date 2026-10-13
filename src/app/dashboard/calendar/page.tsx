import { ArrowRight, CalendarDays } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { todayISO } from "~/lib/date";
import { createClient } from "~/lib/supabase/server";
import { CalendarClient, type CalendarTaskRow } from "./calendar-client";

// Calendar tab — a month view of the student's confirmed application schedule.
// Tasks are the SAME data as the roadmap (shared calendar_tasks); completing a
// task here syncs back to the matching roadmap milestone.

export default async function CalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [calRes, tasksRes] = await Promise.all([
    supabase
      .from("calendars")
      .select("status, provisional, deadline_label, horizon_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("calendar_tasks")
      .select(
        "id, title, description, branch, milestone_id, href, due_date, status, deadline_sensitive, is_provisional",
      )
      .eq("user_id", user.id)
      .order("due_date", { ascending: true }),
  ]);

  const cal = calRes.data as {
    status: string;
    provisional: boolean;
    deadline_label: string | null;
    horizon_end: string | null;
  } | null;
  const tasks = (tasksRes.data ?? []) as CalendarTaskRow[];

  if (!cal || cal.status !== "ready" || tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your application schedule, spread across the time you have.
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/10">
            <CalendarDays className="size-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="max-w-md space-y-1.5">
            <p className="text-base font-semibold">No calendar yet</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Build your personalized application calendar from the foundation
              steps in My Roadmap — then it'll show up here, dated and ready.
            </p>
          </div>
          <Button asChild>
            <Link href="/dashboard/workspace">
              Go to My Roadmap
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CalendarClient
      tasks={tasks}
      provisional={cal.provisional}
      deadlineLabel={cal.deadline_label}
      todayISO={todayISO()}
    />
  );
}
