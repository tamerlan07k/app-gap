import Link from "next/link";
import type { Analysis } from "~/lib/ai/schema";
import { cn } from "~/lib/utils";

const PRIORITY_BADGE = {
  high: "bg-brand-teal/10 text-brand-teal",
  medium: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
} as const;

const DIFFICULTY_LABEL = {
  easy: "Easier",
  medium: "Moderate",
  hard: "Challenging",
} as const;

const DIFFICULTY_COLOR = {
  easy: "text-emerald-600 dark:text-emerald-400",
  medium: "text-amber-600 dark:text-amber-400",
  hard: "text-red-600 dark:text-red-400",
} as const;

export function RoadmapPreviewCard({
  roadmap,
  analysisId,
  showAll = false,
}: {
  roadmap: Analysis["roadmap"];
  analysisId?: string;
  showAll?: boolean;
}) {
  const preview = showAll ? roadmap : roadmap.slice(0, 4);
  const remaining = showAll ? 0 : roadmap.length - preview.length;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Your Roadmap
        </p>
        <span className="text-xs text-muted-foreground">
          {roadmap.length} items
        </span>
      </div>
      <div className="divide-y divide-border">
        {preview.map((item, i) => (
          <div key={item.title} className="flex gap-4 px-6 py-4">
            <div
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                PRIORITY_BADGE[item.priority],
              )}
            >
              {i + 1}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {item.explanation}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>
                  <span className="font-medium">Impact:</span>{" "}
                  {item.expectedImpact}
                </span>
                <span aria-hidden>·</span>
                <span
                  className={cn(
                    "font-medium",
                    DIFFICULTY_COLOR[item.estimatedDifficulty],
                  )}
                >
                  {DIFFICULTY_LABEL[item.estimatedDifficulty]}
                </span>
                <span aria-hidden>·</span>
                <span>{item.suggestedTimeline}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <div className="border-t border-border bg-muted/30 px-6 py-3">
          {analysisId ? (
            <Link
              href={`/dashboard/roadmap/${analysisId}`}
              className="text-xs font-medium text-brand-teal underline-offset-4 hover:underline"
            >
              View all {roadmap.length} roadmap items →
            </Link>
          ) : (
            <p className="text-xs text-muted-foreground">
              + {remaining} more item{remaining !== 1 ? "s" : ""} in your
              complete roadmap
            </p>
          )}
        </div>
      )}
    </div>
  );
}
