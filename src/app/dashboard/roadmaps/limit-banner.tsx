"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "~/components/ui/button";

interface LimitBannerProps {
  nextAvailableDate: string;
  tier: "free" | "pro";
}

export function LimitBanner({ nextAvailableDate, tier }: LimitBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const formatted = new Date(nextAvailableDate).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative rounded-2xl border border-brand-teal/30 bg-brand-teal/5 p-5">
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="absolute right-4 top-4 rounded-md p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>

      <p className="pr-6 text-sm font-medium text-foreground">
        You have reached your monthly roadmap limit. Your next generation will
        be available on{" "}
        <span className="font-semibold text-brand-teal">{formatted}</span>.
      </p>
      {tier === "free" && (
        <p className="mt-2 text-sm text-muted-foreground">
          To generate more roadmaps, you can{" "}
          <Button
            asChild
            size="sm"
            className="inline-flex h-auto bg-brand-teal px-3 py-1 text-xs font-semibold text-white hover:bg-brand-teal/90"
          >
            <Link href="/dashboard/billing">Upgrade to Pro</Link>
          </Button>
        </p>
      )}
    </div>
  );
}
