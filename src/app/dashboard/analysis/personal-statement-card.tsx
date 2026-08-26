import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { PersonalStatementDiagnostic } from "~/lib/ai/schema";
import { scoreBand, scoreColor } from "~/lib/personal-statement/scoring";
import { cn } from "~/lib/utils";

// A small, visually-secondary Personal Statement block on the analysis page — a
// rough onboarding signal only. The full coaching experience lives in the
// dedicated Personal Statement section (linked below).
export function PersonalStatementCard({
  diagnostic,
}: {
  diagnostic: PersonalStatementDiagnostic;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Personal Statement
        </p>
      </div>
      <div className="space-y-4 p-6">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-3xl font-bold tabular-nums leading-none",
              scoreColor(diagnostic.score),
            )}
          >
            {diagnostic.score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          <span
            className={cn(
              "ml-1 text-sm font-semibold",
              scoreColor(diagnostic.score),
            )}
          >
            {scoreBand(diagnostic.score)}
          </span>
        </div>

        <div className="space-y-2">
          <p className="flex items-start gap-2 text-sm">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
            <span className="leading-relaxed">{diagnostic.strength}</span>
          </p>
          <p className="flex items-start gap-2 text-sm">
            <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-amber-500" />
            <span className="leading-relaxed text-muted-foreground">
              {diagnostic.opportunity}
            </span>
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          A quick read to give your score a signal — not full feedback. For
          brainstorming, line-by-line coaching, and revision,{" "}
          <Link
            href="/dashboard/profile/personal-statement"
            className="inline-flex items-center gap-0.5 font-medium text-brand-teal underline-offset-4 hover:underline"
          >
            open the Personal Statement coach
            <ArrowRight className="size-3" />
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
