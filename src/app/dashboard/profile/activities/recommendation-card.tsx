"use client";

import { Clock, Hammer, Sparkles, TrendingUp } from "lucide-react";
import { ALIGNMENT_META, DIFFICULTY_META } from "~/lib/activities/labels";
import type { Recommendation } from "~/lib/ai/activities-schema";
import { cn } from "~/lib/utils";

function Badge({ label, badge }: { label: string; badge: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        badge,
      )}
    >
      {label}
    </span>
  );
}

// A recommended activity ARCHETYPE. These are AI-generated ideas, never verified
// listings — so they deliberately never carry an application link (the schema
// has no url field). Verified, linkable opportunities render via
// VerifiedOpportunityCard instead.
export function RecommendationCard({ rec }: { rec: Recommendation }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="font-medium leading-snug">{rec.title}</p>
          {rec.selfStartable && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
              <Hammer className="size-3" />
              Self-startable
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge
            label={ALIGNMENT_META[rec.majorAlignment].label}
            badge={ALIGNMENT_META[rec.majorAlignment].badge}
          />
          <Badge
            label={DIFFICULTY_META[rec.difficulty].label}
            badge={DIFFICULTY_META[rec.difficulty].badge}
          />
          {rec.isOngoing && (
            <Badge label="Ongoing" badge="bg-muted text-muted-foreground" />
          )}
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        {rec.whyItFits}
      </p>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3" />
          {rec.timeCommitment}
        </span>
        <span>· {rec.duration}</span>
      </div>

      <div className="space-y-2 border-t border-border pt-3 text-xs leading-relaxed">
        <p className="flex items-start gap-1.5">
          <TrendingUp className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
          <span>
            <span className="font-semibold">Where it can grow: </span>
            {rec.growth}
          </span>
        </p>
        <p className="flex items-start gap-1.5">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
          <span>
            <span className="font-semibold">For applications: </span>
            {rec.applicationUsefulness}
          </span>
        </p>
        {rec.prerequisites && (
          <p className="text-muted-foreground">
            <span className="font-semibold text-foreground">
              Helpful to have:{" "}
            </span>
            {rec.prerequisites}
          </p>
        )}
      </div>
    </div>
  );
}
