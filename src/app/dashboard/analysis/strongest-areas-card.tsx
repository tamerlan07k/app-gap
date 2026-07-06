import { CheckCircle2 } from "lucide-react";
import type { Analysis } from "~/lib/ai/schema";

export function StrongestAreasCard({
  areas,
}: {
  areas: Analysis["strongestAreas"];
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Your Strengths
        </p>
      </div>
      <div className="divide-y divide-border">
        {areas.map((area) => (
          <div key={area.area} className="flex gap-3 px-6 py-4">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
            <div>
              <p className="text-sm font-medium">{area.area}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                {area.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
