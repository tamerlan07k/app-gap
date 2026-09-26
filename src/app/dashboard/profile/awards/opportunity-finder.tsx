"use client";

import { Compass } from "lucide-react";
import { useMemo, useState } from "react";
import { STATUS_META } from "~/lib/awards/labels";
import type { OpportunityFit, OpportunityStatus } from "~/lib/awards/types";
import { cn } from "~/lib/utils";
import { OpportunityCard } from "./opportunity-card";

const FILTERS: { key: "all" | OpportunityStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "good_fit", label: "Good fit" },
  { key: "time_sensitive", label: "Time-sensitive" },
  { key: "worth_exploring", label: "Worth exploring" },
  { key: "low_priority", label: "Lower priority" },
  { key: "not_enough_time", label: "Not enough time" },
];

// The deterministic Opportunity Finder. All ranking/status/filtering happened on
// the server (rankOpportunities); this only presents the result and lets the
// student filter by status. Opening this triggers NO AI.
export function OpportunityFinder({ fits }: { fits: OpportunityFit[] }) {
  const [filter, setFilter] = useState<"all" | OpportunityStatus>("all");

  const counts = useMemo(() => {
    const c = new Map<OpportunityStatus, number>();
    for (const f of fits) c.set(f.status, (c.get(f.status) ?? 0) + 1);
    return c;
  }, [fits]);

  const visible = useMemo(
    () => (filter === "all" ? fits : fits.filter((f) => f.status === filter)),
    [fits, filter],
  );

  if (fits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
          <Compass className="size-7 text-brand-teal" />
        </div>
        <div>
          <p className="font-semibold">No opportunities to show yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            The opportunity catalog is curated from verified sources and grows
            over time. Check back, or use{" "}
            <span className="font-medium text-foreground">
              Test an Opportunity
            </span>{" "}
            above to assess a specific competition or program yourself.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.key === "all" ? fits.length : (counts.get(f.key) ?? 0);
          if (f.key !== "all" && count === 0) return null;
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "border-brand-teal bg-brand-teal/10 text-brand-teal"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {f.key !== "all" && (
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    STATUS_META[f.key].dot,
                  )}
                />
              )}
              {f.label}
              <span className="text-muted-foreground/70">{count}</span>
            </button>
          );
        })}
      </div>

      {visible.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {visible.map((fit) => (
            <OpportunityCard key={fit.opportunity.id} fit={fit} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nothing in this category right now.
        </p>
      )}
    </div>
  );
}
