"use client";

import { Lightbulb, Pencil, Sparkles, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ActivityWritingFeedback } from "~/lib/ai/writing-schema";
import { cn } from "~/lib/utils";
import {
  ACTIVITY_CHAR_LIMIT,
  activityObjectiveIssues,
  activityWritingMode,
  computeActivityScore,
  countChars,
} from "~/lib/writing/checks";

// Category slug → human label. Kept local so the client bundle doesn't pull in
// the server-side writing prompt just for these labels.
const CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports / Athletics",
  clubs: "Clubs & Organizations",
  volunteering: "Community Service / Volunteering",
  research: "Research",
  internship: "Internship",
  work: "Work / Employment",
  "personal-project": "Personal Project",
  business: "Business / Startup",
  arts: "Arts & Performance",
  competitions: "Competitions & Olympiads",
  cultural: "Cultural / Religious",
  "student-gov": "Student Government",
  other: "Other",
};

// Color the overall /10 by band — teal (strong), amber (mid), red (weak).
function scoreTone(score: number): string {
  if (score > 8) return "text-brand-teal";
  if (score >= 5) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function barTone(score: number): string {
  if (score > 8) return "bg-brand-teal";
  if (score >= 5) return "bg-amber-500";
  return "bg-red-500";
}

function CriterionRow({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-xs font-medium">{label}</span>
        <span className="text-xs font-bold tabular-nums">{score}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barTone(score))}
          style={{ width: `${score * 10}%` }}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{note}</p>
    </div>
  );
}

export function ActivityWritingCard({
  name,
  category,
  description,
  feedback,
}: {
  name: string;
  category: string;
  description: string;
  /** Matched AI feedback, or null if this activity hasn't been analyzed yet. */
  feedback: ActivityWritingFeedback | null;
}) {
  const chars = countChars(description);
  const over = chars > ACTIVITY_CHAR_LIMIT;
  const objectiveIssues = activityObjectiveIssues(description);
  const categoryLabel = CATEGORY_LABELS[category] ?? category;

  const overall = feedback ? computeActivityScore(feedback) : null;
  const mode =
    feedback && overall != null
      ? activityWritingMode(overall, feedback.groundable)
      : null;

  return (
    <div className="space-y-4 px-6 py-5">
      {/* Header: name + overall score */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{name}</p>
          <p className="text-xs text-muted-foreground">{categoryLabel}</p>
        </div>
        {overall != null && (
          <div className="shrink-0 text-right">
            <p
              className={cn(
                "text-lg font-bold tabular-nums",
                scoreTone(overall),
              )}
            >
              {overall}
              <span className="text-xs font-medium text-muted-foreground">
                /10
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Current description + live counter */}
      <div className="space-y-1.5">
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm leading-relaxed">{description}</p>
        </div>
        <div className="flex items-center justify-between">
          <Link
            href="/profile/activities"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Pencil className="size-3" />
            Edit
          </Link>
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              over ? "text-red-500 dark:text-red-400" : "text-muted-foreground",
            )}
          >
            {chars} / {ACTIVITY_CHAR_LIMIT} characters
          </span>
        </div>
      </div>

      {/* Objective issues (always computed, no AI required) */}
      {objectiveIssues.length > 0 && (
        <ul className="space-y-1">
          {objectiveIssues.map((issue) => (
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
      {feedback && mode ? (
        <div className="space-y-4">
          {/* Score breakdown */}
          <div className="grid gap-3 sm:grid-cols-3">
            <CriterionRow
              label="Action verb"
              score={feedback.actionVerb.score}
              note={feedback.actionVerb.note}
            />
            <CriterionRow
              label="Specificity"
              score={feedback.specificity.score}
              note={feedback.specificity.note}
            />
            <CriterionRow
              label="Impact"
              score={feedback.impact.score}
              note={feedback.impact.note}
            />
          </div>

          {/* Guidance depends on the mode. */}
          {mode === "polish" && (
            <div className="space-y-1.5 rounded-lg border border-brand-teal/20 bg-brand-teal/[0.04] p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">
                <Sparkles className="size-3.5" />
                Already strong — a few tweaks
              </p>
              <p className="text-sm leading-relaxed">{feedback.polishNote}</p>
            </div>
          )}

          {mode === "rewrite" && feedback.improvedDescription && (
            <div className="space-y-2">
              {feedback.polishNote && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feedback.polishNote}
                </p>
              )}
              <div className="space-y-1.5 rounded-lg border border-brand-teal/20 bg-brand-teal/[0.04] p-3">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">
                  <Sparkles className="size-3.5" />
                  Suggested 10/10 rewrite
                </p>
                <p className="text-sm leading-relaxed">
                  {feedback.improvedDescription}
                </p>
                <p className="text-right text-xs tabular-nums text-muted-foreground">
                  {countChars(feedback.improvedDescription)} /{" "}
                  {ACTIVITY_CHAR_LIMIT} characters
                </p>
              </div>
            </div>
          )}

          {mode === "template" && feedback.template && (
            <div className="space-y-2">
              {feedback.polishNote && (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {feedback.polishNote}
                </p>
              )}
              <div className="space-y-1.5 rounded-lg border border-amber-300/50 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-950/20">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-400">
                  <Lightbulb className="size-3.5" />
                  Fill in your real details
                </p>
                <p className="text-sm leading-relaxed">{feedback.template}</p>
                <p className="text-xs text-muted-foreground">
                  This is too vague to improve without inventing facts —
                  complete the blanks with your own specifics.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run the analysis to score this description and get communication
          feedback.
        </p>
      )}
    </div>
  );
}
