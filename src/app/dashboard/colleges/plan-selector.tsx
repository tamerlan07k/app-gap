"use client";

import { Check } from "lucide-react";
import { useTransition } from "react";
import type { ApplicationRound } from "~/lib/colleges/types";
import { cn } from "~/lib/utils";
import { selectRound } from "./actions";
import { formatDeadline, roundLabel } from "./round-format";

export function PlanSelector({
  collegeId,
  rounds,
  selectedRoundId,
}: {
  collegeId: string;
  rounds: ApplicationRound[];
  selectedRoundId: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (rounds.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No application rounds available to plan for this cycle yet.
      </p>
    );
  }

  const choose = (roundId: string) => {
    const next = roundId === selectedRoundId ? null : roundId; // toggle off
    startTransition(async () => {
      await selectRound(collegeId, next);
    });
  };

  return (
    <div className="space-y-1.5" aria-busy={pending}>
      {rounds.map((r) => {
        const selected = r.id === selectedRoundId;
        const deadline = formatDeadline(r.deadlineDate);
        return (
          <button
            key={r.id}
            type="button"
            disabled={pending}
            onClick={() => choose(r.id)}
            aria-pressed={selected}
            className={cn(
              "flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60",
              selected
                ? "border-brand-teal bg-brand-teal/[0.06]"
                : "border-border/70 hover:border-brand-teal/40",
            )}
          >
            <span className="min-w-0">
              <span className="block truncate font-medium">
                {roundLabel(r.roundType, r.name)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {deadline ? `Deadline ${deadline}` : "Deadline pending"}
                {!r.verified && " · unverified"}
              </span>
            </span>
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                selected
                  ? "border-brand-teal bg-brand-teal text-white"
                  : "border-border",
              )}
            >
              {selected && <Check className="size-3.5" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
