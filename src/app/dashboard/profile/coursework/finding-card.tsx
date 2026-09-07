import { BadgeCheck } from "lucide-react";
import {
  FINDING_STATUS_META,
  IMPORTANCE_LABELS,
} from "~/lib/coursework/labels";
import type { Finding } from "~/lib/coursework/types";
import { cn } from "~/lib/utils";

// One preparation-area finding, rendered from the DETERMINISTIC engine output.
// The status, detail, and "why this matters" all come from the engine (they
// stand on their own without the AI); `note` is the optional AI enrichment.
export function FindingCard({
  finding,
  note,
}: {
  finding: Finding;
  note?: string | null;
}) {
  const meta = FINDING_STATUS_META[finding.status];

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={cn("size-2 shrink-0 rounded-full", meta.dot)} />
          <p className="font-medium leading-snug">{finding.title}</p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
            meta.badge,
          )}
        >
          {meta.label}
        </span>
      </div>

      <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {IMPORTANCE_LABELS[finding.importance]}
      </p>

      <p className="text-sm leading-relaxed">{finding.detail}</p>

      <div className="rounded-lg border border-border bg-muted/20 p-3">
        <p className="text-xs font-semibold text-foreground">
          Why this matters
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {finding.whyItMatters}
        </p>
      </div>

      {finding.verifiedExpectation && (
        <div className="flex items-start gap-2 rounded-md border border-brand-teal/20 bg-brand-teal/[0.05] p-2.5">
          <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-brand-teal">
              Verified for your target:{" "}
            </span>
            {finding.verifiedExpectation.label} —{" "}
            {finding.verifiedExpectation.requirementType} (
            {finding.verifiedExpectation.scope})
          </p>
        </div>
      )}

      {note && (
        <div className="flex items-start gap-2 rounded-md border border-brand-teal/20 bg-brand-teal/[0.05] p-2.5">
          <p className="text-xs leading-relaxed">
            <span className="font-semibold text-brand-teal">
              AppGap's read:{" "}
            </span>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
