"use client";

import { CheckCircle2, HelpCircle } from "lucide-react";
import type {
  DraftAnalysis,
  DraftBand,
  DraftDimensionKey,
} from "~/lib/ai/personal-statement/draft-analysis";
import { cn } from "~/lib/utils";

const DIMENSION_LABELS: Record<DraftDimensionKey, string> = {
  through_line: "Through-line",
  hook: "Hook",
  reflection: "Reflection",
  narrative_arc: "Narrative arc",
  voice: "Voice",
  specificity: "Specificity",
};

const BAND_LABELS: Record<DraftBand, string> = {
  strong: "Strong",
  developing: "Developing",
  needs_work: "Needs work",
};

const BAND_STYLES: Record<DraftBand, string> = {
  strong: "bg-brand-teal/10 text-brand-teal",
  developing: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  needs_work: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export function DraftAnalysisPanel({ analysis }: { analysis: DraftAnalysis }) {
  return (
    <div className="space-y-6">
      {analysis.overallRead.trim() && (
        <p className="text-sm leading-relaxed">{analysis.overallRead}</p>
      )}

      {/* Dimensions */}
      {analysis.dimensions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {analysis.dimensions.map((d) => (
            <div
              key={d.key}
              className="rounded-xl border border-border bg-card p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">
                  {DIMENSION_LABELS[d.key]}
                </p>
                <span
                  className={cn(
                    "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    BAND_STYLES[d.band],
                  )}
                >
                  {BAND_LABELS[d.band]}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {d.assessment}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Strengths */}
      {analysis.strengths.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What's working
          </h4>
          <ul className="space-y-2">
            {analysis.strengths.map((s) => (
              <li key={s.title} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Focus areas — the coaching core */}
      {analysis.focusAreas.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            What to focus on next
          </h4>
          <div className="space-y-3">
            {analysis.focusAreas.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-amber-500/30 bg-amber-500/[0.04] p-4"
              >
                <p className="text-sm font-semibold">{f.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {f.weak}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  <span className="font-medium text-foreground">Why:</span>{" "}
                  {f.why}
                </p>
                <p className="mt-2 flex items-start gap-2 rounded-lg bg-card px-3 py-2 text-sm leading-relaxed">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                  <span>
                    <span className="font-medium">Ask yourself:</span>{" "}
                    {f.question}
                  </span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Coherence */}
      {analysis.resumeCheck.trim() && (
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fit with the rest of your application
          </p>
          <p className="mt-1 text-sm leading-relaxed">{analysis.resumeCheck}</p>
        </div>
      )}

      {/* Next steps */}
      {analysis.nextSteps.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Next steps
          </h4>
          <ol className="space-y-1.5">
            {analysis.nextSteps.map((s, i) => (
              <li key={s} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-[10px] font-semibold text-brand-teal">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        This is coaching to guide your own revision — not a rewrite, and not an
        admissions prediction.
      </p>
    </div>
  );
}
