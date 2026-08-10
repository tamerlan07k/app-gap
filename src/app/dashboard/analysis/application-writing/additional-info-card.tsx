"use client";

import { Check, Pencil, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { AdditionalInfoWritingFeedback } from "~/lib/ai/writing-schema";
import { cn } from "~/lib/utils";
import {
  ADDITIONAL_INFO_WORD_LIMIT,
  additionalInfoObjectiveIssues,
  countWords,
} from "~/lib/writing/checks";

export function AdditionalInfoCard({
  response,
  feedback,
}: {
  response: string;
  /** Matched AI feedback, or null if not analyzed yet. */
  feedback: AdditionalInfoWritingFeedback | null;
}) {
  const words = countWords(response);
  const over = words > ADDITIONAL_INFO_WORD_LIMIT;
  const objectiveIssues = additionalInfoObjectiveIssues(response);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Additional Information
        </p>
      </div>

      <div className="space-y-4 p-6">
        {/* Response + live word counter */}
        <div className="space-y-1.5">
          <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {response}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Link
              href="/profile/review"
              className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-3" />
              Edit
            </Link>
            <span
              className={cn(
                "text-xs font-medium tabular-nums",
                over
                  ? "text-red-500 dark:text-red-400"
                  : "text-muted-foreground",
              )}
            >
              {words} / {ADDITIONAL_INFO_WORD_LIMIT} words
            </span>
          </div>
        </div>

        {/* Over-limit warning surfaced clearly, per spec */}
        {over && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-400">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            <span>
              This response is over the {ADDITIONAL_INFO_WORD_LIMIT}-word Common
              App limit ({words} words). Trim it down before submitting.
            </span>
          </div>
        )}

        {/* Other objective issues (excluding the over-limit one already shown) */}
        {objectiveIssues.filter((i) => i.kind !== "over-word-limit").length >
          0 && (
          <ul className="space-y-1">
            {objectiveIssues
              .filter((i) => i.kind !== "over-word-limit")
              .map((issue) => (
                <li
                  key={issue.kind}
                  className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400"
                >
                  <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                  {issue.message}
                </li>
              ))}
          </ul>
        )}

        {/* AI feedback */}
        {feedback ? (
          <div className="space-y-3 border-t border-border pt-4">
            {feedback.strengths.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  What&apos;s working
                </p>
                <ul className="space-y-1">
                  {feedback.strengths.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.improvements.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  What could improve
                </p>
                <ul className="space-y-1">
                  {feedback.improvements.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm">
                      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                      <span className="text-muted-foreground">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Suggestion
              </p>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feedback.suggestion}
              </p>
            </div>

            {feedback.improvedVersion && (
              <div className="space-y-1.5 rounded-lg border border-brand-teal/20 bg-brand-teal/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">
                  <Sparkles className="size-3.5" />
                  Tightened version
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {feedback.improvedVersion}
                </p>
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {countWords(feedback.improvedVersion)} /{" "}
                  {ADDITIONAL_INFO_WORD_LIMIT} words
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Run the analysis to get feedback on your Additional Information
            response.
          </p>
        )}
      </div>
    </div>
  );
}
