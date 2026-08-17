"use client";

import { ArrowUpRight, Clock, Loader2, Pencil, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import {
  ALIGNMENT_META,
  STRENGTH_META,
  VERDICT_META,
} from "~/lib/activities/labels";
import { activityMetrics } from "~/lib/activities/metrics";
import type { ActivityAnalysis } from "~/lib/ai/activities-schema";
import { ACTIVITY_CATEGORY_LABELS } from "~/lib/profile-labels";
import { cn } from "~/lib/utils";
import { deleteActivity } from "./actions";
import { ActivityForm, type EditableActivity } from "./activity-form";

function Badge({ label, badge }: { label: string; badge: string }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-xs font-medium",
        badge,
      )}
    >
      {label}
    </span>
  );
}

export function ActivityItem({
  activity,
  analysis,
}: {
  activity: EditableActivity;
  /** Matched AI analysis for this activity, or null if not analyzed yet. */
  analysis: ActivityAnalysis | null;
}) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const m = activityMetrics({
    name: activity.name,
    category: activity.category,
    grades: activity.grades,
    leadershipRole: activity.leadershipRole,
    description: activity.description,
    hoursPerWeek: activity.hoursPerWeek,
    weeksPerYear: activity.weeksPerYear,
    meaningfulness: activity.meaningfulness,
  });
  const categoryLabel =
    ACTIVITY_CATEGORY_LABELS[activity.category] ?? activity.category ?? "";

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteActivity(activity.id);
      if (!res.ok) {
        setError(res.error ?? "Couldn't delete.");
        setConfirmingDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="p-5">
        <ActivityForm
          activity={activity}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const meta = analysis ? VERDICT_META[analysis.verdict] : null;

  return (
    <div className="space-y-3 p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">
            {activity.name || "Untitled activity"}
          </p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
            {categoryLabel && <span>{categoryLabel}</span>}
            {activity.leadershipRole?.trim() && (
              <span>· {activity.leadershipRole.trim()}</span>
            )}
            {m.longevityYears > 0 && (
              <span>
                · {m.longevityYears} yr{m.longevityYears === 1 ? "" : "s"}
              </span>
            )}
            {activity.hoursPerWeek != null && (
              <span className="inline-flex items-center gap-1">
                · <Clock className="size-3" />
                {activity.hoursPerWeek}h/wk
              </span>
            )}
          </p>
        </div>
        {analysis && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Badge
              label={STRENGTH_META[analysis.strength].label}
              badge={STRENGTH_META[analysis.strength].badge}
            />
            <Badge
              label={ALIGNMENT_META[analysis.majorAlignment].label}
              badge={ALIGNMENT_META[analysis.majorAlignment].badge}
            />
          </div>
        )}
      </div>

      {activity.description?.trim() && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {activity.description.trim()}
        </p>
      )}

      {/* AI analysis */}
      {analysis && meta ? (
        <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
          <div className="flex items-center gap-2">
            <Badge label={meta.label} badge={meta.badge} />
            <span className="text-xs text-muted-foreground">{meta.blurb}</span>
          </div>
          <p className="text-sm leading-relaxed">{analysis.verdictRationale}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold text-foreground">Strength</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {analysis.strengthRationale}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Field alignment
              </p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                {analysis.majorAlignmentRationale}
              </p>
            </div>
          </div>
          {analysis.deepenIdea && (
            <div className="flex items-start gap-2 rounded-md border border-brand-teal/20 bg-brand-teal/[0.05] p-2.5">
              <ArrowUpRight className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
              <p className="text-xs leading-relaxed">
                <span className="font-semibold text-brand-teal">
                  Way to grow it:{" "}
                </span>
                {analysis.deepenIdea}
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run the analysis to see strength, field alignment, and whether it's
          worth deepening.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      {/* Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setEditing(true)}
          disabled={pending}
        >
          <Pencil />
          Edit
        </Button>
        {confirmingDelete ? (
          <>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Confirm delete
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
