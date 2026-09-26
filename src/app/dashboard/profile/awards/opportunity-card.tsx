"use client";

import { CalendarClock, Clock, ExternalLink, Target } from "lucide-react";
import { CATEGORY_LABELS, EFFORT_META, STATUS_META } from "~/lib/awards/labels";
import { THEME_LABELS } from "~/lib/awards/themes";
import type { OpportunityFit } from "~/lib/awards/types";
import { cn } from "~/lib/utils";

function deadlineLabel(fit: OpportunityFit): string {
  const o = fit.opportunity;
  if (o.isRolling) return "Rolling / ongoing";
  const t = fit.timing;
  if (t?.exactDay) {
    const d = t.nextDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    });
    return t.daysUntil != null ? `${d} · ~${t.daysUntil} days` : d;
  }
  if (o.deadlineNote) return o.deadlineNote;
  if (o.deadlineMonth) {
    const m = new Date(2000, o.deadlineMonth - 1, 1).toLocaleDateString(
      "en-US",
      { month: "long" },
    );
    return `Typically ${m}`;
  }
  return "Check the official site";
}

function themeLabels(themes: readonly string[]): string {
  return themes
    .map((t) => THEME_LABELS[t as keyof typeof THEME_LABELS] ?? t)
    .join(", ");
}

export function OpportunityCard({ fit }: { fit: OpportunityFit }) {
  const o = fit.opportunity;
  const status = STATUS_META[fit.status];
  const effort = EFFORT_META[o.effort];
  const dimmed =
    fit.status === "low_priority" || fit.status === "not_enough_time";

  return (
    <div
      className={cn(
        "space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm",
        dimmed && "opacity-80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">{o.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[o.organization, CATEGORY_LABELS[o.category]]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
            status.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      {o.description && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {o.description}
        </p>
      )}

      {/* Deterministic facts */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock className="size-3.5" />
          {deadlineLabel(fit)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock className="size-3.5" />
          {effort.label} · {o.estPrepTime || effort.blurb}
        </span>
        {o.eligibleGrades.length > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Target className="size-3.5" />
            Grades {o.eligibleGrades.join(", ")}
          </span>
        )}
      </div>

      {/* Why it fits (deterministic reasons) */}
      {fit.reasons.length > 0 && (
        <ul className="space-y-1">
          {fit.reasons.map((r) => (
            <li
              key={r}
              className="flex items-start gap-1.5 text-xs leading-relaxed"
            >
              <span className="mt-1 size-1 shrink-0 rounded-full bg-brand-teal" />
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {/* What it could add to the application */}
      {(fit.addsThemes.length > 0 || fit.reinforcesThemes.length > 0) && (
        <p className="text-xs text-muted-foreground">
          {fit.addsThemes.length > 0 ? (
            <>
              <span className="font-medium text-foreground">Could add: </span>
              {themeLabels(fit.addsThemes)}
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">Reinforces: </span>
              {themeLabels(fit.reinforcesThemes)}
            </>
          )}
        </p>
      )}

      {o.eligibilityNotes && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Eligibility: </span>
          {o.eligibilityNotes}
          {o.costNote ? ` · ${o.costNote}` : ""}
        </p>
      )}

      {(o.applicationUrl || o.sourceUrl) && (
        <a
          href={o.applicationUrl ?? o.sourceUrl ?? "#"}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-teal hover:underline"
        >
          <ExternalLink className="size-3.5" />
          Official page
        </a>
      )}
    </div>
  );
}
