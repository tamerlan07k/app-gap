"use client";

import { Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { generateBalancedList } from "./actions";

export function GenerateListButton({
  label = "Generate my balanced list",
  size = "default",
}: {
  label?: string;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        type="button"
        size={size}
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await generateBalancedList();
            if (!res.ok) setError(res.error ?? "Something went wrong.");
          })
        }
      >
        <Sparkles />
        {pending ? "Building your list…" : label}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
