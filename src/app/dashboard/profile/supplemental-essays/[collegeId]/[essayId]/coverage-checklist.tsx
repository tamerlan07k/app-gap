"use client";

import { AlertTriangle, Check, CircleHelp, X } from "lucide-react";
import type {
  ChecklistItem,
  ChecklistState,
} from "~/lib/supplemental/checklist";
import { cn } from "~/lib/utils";

// The Prompt Coverage Checklist — assembled in code from the cached analyses.
// The most at-a-glance-useful part of the workspace: directives answered, word
// count, college specificity, application repetition.

function StateIcon({ state }: { state: ChecklistState }) {
  const cls = "size-4 shrink-0";
  if (state === "ok")
    return <Check className={cn(cls, "text-brand-teal")} aria-hidden={true} />;
  if (state === "warn")
    return (
      <AlertTriangle className={cn(cls, "text-amber-500")} aria-hidden={true} />
    );
  if (state === "missing")
    return (
      <X
        className={cn(cls, "text-red-500 dark:text-red-400")}
        aria-hidden={true}
      />
    );
  return (
    <CircleHelp
      className={cn(cls, "text-muted-foreground")}
      aria-hidden={true}
    />
  );
}

function Row({ item }: { item: ChecklistItem }) {
  return (
    <li className="flex items-start gap-2.5 py-1.5">
      <span className="mt-0.5">
        <StateIcon state={item.state} />
      </span>
      <div className="min-w-0">
        <p className="text-sm">{item.label}</p>
        {item.detail && (
          <p className="text-xs text-muted-foreground">{item.detail}</p>
        )}
      </div>
    </li>
  );
}

export function CoverageChecklist({
  directives,
  summary,
}: {
  directives: ChecklistItem[];
  summary: ChecklistItem[];
}) {
  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <h3 className="font-semibold">Prompt coverage checklist</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        A quick pre-finalize check. Run the evaluation and application check to
        fill in the unknowns.
      </p>

      {directives.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Directives
          </p>
          <ul className="mt-1 divide-y divide-border">
            {directives.map((item, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: directives are positional
              <Row key={`d-${i}`} item={item} />
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Summary
        </p>
        <ul className="mt-1 divide-y divide-border">
          {summary.map((item) => (
            <Row key={item.label} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
}
