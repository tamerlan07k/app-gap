"use client";

import { CheckCircle2, Pencil } from "lucide-react";
import { useTransition } from "react";
import { Button } from "~/components/ui/button";
import { finalizeList, reopenList } from "./actions";

export function FinalizeButton({ disabled }: { disabled?: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      disabled={disabled || pending}
      onClick={() =>
        startTransition(async () => {
          await finalizeList();
        })
      }
    >
      <CheckCircle2 />
      {pending ? "Finalizing…" : "Finalize My College List"}
    </Button>
  );
}

export function ReopenButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await reopenList();
        })
      }
    >
      <Pencil />
      {pending ? "Reopening…" : "Edit list"}
    </Button>
  );
}
