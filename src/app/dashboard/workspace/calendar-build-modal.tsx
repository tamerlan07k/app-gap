"use client";

import { CalendarDays, Check, Info, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { BRANCH_META } from "./roadmap-graph";

// Personalized Calendar — build (deterministic), review the proposed schedule,
// then confirm. Confirming completes the calendar foundation step. The full,
// editable calendar lives on the Calendar tab.

type TaskLite = {
  id: string;
  title: string;
  branch: string | null;
  due_date: string;
  deadline_sensitive: boolean;
};

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function branchColor(branch: string | null): string {
  if (branch && branch in BRANCH_META) {
    return BRANCH_META[branch as keyof typeof BRANCH_META].cssVar;
  }
  return "var(--color-brand-teal)";
}

export function CalendarBuildModal({
  initialTasks,
  initialConfirmed,
  initialProvisional,
  initialDeadlineLabel,
  onClose,
  onDone,
}: {
  initialTasks: TaskLite[] | null;
  initialConfirmed: boolean;
  initialProvisional: boolean;
  initialDeadlineLabel: string | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [tasks, setTasks] = useState<TaskLite[] | null>(initialTasks);
  const [provisional, setProvisional] = useState(initialProvisional);
  const [deadlineLabel, setDeadlineLabel] = useState(initialDeadlineLabel);
  const [confirmed, setConfirmed] = useState(initialConfirmed);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function build() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await res.json();
      if (res.ok && body.tasks) {
        setTasks(body.tasks as TaskLite[]);
        setProvisional(!!body.provisional);
        setDeadlineLabel(body.deadlineLabel ?? null);
      } else {
        setError(body.error ?? "Couldn't build your calendar.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/calendar/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "confirm" }),
      });
      if (res.ok) {
        setConfirmed(true);
        onDone();
      } else {
        const body = await res.json();
        setError(body.error ?? "Couldn't confirm your calendar.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Personalized Application Calendar"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-brand-teal" aria-hidden />
            <h2 className="text-lg font-semibold">
              Personalized Application Calendar
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {!tasks ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              We'll spread your application work across the time you actually
              have — anchored to your deadlines, with room for revisions, and no
              last-minute cram. You can adjust any date afterward.
            </p>
            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
            <div className="mt-6 flex justify-end">
              <Button onClick={build} disabled={loading}>
                {loading && <Loader2 className="animate-spin" />}
                Build my calendar
              </Button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              {deadlineLabel
                ? `Anchored to: ${deadlineLabel}. Review the plan, then confirm.`
                : "Review your proposed plan, then confirm."}
            </p>
            {provisional && (
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                <Info className="mt-0.5 size-3.5 shrink-0" />
                <span>
                  This is grade-based guidance — you don't have fixed
                  application deadlines yet, so dates are approximate and will
                  sharpen as your plans firm up.
                </span>
              </div>
            )}

            <ol className="mt-4 space-y-2">
              {tasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: branchColor(t.branch) }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate text-sm">
                    {t.title}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {fmtDate(t.due_date)}
                  </span>
                </li>
              ))}
            </ol>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" asChild>
                <Link href="/dashboard/calendar">Open full calendar</Link>
              </Button>
              {confirmed ? (
                <Button onClick={onClose}>
                  <Check />
                  Done
                </Button>
              ) : (
                <Button onClick={confirm} disabled={loading}>
                  {loading && <Loader2 className="animate-spin" />}
                  <Check />
                  Confirm schedule
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
