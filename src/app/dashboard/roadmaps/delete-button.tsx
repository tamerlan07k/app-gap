"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteRoadmap } from "./actions";

export function DeleteButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setConfirming(false);
          }}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
        <form action={deleteRoadmap}>
          <input type="hidden" name="id" value={id} />
          <button
            type="submit"
            onClick={(e) => e.stopPropagation()}
            className="rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60"
          >
            Delete
          </button>
        </form>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setConfirming(true);
      }}
      aria-label="Delete roadmap"
      className="shrink-0 rounded-md p-1.5 text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}
