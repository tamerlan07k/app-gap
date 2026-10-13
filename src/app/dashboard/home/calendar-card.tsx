import { CalendarDays, Check, ChevronRight } from "lucide-react";
import Link from "next/link";

// Small Dashboard calendar widget — shows today's date and the tasks due today,
// and links to the Calendar tab. Presentational; the page supplies today's tasks.

export type TodayTask = { id: string; title: string; status: "todo" | "done" };

export function CalendarCard({
  tasks,
  hasCalendar,
}: {
  tasks: TodayTask[];
  hasCalendar: boolean;
}) {
  const now = new Date();
  const weekday = now.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "America/New_York",
  });
  const monthDay = now.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
  const remaining = tasks.filter((t) => t.status === "todo");

  return (
    <Link
      href="/dashboard/calendar"
      className="group block rounded-2xl border border-border bg-card shadow-sm outline-none transition hover:border-blue-500/40 focus-visible:ring-2 focus-visible:ring-blue-500/40"
    >
      <div className="flex items-center gap-3 border-b border-blue-500/15 bg-blue-500/[0.04] px-5 py-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10">
          <CalendarDays className="size-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{weekday}</p>
          <p className="text-xs text-muted-foreground">{monthDay}</p>
        </div>
        <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
      </div>

      <div className="px-5 py-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Today's tasks
        </p>
        {!hasCalendar ? (
          <p className="text-sm text-muted-foreground">
            Build your application calendar in My Roadmap to see today's plan.
          </p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nothing scheduled for today.
          </p>
        ) : remaining.length === 0 ? (
          <p className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
            <Check className="size-4" />
            All done for today.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {tasks.slice(0, 3).map((t) => (
              <li key={t.id} className="flex items-center gap-2 text-sm">
                <span
                  className={
                    t.status === "done"
                      ? "size-1.5 shrink-0 rounded-full bg-muted-foreground/40"
                      : "size-1.5 shrink-0 rounded-full bg-blue-500"
                  }
                  aria-hidden
                />
                <span
                  className={
                    t.status === "done"
                      ? "truncate text-muted-foreground line-through"
                      : "truncate"
                  }
                >
                  {t.title}
                </span>
              </li>
            ))}
            {tasks.length > 3 && (
              <li className="text-xs text-muted-foreground">
                +{tasks.length - 3} more
              </li>
            )}
          </ul>
        )}
      </div>
    </Link>
  );
}
