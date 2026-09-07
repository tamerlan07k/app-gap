"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { checklistBySubject } from "~/lib/coursework/catalog";
import type {
  AvailabilityMap,
  AvailabilityState,
} from "~/lib/coursework/types";
import { cn } from "~/lib/utils";
import { setCourseAvailability } from "./actions";

const OPTIONS: Array<{
  value: AvailabilityState;
  label: string;
  tone: string;
}> = [
  {
    value: "offered",
    label: "Offered",
    tone: "border-brand-teal bg-brand-teal/10 text-brand-teal",
  },
  {
    value: "not_offered",
    label: "Not offered",
    tone: "border-border bg-muted text-muted-foreground",
  },
  {
    value: "unsure",
    label: "Not sure",
    tone: "border-border text-muted-foreground",
  },
];

function CourseRow({
  courseKey,
  label,
  value,
  onChange,
}: {
  courseKey: string;
  label: string;
  value: AvailabilityState;
  onChange: (state: AvailabilityState) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [state, setState] = useState<AvailabilityState>(value);

  function choose(next: AvailabilityState) {
    if (next === state) return;
    const prev = state;
    setState(next);
    onChange(next);
    startTransition(async () => {
      const res = await setCourseAvailability({
        courseKey,
        availability: next,
      });
      if (!res.ok) {
        setState(prev); // revert on failure
        onChange(prev);
      }
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 text-sm">
        {label}
        {pending && (
          <Loader2 className="size-3 animate-spin text-muted-foreground" />
        )}
      </span>
      <div className="flex shrink-0 gap-1">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            className={cn(
              "rounded-md border px-2 py-1 text-xs font-medium transition-colors",
              state === o.value
                ? o.tone
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// The school-opportunity self-report. Short, curated advanced-course checklist —
// the ONLY truthful source we have for what a school offers. Every item defaults
// to "Not sure", and unknown availability is treated as unknown context, never a
// gap. Each change persists immediately via a server action.
export function AvailabilityChecklist({
  initial,
}: {
  initial: AvailabilityMap;
}) {
  const [map, setMap] = useState<AvailabilityMap>(initial);
  const groups = checklistBySubject();

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Tell us which of these advanced courses your high school offers. This is
        the single most important context in the analysis: AppGap never treats a
        course your school doesn't offer — or one you're unsure about — as a
        gap.
      </p>
      {groups.map((group) => (
        <div key={group.subjectArea} className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {group.label}
          </p>
          <div className="divide-y divide-border">
            {group.courses.map((c) => (
              <CourseRow
                key={c.key}
                courseKey={c.key}
                label={c.label}
                value={map[c.key] ?? "unsure"}
                onChange={(state) =>
                  setMap((prev) => ({ ...prev, [c.key]: state }))
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
