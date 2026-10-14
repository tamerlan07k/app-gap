"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import {
  ALL_REGIONS,
  type CollegeLocationFilter,
  REGION_LABELS,
  stateName,
} from "~/lib/colleges/geography";
import { generateBalancedList } from "./actions";

const SELECT_CLASS =
  "h-8 rounded-md border border-input bg-transparent px-2 text-xs shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/30";

// Encode each filter choice as a flat <select> value, decoded back on submit.
function decodeFilter(value: string): CollegeLocationFilter {
  if (value === "state") return { kind: "state" };
  if (value === "bordering") return { kind: "bordering" };
  if (value.startsWith("region:")) {
    return {
      kind: "region",
      region: value.slice("region:".length) as never,
    };
  }
  return { kind: "none" };
}

export function GenerateListButton({
  label = "Generate my balanced list",
  size = "default",
  studentState = null,
}: {
  label?: string;
  size?: "sm" | "default";
  /** Auto-detected 2-letter US state, or null when none was detected. */
  studentState?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [choice, setChoice] = useState("none");

  const hasState = !!studentState;
  const stateLabel = useMemo(
    () => (studentState ? (stateName(studentState) ?? studentState) : null),
    [studentState],
  );

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Location filter for college recommendations"
          className={SELECT_CLASS}
          value={choice}
          disabled={pending}
          onChange={(e) => setChoice(e.target.value)}
        >
          <option value="none">Anywhere (standard)</option>
          <option value="state" disabled={!hasState}>
            {hasState ? `In ${stateLabel}` : "In my state (set your state)"}
          </option>
          <option value="bordering" disabled={!hasState}>
            {hasState
              ? `${stateLabel} + bordering states`
              : "My state + bordering (set your state)"}
          </option>
          {ALL_REGIONS.map((r) => (
            <option key={r} value={`region:${r}`}>
              {REGION_LABELS[r]}
            </option>
          ))}
        </select>

        <Button
          type="button"
          size={size}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const res = await generateBalancedList(decodeFilter(choice));
              if (!res.ok) setError(res.error ?? "Something went wrong.");
            })
          }
        >
          <Sparkles />
          {pending ? "Building your list…" : label}
        </Button>
      </div>
      {!hasState && choice === "none" && (
        <p className="text-xs text-muted-foreground">
          Add where you live in your profile to filter by your state or region.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
