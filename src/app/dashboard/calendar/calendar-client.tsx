"use client";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleCheck,
  Info,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { BRANCH_META } from "~/app/dashboard/workspace/roadmap-graph";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

export type CalendarTaskRow = {
  id: string;
  title: string;
  description: string;
  branch: string | null;
  milestone_id: string | null;
  href: string | null;
  due_date: string; // YYYY-MM-DD
  status: "todo" | "done";
  deadline_sensitive: boolean;
  is_provisional: boolean;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const pad = (n: number) => String(n).padStart(2, "0");
const localISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function branchColor(branch: string | null): string {
  if (branch && branch in BRANCH_META) {
    return BRANCH_META[branch as keyof typeof BRANCH_META].cssVar;
  }
  if (branch === "deadline") return "oklch(0.62 0.2 25)"; // warm red for hard deadlines
  return "var(--color-brand-teal)";
}

export function CalendarClient({
  tasks: initialTasks,
  provisional,
  deadlineLabel,
  todayISO,
}: {
  tasks: CalendarTaskRow[];
  provisional: boolean;
  deadlineLabel: string | null;
  /** Today's date in ET (YYYY-MM-DD), resolved on the server for accuracy. */
  todayISO: string;
}) {
  const [tasks, setTasks] = useState<CalendarTaskRow[]>(initialTasks);
  const todayDate = useMemo(() => parseISO(todayISO), [todayISO]);
  const [selectedISO, setSelectedISO] = useState<string>(todayISO);
  const [viewYear, setViewYear] = useState(todayDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(todayDate.getMonth());
  const [savingId, setSavingId] = useState<string | null>(null);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, CalendarTaskRow[]>();
    for (const t of tasks) {
      const list = map.get(t.due_date) ?? [];
      list.push(t);
      map.set(t.due_date, list);
    }
    return map;
  }, [tasks]);

  const upcoming = useMemo(
    () =>
      tasks
        .filter((t) => t.status === "todo" && t.due_date >= todayISO)
        .sort((a, b) => a.due_date.localeCompare(b.due_date))
        .slice(0, 6),
    [tasks, todayISO],
  );

  async function toggleTask(task: CalendarTaskRow) {
    const done = task.status !== "done";
    setSavingId(task.id);
    // Optimistic update.
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id ? { ...t, status: done ? "done" : "todo" } : t,
      ),
    );
    try {
      const res = await fetch("/api/calendar/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: task.id,
          action: done ? "complete" : "reopen",
        }),
      });
      if (!res.ok) {
        // Revert on failure.
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: done ? "todo" : "done" } : t,
          ),
        );
      }
    } finally {
      setSavingId(null);
    }
  }

  async function reschedule(task: CalendarTaskRow, dueDate: string) {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, due_date: dueDate } : t)),
    );
    await fetch("/api/calendar/task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: task.id, action: "reschedule", dueDate }),
    });
  }

  // Build a full 6-week grid starting on the Sunday on/before the 1st. Each cell
  // carries its own ISO date (used as a stable key); cells outside the current
  // month render as inert spacers.
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const gridStart = new Date(viewYear, viewMonth, 1 - firstOfMonth.getDay());
  const cells: { iso: string; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    cells.push({ iso: localISO(d), inMonth: d.getMonth() === viewMonth });
  }

  function shiftMonth(delta: number) {
    const m = viewMonth + delta;
    const y = viewYear + Math.floor(m / 12);
    const nm = ((m % 12) + 12) % 12;
    setViewYear(y);
    setViewMonth(nm);
  }

  const selectedTasks = tasksByDate.get(selectedISO) ?? [];
  const selectedLabel =
    selectedISO === todayISO
      ? "Today"
      : parseISO(selectedISO).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your application schedule
          {deadlineLabel ? ` — anchored to ${deadlineLabel}` : ""}.
        </p>
      </div>

      {provisional && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>
            This schedule is grade-based guidance — you don't have fixed
            application deadlines yet, so dates are approximate.
          </span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Month grid */}
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setViewYear(todayDate.getFullYear());
                  setViewMonth(todayDate.getMonth());
                  setSelectedISO(todayISO);
                }}
              >
                Today
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Previous month"
                onClick={() => shiftMonth(-1)}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Next month"
                onClick={() => shiftMonth(1)}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div
                key={w}
                className="pb-1 text-[11px] font-medium text-muted-foreground"
              >
                {w}
              </div>
            ))}
            {cells.map(({ iso, inMonth }) => {
              if (!inMonth)
                return <div key={iso} aria-hidden className="h-12" />;
              const dayTasks = tasksByDate.get(iso) ?? [];
              const hasTodo = dayTasks.some((t) => t.status === "todo");
              const isToday = iso === todayISO;
              const isSelected = iso === selectedISO;
              const dayNum = parseISO(iso).getDate();
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelectedISO(iso)}
                  aria-label={`${parseISO(iso).toLocaleDateString("en-US", { month: "long", day: "numeric" })}${dayTasks.length ? `, ${dayTasks.length} task${dayTasks.length > 1 ? "s" : ""}` : ""}${isToday ? ", today" : ""}`}
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "flex h-12 flex-col items-center justify-center rounded-lg text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected
                      ? "bg-blue-600 font-semibold text-white"
                      : isToday
                        ? "bg-blue-500/10 font-semibold text-blue-700 ring-1 ring-blue-500 dark:text-blue-300"
                        : "hover:bg-muted",
                  )}
                >
                  <span>{dayNum}</span>
                  {dayTasks.length > 0 && (
                    <span
                      className={cn(
                        "mt-0.5 h-1.5 w-1.5 rounded-full",
                        isSelected
                          ? "bg-white"
                          : hasTodo
                            ? "bg-blue-500"
                            : "bg-muted-foreground/40",
                      )}
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected-day + upcoming tasks */}
        <div className="space-y-4">
          <section>
            <h2 className="mb-2 text-sm font-semibold">{selectedLabel}</h2>
            {selectedTasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
                Nothing scheduled.
              </p>
            ) : (
              <ul className="space-y-2">
                {selectedTasks.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    saving={savingId === t.id}
                    onToggle={() => toggleTask(t)}
                    onReschedule={(d) => reschedule(t, d)}
                  />
                ))}
              </ul>
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-semibold">Upcoming</h2>
              <ul className="space-y-2">
                {upcoming.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    saving={savingId === t.id}
                    onToggle={() => toggleTask(t)}
                    onReschedule={(d) => reschedule(t, d)}
                    showDate
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  saving,
  onToggle,
  onReschedule,
  showDate = false,
}: {
  task: CalendarTaskRow;
  saving: boolean;
  onToggle: () => void;
  onReschedule: (dueDate: string) => void;
  showDate?: boolean;
}) {
  const done = task.status === "done";
  return (
    <li className="flex items-start gap-3 rounded-xl border border-border bg-card p-3">
      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        aria-label={done ? "Mark as not done" : "Mark complete"}
        aria-pressed={done}
        className="mt-0.5 shrink-0 text-muted-foreground transition-colors hover:text-blue-600"
      >
        {done ? (
          <CircleCheck className="size-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Circle className="size-5" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2 shrink-0 rounded-full"
            style={{ backgroundColor: branchColor(task.branch) }}
            aria-hidden
          />
          <p
            className={cn(
              "text-sm font-medium",
              done && "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {showDate && (
            <span className="tabular-nums">
              {parseISO(task.due_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          )}
          {task.deadline_sensitive && (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 font-medium text-amber-600 dark:text-amber-400">
              Time-sensitive
            </span>
          )}
          <label className="inline-flex items-center gap-1">
            <span className="sr-only">Reschedule</span>
            <input
              type="date"
              value={task.due_date}
              onChange={(e) => e.target.value && onReschedule(e.target.value)}
              className="rounded border border-input bg-transparent px-1 py-0.5 text-xs text-muted-foreground"
            />
          </label>
          {task.href && (
            <Link
              href={task.href}
              className="inline-flex items-center gap-0.5 font-medium text-blue-600 hover:underline dark:text-blue-400"
            >
              Open
              <ArrowRight className="size-3" />
            </Link>
          )}
        </div>
      </div>
    </li>
  );
}
