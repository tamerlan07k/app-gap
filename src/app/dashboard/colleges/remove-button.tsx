"use client";

import { X } from "lucide-react";
import { useState, useTransition } from "react";
import { removeCollege } from "./actions";

export function RemoveButton({
  collegeId,
  collegeName,
}: {
  collegeId: string;
  collegeName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              await removeCollege(collegeId);
              setConfirming(false);
            })
          }
          className="rounded-md bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/20 disabled:opacity-50"
        >
          {pending ? "Removing…" : "Remove"}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove ${collegeName}`}
      className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <X className="size-4" />
    </button>
  );
}
