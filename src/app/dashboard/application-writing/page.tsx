import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  CircleCheck,
  FileText,
  PenLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { applicationWritingHref } from "~/lib/application-writing-sections";
import { createClient } from "~/lib/supabase/server";
import type { EssayStatus } from "~/lib/supplemental/status";
import { cn } from "~/lib/utils";

// The Application Writing landing. Rather than dropping the student straight into
// a sub-tab (or a blank page), this summarizes where each piece of their
// application writing stands and links into it.

type PsStatus = "not_started" | "in_progress" | "finalized";

const PS_STATUS: Record<PsStatus, { label: string; classes: string }> = {
  not_started: {
    label: "Not started",
    classes: "bg-muted text-muted-foreground",
  },
  in_progress: {
    label: "In progress",
    classes: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  finalized: {
    label: "Finalized",
    classes: "bg-brand-teal/10 text-brand-teal",
  },
};

function StatusPill({ label, classes }: { label: string; classes: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
        classes,
      )}
    >
      {label}
    </span>
  );
}

function SectionCard({
  icon: Icon,
  title,
  href,
  children,
}: {
  icon: LucideIcon;
  title: string;
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-brand-teal/40 hover:shadow-md"
    >
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
        <Icon className="size-5 text-brand-teal" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold">{title}</p>
          <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand-teal" />
        </div>
        <div className="mt-2">{children}</div>
      </div>
    </Link>
  );
}

/** A small labeled count used in the Supplemental Essays summary. */
function CountStat({ n, label }: { n: number; label: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-sm font-bold tabular-nums">{n}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </span>
  );
}

export default async function ApplicationWritingOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [psRes, essaysRes, writingRes] = await Promise.all([
    supabase
      .from("personal_statements")
      .select("finalized_at")
      .eq("user_id", user.id),
    supabase
      .from("supplemental_essays")
      .select("status")
      .eq("user_id", user.id),
    supabase
      .from("writing_analyses")
      .select("updated_at, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Personal Statement: finalized if any statement is frozen; in progress if the
  // student has started one; otherwise not started.
  const statements = (psRes.data ?? []) as { finalized_at: string | null }[];
  const psStatus: PsStatus = statements.some((s) => s.finalized_at)
    ? "finalized"
    : statements.length > 0
      ? "in_progress"
      : "not_started";

  // Supplemental Essays: tally by status.
  const essays = (essaysRes.data ?? []) as { status: EssayStatus | null }[];
  const tally = { finalized: 0, inProgress: 0, notStarted: 0 };
  for (const e of essays) {
    const s = e.status ?? "not_started";
    if (s === "finalized") tally.finalized += 1;
    else if (s === "drafting" || s === "needs_revision") tally.inProgress += 1;
    else tally.notStarted += 1;
  }
  const totalEssays = essays.length;

  // Activity & Additional Info: whether a writing analysis has been run.
  const writingRow = writingRes.data as {
    updated_at: string | null;
    created_at: string;
  } | null;
  const reviewedAt = writingRow
    ? (writingRow.updated_at ?? writingRow.created_at)
    : null;
  const reviewedDate = reviewedAt
    ? new Date(reviewedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-muted-foreground">
          Everything you write for your application in one place. Pick up where
          you left off.
        </p>
      </div>

      <div className="grid gap-4">
        <SectionCard
          icon={FileText}
          title="Personal Statement"
          href={applicationWritingHref("personal-statement")}
        >
          <StatusPill
            label={PS_STATUS[psStatus].label}
            classes={PS_STATUS[psStatus].classes}
          />
        </SectionCard>

        <SectionCard
          icon={PenLine}
          title="Supplemental Essays"
          href={applicationWritingHref("supplemental-essays")}
        >
          {totalEssays === 0 ? (
            <p className="text-sm text-muted-foreground">No essays yet</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <CountStat n={tally.finalized} label="finalized" />
              <CountStat n={tally.inProgress} label="in progress" />
              <CountStat n={tally.notStarted} label="not started" />
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={Sparkles}
          title="Activity & Additional Info"
          href={applicationWritingHref("activity-additional-info")}
        >
          {reviewedDate ? (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal">
              <CircleCheck className="size-3.5" />
              Reviewed {reviewedDate}
            </span>
          ) : (
            <StatusPill
              label="Not reviewed yet"
              classes="bg-muted text-muted-foreground"
            />
          )}
        </SectionCard>
      </div>
    </section>
  );
}
