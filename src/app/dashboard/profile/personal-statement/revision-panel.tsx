"use client";

import { ArrowUpRight, ListChecks } from "lucide-react";
import type {
  Revision,
  RevisionStage,
} from "~/lib/ai/personal-statement/revision";
import {
  SCORE_CATEGORIES,
  SCORE_CATEGORY_LABELS,
} from "~/lib/personal-statement/scoring";

const STAGE_LABELS: Record<RevisionStage, string> = {
  draft_1: "Draft 1 · Get the story down",
  draft_2: "Draft 2 · Shape structure & depth",
  draft_3: "Draft 3 · Refine language & voice",
  final: "Final · Polish & proofread",
};

export function RevisionPanel({ revision }: { revision: Revision }) {
  const planByKey = new Map(revision.categoryPlan.map((p) => [p.key, p]));

  return (
    <div className="space-y-6">
      {/* Stage */}
      <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {STAGE_LABELS[revision.stage]}
        </p>
        {revision.stageNote.trim() && (
          <p className="mt-1 text-sm leading-relaxed">{revision.stageNote}</p>
        )}
      </div>

      {/* Top priorities */}
      {revision.topPriorities.length > 0 && (
        <section className="space-y-2">
          <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Do these first
          </h4>
          <ol className="space-y-2">
            {revision.topPriorities.map((p, i) => (
              <li key={p} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/10 text-[11px] font-semibold text-brand-teal">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{p}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Per-category moves */}
      <section className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          By category
        </h4>
        <div className="space-y-3">
          {SCORE_CATEGORIES.map((def) => {
            const plan = planByKey.get(def.key);
            if (!plan || plan.moves.length === 0) return null;
            return (
              <div
                key={def.key}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="font-semibold tracking-tight">
                  {SCORE_CATEGORY_LABELS[def.key]}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {plan.moves.map((m) => (
                    <li key={m} className="flex items-start gap-2 text-sm">
                      <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                      <span className="leading-relaxed text-muted-foreground">
                        {m}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* Process reminders */}
      {revision.processReminders.length > 0 && (
        <div className="rounded-2xl border border-border bg-muted/40 p-5">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="size-4" />
            Revision reminders
          </p>
          <ul className="mt-2 space-y-1.5">
            {revision.processReminders.map((r) => (
              <li
                key={r}
                className="text-sm leading-relaxed text-muted-foreground"
              >
                • {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        A plan to guide your own next revision — not a rewrite, and not an
        admissions prediction.
      </p>
    </div>
  );
}
