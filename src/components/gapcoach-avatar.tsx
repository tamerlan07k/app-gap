"use client";

import { useState } from "react";
import { AppGapLogo } from "~/components/logo";
import { cn } from "~/lib/utils";

// GapCoach's avatar — the AppGap coach's face on notes, chat, and evaluations.
// Loads the brand image from /gapcoach.webp (in the `public/` folder); until
// that file exists it falls back to the AppGap logo mark, so the UI is never
// broken by a missing asset.
export function GapCoachAvatar({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-teal/10 ring-1 ring-brand-teal/20",
        className ?? "size-6",
      )}
    >
      {failed ? (
        <AppGapLogo className="h-1/2 w-auto" />
      ) : (
        // biome-ignore lint/performance/noImgElement: tiny static avatar; this project uses no next/image
        <img
          src="/gapcoach.webp"
          alt="GapCoach"
          className="size-full object-cover"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
