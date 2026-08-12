import {
  ArrowRight,
  CalendarClock,
  FileText,
  GraduationCap,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { Deadline } from "~/lib/deadlines";
import type { UserEvent } from "~/lib/events";

function CardHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
        {title}
      </p>
    </div>
  );
}

function formatRelativeDate(iso: string): string {
  const then = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfThen = new Date(
    then.getFullYear(),
    then.getMonth(),
    then.getDate(),
  );
  const diffDays = Math.round(
    (startOfToday.getTime() - startOfThen.getTime()) / 86_400_000,
  );
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ─── My Progress ─────────────────────────────────────────────────────────────

export function EssaysCard({ count }: { count: number }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
          <FileText className="size-5 text-brand-teal" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-sm font-medium">Essays</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {count === 1 ? "1 completed" : `${count} completed`}
          </p>
        </div>
      </div>
    </div>
  );
}

export function MyCollegesCard({ count }: { count: number }) {
  return (
    <Link
      href="/dashboard/colleges"
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
    >
      <div className="flex items-start gap-4 p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
          <GraduationCap className="size-5 text-brand-teal" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-sm font-medium">My Colleges</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {count === 0
              ? "Build a balanced, matched list"
              : `${count} saved ${count === 1 ? "college" : "colleges"}`}
          </p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-brand-teal transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}

// ─── Next Deadline (grade-aware) ─────────────────────────────────────────────

export function NextDeadlineCard({ deadline }: { deadline: Deadline }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader title="Next Deadline" />
      <div className="p-6">
        <div className="flex items-center gap-2 text-brand-teal">
          <CalendarClock className="size-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            {deadline.timeframe}
          </span>
        </div>
        <p className="mt-2 font-semibold">{deadline.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {deadline.description}
        </p>
      </div>
    </div>
  );
}

// ─── Jump In (latest activity) ───────────────────────────────────────────────

export function JumpInCard({
  event,
  analysisId,
}: {
  event: UserEvent | null;
  analysisId: string | null;
}) {
  const href = analysisId
    ? `/dashboard/roadmap/${analysisId}`
    : "/dashboard/roadmaps";
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <CardHeader title="Jump In" />
      <div className="p-6">
        {event ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Latest activity
            </p>
            <div className="mt-2 flex items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
                <Sparkles className="size-4 text-brand-teal" />
              </div>
              <div>
                <p className="text-sm font-medium">{event.title}</p>
                <p className="text-xs text-muted-foreground">
                  {formatRelativeDate(event.createdAt)}
                </p>
              </div>
            </div>
            <Link
              href={href}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-teal underline-offset-4 hover:underline"
            >
              Pick up where you left off
              <ArrowRight className="size-3.5" />
            </Link>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your recent AppGap activity will show up here.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── My Analysis reference ───────────────────────────────────────────────────

export function MyAnalysisCard({
  analysisId,
  date,
  score,
}: {
  analysisId: string;
  date: string;
  score: number;
}) {
  return (
    <Link
      href={`/dashboard/roadmap/${analysisId}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
    >
      <CardHeader title="My Analysis" />
      <div className="flex items-center gap-4 p-6">
        <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
          <span className="text-lg font-bold tabular-nums text-brand-teal">
            {score}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Your saved analysis</p>
          <p className="text-xs text-muted-foreground">Snapshot from {date}</p>
        </div>
        <ArrowRight className="size-4 shrink-0 text-brand-teal transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
