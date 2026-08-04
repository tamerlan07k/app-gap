"use client";

import {
  Check,
  HelpCircle,
  Pencil,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import type {
  ActivityWritingFeedback,
  WritingQuality,
} from "~/lib/ai/writing-schema";
import { cn } from "~/lib/utils";
import {
  ACTIVITY_CHAR_LIMIT,
  activityObjectiveIssues,
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

const QUALITY_CONFIG: Record<WritingQuality, { label: string; badge: string }> =
  {
    strong: {
      label: "Strong",
      badge:
        "bg-brand-teal/10 text-brand-teal dark:bg-brand-teal/15 dark:text-brand-teal",
    },
    good: {
      label: "Good — minor improvement",
      badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
    },
    "needs-specificity": {
      label: "Needs more specificity",
      badge:
        "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
    },
    "very-vague": {
      label: "Very vague",
      badge: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
    },
  };

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
  const quality = feedback ? QUALITY_CONFIG[feedback.quality] : null;

  return (
    <div className="space-y-4 px-6 py-5">
      {/* Header: name + quality */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{name}</p>
          <p className="text-xs text-muted-foreground">{categoryLabel}</p>
        </div>
        {quality && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
              quality.badge,
            )}
          >
            {quality.label}
          </span>
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
      {feedback ? (
        <div className="space-y-3">
          {feedback.whatsWorking.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What&apos;s working
              </p>
              <ul className="space-y-1">
                {feedback.whatsWorking.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm">
                    <Check className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
                    <span className="text-muted-foreground">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {feedback.whatCouldImprove.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What could improve
              </p>
              <ul className="space-y-1">
                {feedback.whatCouldImprove.map((point) => (
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

          {/* A grounded revision OR a clarifying question — never both. */}
          {feedback.potentialRevision ? (
            <div className="space-y-1.5 rounded-lg border border-brand-teal/20 bg-brand-teal/[0.04] p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-brand-teal">
                <Sparkles className="size-3.5" />
                Potential revision
              </p>
              <p className="text-sm leading-relaxed">
                {feedback.potentialRevision}
              </p>
              <p className="text-right text-xs tabular-nums text-muted-foreground">
                {countChars(feedback.potentialRevision)} / {ACTIVITY_CHAR_LIMIT}{" "}
                characters
              </p>
            </div>
          ) : feedback.clarifyingQuestion ? (
            <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3">
              <HelpCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                {feedback.clarifyingQuestion}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run the analysis to get communication feedback on this description.
        </p>
      )}
    </div>
  );
}
