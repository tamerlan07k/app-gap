import type { Analysis } from "~/lib/ai/schema";
import { cn } from "~/lib/utils";

const PRIORITY_CONFIG = {
  high: {
    label: "High Priority",
    badge: "bg-brand-teal/10 text-brand-teal",
  },
  medium: {
    label: "Medium",
    badge:
      "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  },
  low: {
    label: "Optional",
    badge: "bg-muted text-muted-foreground",
  },
} as const;

export function NextStepsCard({ steps }: { steps: Analysis["nextSteps"] }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Recommended Next Steps
        </p>
      </div>
      <div className="divide-y divide-border">
        {steps.map((step, i) => {
          const cfg = PRIORITY_CONFIG[step.priority];
          return (
            <div key={step.step} className="flex gap-4 px-6 py-4">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-xs font-bold text-brand-teal">
                {i + 1}
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{step.step}</p>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      cfg.badge,
                    )}
                  >
                    {cfg.label}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {step.explanation}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Timeline:</span> {step.timeline}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
