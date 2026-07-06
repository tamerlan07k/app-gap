import type { Analysis } from "~/lib/ai/schema";
import { cn } from "~/lib/utils";

const SEVERITY_CONFIG = {
  high: {
    label: "High Priority",
    badge: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  },
  medium: {
    label: "Medium",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  low: {
    label: "Lower Priority",
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
  },
} as const;

export function TopGapsCard({ gaps }: { gaps: Analysis["topGaps"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Key Gaps
        </p>
      </div>
      <div className="divide-y divide-border">
        {gaps.map((gap) => {
          const cfg = SEVERITY_CONFIG[gap.severity];
          return (
            <div key={gap.gap} className="px-6 py-4">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">{gap.gap}</p>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
                    cfg.badge,
                  )}
                >
                  {cfg.label}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {gap.explanation}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
