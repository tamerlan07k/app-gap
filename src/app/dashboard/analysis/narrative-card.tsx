import { BookOpen, Eye, Lightbulb, Target, TriangleAlert } from "lucide-react";
import type { ApplicationNarrative } from "~/lib/ai/schema";
import { cn } from "~/lib/utils";

function ScoreMeter({
  score,
  label,
  explanation,
}: {
  score: number;
  label: string;
  explanation: string;
}) {
  const barColor =
    score >= 75 ? "bg-brand-teal" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const textColor =
    score >= 75
      ? "text-brand-teal"
      : score >= 50
        ? "text-amber-500"
        : "text-red-500 dark:text-red-400";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium">{label}</span>
        <span className={cn("text-sm font-bold tabular-nums", textColor)}>
          {score}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {explanation}
      </p>
    </div>
  );
}

export function NarrativeCard({
  narrative,
}: {
  narrative: ApplicationNarrative;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Application Narrative
        </p>
      </div>

      <div className="divide-y divide-border">
        {/* Standout Quality */}
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <Lightbulb className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Standout Quality
            </p>
            <p className="text-base font-semibold">
              {narrative.standoutQuality}
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {narrative.standoutExplanation}
            </p>
          </div>
        </div>

        {/* Narrative Scores */}
        <div className="space-y-5 p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Narrative Scores
          </p>
          <ScoreMeter
            score={narrative.narrativeCohesion.score}
            label="Narrative Cohesion"
            explanation={narrative.narrativeCohesion.explanation}
          />
          <ScoreMeter
            score={narrative.memorability.score}
            label="Memorability"
            explanation={narrative.memorability.explanation}
          />
          <ScoreMeter
            score={narrative.majorAlignment.score}
            label="Major Alignment"
            explanation={narrative.majorAlignment.explanation}
          />
        </div>

        {/* Story Cohesion */}
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <BookOpen className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Story Cohesion
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {narrative.cohesionAnalysis}
            </p>
          </div>
        </div>

        {/* Admissions Perspective */}
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <Eye className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Admissions Perspective
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {narrative.admissionsPerception}
            </p>
          </div>
        </div>

        {/* Narrative Gaps */}
        {narrative.narrativeGaps.length > 0 && (
          <div className="space-y-3 p-6">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Narrative Gaps
            </p>
            <div className="space-y-3">
              {narrative.narrativeGaps.map((item) => (
                <div key={item.gap} className="flex gap-3">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">{item.gap}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">
                      {item.explanation}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* School Fit */}
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <Target className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              School Fit
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {narrative.schoolFitReasoning}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
