"use client";

import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import { GapCoachAvatar } from "~/components/gapcoach-avatar";
import type { Evaluation } from "~/lib/ai/personal-statement/evaluation";
import {
  overallScore,
  SCORE_CATEGORIES,
  SCORE_CATEGORY_LABELS,
  scoreBand,
  scoreColor,
} from "~/lib/personal-statement/scoring";
import { cn } from "~/lib/utils";

export function EvaluationPanel({ evaluation }: { evaluation: Evaluation }) {
  // Order the model's categories by the canonical framework order, then compute
  // the overall as their equal-weight average (never the model's own number).
  const byKey = new Map(evaluation.categories.map((c) => [c.key, c]));
  const ordered = SCORE_CATEGORIES.map((def) => byKey.get(def.key)).filter(
    (c): c is NonNullable<typeof c> => Boolean(c),
  );
  const overall = overallScore(ordered);

  return (
    <div className="space-y-6">
      {/* Prominent overall score */}
      <div className="flex flex-col items-center gap-1 rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] px-6 py-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Personal Statement Score
        </p>
        <p className="flex items-baseline gap-1">
          <span
            className={cn(
              "text-6xl font-bold tabular-nums leading-none",
              scoreColor(overall),
            )}
          >
            {overall}
          </span>
          <span className="text-2xl font-semibold text-muted-foreground">
            /100
          </span>
        </p>
        <p className={cn("text-sm font-semibold", scoreColor(overall))}>
          {scoreBand(overall)}
        </p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          The average of the four categories below. A diagnostic to guide your
          revision — not an admissions chance or official score.
        </p>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {ordered.map((c) => (
          <div
            key={c.key}
            className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3">
              <p className="font-semibold tracking-tight">
                {SCORE_CATEGORY_LABELS[c.key]}
              </p>
              <div className="flex items-baseline gap-1">
                <span
                  className={cn(
                    "text-xl font-bold tabular-nums",
                    scoreColor(c.score),
                  )}
                >
                  {c.score}
                </span>
                <span className="text-xs text-muted-foreground">/100</span>
              </div>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm leading-relaxed text-muted-foreground">
                {c.summary}
              </p>
              {c.strengths.length > 0 && (
                <ul className="space-y-1.5">
                  {c.strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                      <span className="leading-relaxed">{s}</span>
                    </li>
                  ))}
                </ul>
              )}
              {c.improvements.length > 0 && (
                <ul className="space-y-1.5">
                  {c.improvements.map((s) => (
                    <li key={s} className="flex items-start gap-2 text-sm">
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-amber-500" />
                      <span className="leading-relaxed text-muted-foreground">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* GapCoach's overview */}
      {evaluation.overview.trim() && (
        <div className="flex items-start gap-3 rounded-2xl border border-border bg-muted/40 p-5">
          <GapCoachAvatar className="size-7" />
          <div>
            <p className="text-sm font-semibold">GapCoach's read</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {evaluation.overview}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
