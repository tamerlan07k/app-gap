"use client";

import type {
  RedundancyAnalysis,
  RedundancySource,
} from "~/lib/supplemental/schemas";
import { cn } from "~/lib/utils";

// Application-level redundancy / value-add. Diagnostic only — it never changes
// the essay's score; it flags overlap with the rest of the application and
// whether the essay adds a genuinely new dimension.

const SOURCE_LABELS: Record<RedundancySource, string> = {
  personal_statement: "Personal Statement",
  activities: "Activities",
  additional_info: "Additional Information",
  other_supplement: "Another supplement",
};

const REPETITION_META: Record<
  RedundancyAnalysis["repetition"],
  { label: string; cls: string }
> = {
  distinct: {
    label: "Adds something new",
    cls: "text-brand-teal bg-brand-teal/10",
  },
  some_overlap: {
    label: "Some overlap",
    cls: "text-amber-600 dark:text-amber-400 bg-amber-500/10",
  },
  repetitive: {
    label: "Repetitive",
    cls: "text-red-600 dark:text-red-400 bg-red-500/10",
  },
};

const SEVERITY_CLS: Record<"minor" | "notable" | "heavy", string> = {
  minor: "text-muted-foreground",
  notable: "text-amber-600 dark:text-amber-400",
  heavy: "text-red-600 dark:text-red-400",
};

export function RedundancyPanel({
  analysis,
}: {
  analysis: RedundancyAnalysis;
}) {
  const rep = REPETITION_META[analysis.repetition];
  return (
    <div>
      <span
        className={cn(
          "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium",
          rep.cls,
        )}
      >
        {rep.label}
      </span>

      <p className="mt-3 text-sm text-muted-foreground">{analysis.overview}</p>

      <div className="mt-3 rounded-lg bg-muted/50 px-3 py-2">
        <p className="text-sm">
          <span className="font-medium">
            {analysis.newDimension
              ? "Reveals a new dimension: "
              : "New dimension: "}
          </span>
          <span className="text-muted-foreground">{analysis.valueAdd}</span>
        </p>
      </div>

      {analysis.overlaps.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">Where it overlaps</p>
          <ul className="mt-2 space-y-1.5">
            {analysis.overlaps.map((o, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: overlaps are positional
              <li key={i} className="text-sm">
                <span className="font-medium">{SOURCE_LABELS[o.source]}</span>
                <span
                  className={cn("ml-1.5 text-xs", SEVERITY_CLS[o.severity])}
                >
                  ({o.severity})
                </span>
                <p className="text-muted-foreground">{o.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.suggestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">To add something new</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {analysis.suggestions.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
