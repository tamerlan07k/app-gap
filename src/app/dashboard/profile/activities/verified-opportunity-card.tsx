import { ExternalLink, ShieldCheck } from "lucide-react";
import { Button } from "~/components/ui/button";
import type { VerifiedOpportunity } from "~/lib/activities/db";
import { ACTIVITY_CATEGORY_LABELS } from "~/lib/profile-labels";

function hoursLabel(o: VerifiedOpportunity): string | null {
  const { estHoursPerWeekMin: min, estHoursPerWeekMax: max } = o;
  if (min != null && max != null)
    return min === max ? `~${min} hrs/week` : `${min}–${max} hrs/week`;
  if (min != null) return `~${min} hrs/week`;
  if (max != null) return `~${max} hrs/week`;
  return null;
}

// A VERIFIED, real opportunity from the activity_opportunities reference table —
// the only place a real application link ever appears. Renders only when the
// ingestion pipeline has populated + human-verified rows; the AI never produces
// these. Until the table has data, this component is never rendered.
export function VerifiedOpportunityCard({
  opportunity,
}: {
  opportunity: VerifiedOpportunity;
}) {
  const categoryLabel =
    ACTIVITY_CATEGORY_LABELS[opportunity.category] ?? opportunity.category;
  const hours = hoursLabel(opportunity);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-teal/30 bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{opportunity.name}</p>
          {categoryLabel && (
            <p className="text-xs text-muted-foreground">{categoryLabel}</p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
          <ShieldCheck className="size-3" />
          Verified
        </span>
      </div>

      {opportunity.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {opportunity.description}
        </p>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {hours && <span>{hours}</span>}
        {opportunity.estDuration && <span>· {opportunity.estDuration}</span>}
        {opportunity.isOngoing && <span>· Ongoing</span>}
      </div>

      {opportunity.applicationUrl && (
        <Button asChild size="sm" variant="outline" className="w-fit">
          <a
            href={opportunity.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            Application page
            <ExternalLink />
          </a>
        </Button>
      )}
    </div>
  );
}
