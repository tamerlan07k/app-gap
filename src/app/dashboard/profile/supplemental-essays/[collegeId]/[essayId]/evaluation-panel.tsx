"use client";

import { CircleAlert, Quote } from "lucide-react";
import type { ScoredEvaluation } from "~/lib/supplemental/evaluate";
import {
  DIMENSION_LABELS,
  scoreBand,
  scoreColor,
} from "~/lib/supplemental/scoring";
import { cn } from "~/lib/utils";

// The evaluation panel — score, weighted breakdown, what's working, the main
// weakness, exact evidence (the student's own words), and guided revision
// questions. Coaching over rewriting. The overall is code-computed (see
// scoreEvaluation); this only renders it.
export function EvaluationPanel({
  evaluation,
}: {
  evaluation: ScoredEvaluation;
}) {
  const {
    overall,
    dimensions,
    weights,
    weightRationale,
    overview,
    mainWeakness,
    keyEvidence,
    guidedQuestions,
    collegeSpecificity,
    swapTest,
  } = evaluation;

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center">
          <span
            className={cn(
              "text-4xl font-bold tabular-nums",
              scoreColor(overall),
            )}
          >
            {overall}
          </span>
          <span className="text-xs text-muted-foreground">/ 100</span>
        </div>
        <div>
          <p className={cn("font-semibold", scoreColor(overall))}>
            {scoreBand(overall)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{overview}</p>
        </div>
      </div>

      <p className="mt-2 text-xs italic text-muted-foreground">
        An internal AppGap evaluation to guide revision — not an admissions
        prediction or chance of getting in.
      </p>

      {/* Breakdown */}
      <div className="mt-5 space-y-4">
        {dimensions.map((d) => (
          <div key={d.key}>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-sm font-medium">
                {DIMENSION_LABELS[d.key]}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  · {weights[d.key]}% weight
                </span>
              </p>
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  scoreColor(d.score),
                )}
              >
                {d.score}
                {d.adjusted && (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (adj.)
                  </span>
                )}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-brand-teal"
                style={{ width: `${d.score}%` }}
              />
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">{d.summary}</p>
            {d.adjusted && (
              <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400">
                Adjusted down for directive coverage — the essay leaves part of
                the prompt unanswered.
              </p>
            )}
            {d.improvements.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                {d.improvements.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <p className="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          Why this weighting:{" "}
        </span>
        {weightRationale}
      </p>

      {/* Main weakness */}
      {mainWeakness && (
        <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <CircleAlert className="size-4 text-amber-500" aria-hidden={true} />
            <p className="text-sm font-semibold">Biggest thing to fix</p>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{mainWeakness}</p>
        </div>
      )}

      {/* College specificity / swap test */}
      {(collegeSpecificity || swapTest) && (
        <div className="mt-4 rounded-lg border border-border p-3">
          <p className="text-sm font-semibold">College specificity</p>
          {collegeSpecificity && (
            <p className="mt-1 text-sm text-muted-foreground">
              Connection to this college:{" "}
              <span className="font-medium capitalize text-foreground">
                {collegeSpecificity}
              </span>
            </p>
          )}
          {swapTest && (
            <p className="mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Swap test: </span>
              {swapTest.swappable
                ? "This could be about many colleges — "
                : "Genuinely specific to this college — "}
              {swapTest.note}
            </p>
          )}
        </div>
      )}

      {/* Exact evidence */}
      {keyEvidence.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">From your own words</p>
          <ul className="mt-2 space-y-2">
            {keyEvidence.map((e, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: evidence is positional
              <li key={i} className="rounded-lg border border-border p-3">
                <p className="flex gap-1.5 text-sm italic text-foreground">
                  <Quote
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground"
                    aria-hidden={true}
                  />
                  <span>“{e.quote}”</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{e.issue}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Guided questions */}
      {guidedQuestions.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-semibold">
            Ask yourself before you revise
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {guidedQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
