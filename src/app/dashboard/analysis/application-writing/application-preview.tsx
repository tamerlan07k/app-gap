"use client";

import { Info, Palette, TriangleAlert } from "lucide-react";
import { cn } from "~/lib/utils";
import {
  ACTIVITY_CHAR_LIMIT,
  activityObjectiveIssues,
  additionalInfoObjectiveIssues,
  countChars,
  countWords,
  formatConsistency,
  formatStyleLabel,
} from "~/lib/writing/checks";

type PreviewActivity = { name: string; description: string };

export function ApplicationPreview({
  activities,
  additionalInfo,
}: {
  activities: PreviewActivity[];
  additionalInfo: string;
}) {
  // Objective issues across everything (things a reader would call mistakes).
  const objective: string[] = [];
  for (const a of activities) {
    for (const issue of activityObjectiveIssues(a.description)) {
      objective.push(`${a.name}: ${issue.message}`);
    }
  }
  if (additionalInfo.trim()) {
    for (const issue of additionalInfoObjectiveIssues(additionalInfo)) {
      objective.push(`Additional Information: ${issue.message}`);
    }
  }

  // Style suggestions (never presented as errors).
  const style: string[] = [];
  const { mixed, styles } = formatConsistency(
    activities.map((a) => a.description),
  );
  if (mixed) {
    style.push(
      `Your activity descriptions mix formatting styles (${styles
        .map(formatStyleLabel)
        .join(
          ", ",
        )}). None is wrong, but a consistent structure reads as more polished.`,
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Application Preview
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* Approximation disclaimer — this is not the live Common App */}
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>
            An approximate preview of how your writing reads together — not an
            exact reproduction of the live Common App.
          </span>
        </div>

        {/* The writing, rendered together */}
        <div className="space-y-4">
          {activities.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Activities
              </p>
              {activities.map((a) => {
                const chars = countChars(a.description);
                const over = chars > ACTIVITY_CHAR_LIMIT;
                return (
                  <div key={a.name} className="space-y-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium">{a.name}</p>
                      <span
                        className={cn(
                          "shrink-0 text-xs tabular-nums",
                          over
                            ? "text-red-500 dark:text-red-400"
                            : "text-muted-foreground",
                        )}
                      >
                        {chars} / {ACTIVITY_CHAR_LIMIT}
                      </span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {a.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {additionalInfo.trim() && (
            <div className="space-y-1 border-t border-border pt-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Additional Information
                </p>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {countWords(additionalInfo)} words
                </span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {additionalInfo}
              </p>
            </div>
          )}
        </div>

        {/* Objective issues vs style suggestions — kept clearly distinct */}
        {(objective.length > 0 || style.length > 0) && (
          <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <TriangleAlert className="size-3.5 text-red-500" />
                Objective issues
              </p>
              {objective.length > 0 ? (
                <ul className="space-y-1">
                  {objective.map((msg) => (
                    <li
                      key={msg}
                      className="text-xs leading-relaxed text-red-600 dark:text-red-400"
                    >
                      {msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No objective issues found.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Palette className="size-3.5 text-amber-500" />
                Style suggestions
              </p>
              {style.length > 0 ? (
                <ul className="space-y-1">
                  {style.map((msg) => (
                    <li
                      key={msg}
                      className="text-xs leading-relaxed text-muted-foreground"
                    >
                      {msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  No style suggestions.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
