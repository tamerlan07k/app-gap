"use client";

import { useState } from "react";
import { cn } from "~/lib/utils";

// College logo with a deterministic monogram fallback.
//
// Priority: a self-hosted asset (`logoAssetPath`) → an official logo URL resolved
// from the institution's domain (`logoUrl`, see scripts/college-ingest/
// backfill-logos.mjs) → a generated monogram. The monogram colors are picked
// deterministically from the name so a college always looks the same, and it is
// also what renders if the remote logo fails to load (`onError`), so a broken or
// missing logo never leaves an empty box. See docs/college-data-architecture.md §8.

const PALETTE = [
  "bg-brand-teal/10 text-brand-teal",
  "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
];

const STOPWORDS = new Set(["of", "the", "at", "in", "and", "for", "-"]);

function monogram(name: string): string {
  const words = name
    .replace(/[^a-zA-Z\s-]/g, "")
    .split(/[\s-]+/)
    .filter((w) => w && !STOPWORDS.has(w.toLowerCase()));
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function CollegeLogo({
  name,
  logoAssetPath,
  logoUrl,
  className,
}: {
  name: string;
  logoAssetPath?: string | null;
  logoUrl?: string | null;
  className?: string;
}) {
  const src = logoAssetPath ?? logoUrl ?? null;
  const [failed, setFailed] = useState(false);

  if (src && !failed) {
    return (
      // biome-ignore lint/performance/noImgElement: cross-origin logo (self-hosted asset or resolved logo CDN), not a Next-optimized image
      <img
        src={src}
        alt={`${name} logo`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn(
          "size-11 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-border/60",
          className,
        )}
      />
    );
  }

  const color = PALETTE[hash(name) % PALETTE.length];
  return (
    <div
      aria-hidden={true}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
        color,
        className,
      )}
    >
      {monogram(name)}
    </div>
  );
}
