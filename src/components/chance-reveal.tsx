"use client";

import { useEffect, useRef, useState } from "react";
import { formatChance } from "~/lib/colleges/assessment";
import { cn } from "~/lib/utils";

// Per-browser memory of the last chance we showed for a given key, so we can
// play a count-up when it rises (e.g. after finalizing a supplemental essay).
// Deliberately client-only and best-effort: it's an animation cue, not state we
// depend on — a fresh device simply shows the value with the normal pop.
const STORAGE_PREFIX = "appgap:chance:";
const COUNT_UP_MS = 900;

/**
 * The user-facing AppGap estimate: a single percentage revealed with a subtle
 * circular "bubble" that expands and fades behind the number. Both the pop and
 * the bubble respect prefers-reduced-motion (see globals.css).
 *
 * When `trackKey` is provided (e.g. a college id in My Colleges), the number also
 * animates COUNTING UP from the previously shown value whenever it has risen
 * since the last time this browser saw it — so a student who just finalized an
 * essay watches their chance climb. Without `trackKey` it renders exactly as
 * before (a one-shot pop at the final value).
 */
export function ChanceReveal({
  chance,
  size = "md",
  className,
  trackKey,
}: {
  chance: number | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  trackKey?: string;
}) {
  const targetPct = chance == null ? null : Math.round(chance * 100);
  // Non-null only while a count-up is in progress; otherwise we render the exact
  // formatted value (which handles "<1%" and "—").
  const [displayPct, setDisplayPct] = useState<number | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!trackKey || targetPct == null) return;

    let previous: number | null = null;
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + trackKey);
      if (raw != null) {
        const n = Number.parseInt(raw, 10);
        if (Number.isFinite(n)) previous = n;
      }
      localStorage.setItem(STORAGE_PREFIX + trackKey, String(targetPct));
    } catch {
      // Private mode / blocked storage — just skip the count-up.
    }

    // Only animate a genuine rise between visits, and only for whole-percent
    // values (a "<1%" reveal has nothing meaningful to count).
    if (previous == null || targetPct <= previous || targetPct < 1) return;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const from = previous;
    const to = targetPct;
    const start = performance.now();
    setDisplayPct(from);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      setDisplayPct(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayPct(null); // hand rendering back to formatChance
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [trackKey, targetPct]);

  const label = displayPct != null ? `${displayPct}%` : formatChance(chance);
  const counting = displayPct != null;
  const textSize =
    size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";

  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center",
        className,
      )}
    >
      {chance != null && (
        <span
          aria-hidden="true"
          className="animate-chance-bubble pointer-events-none absolute -z-10 aspect-square w-[150%] rounded-full bg-brand-teal/20"
        />
      )}
      <span
        className={cn(
          "font-bold leading-none text-brand-teal tabular-nums",
          // Skip the one-shot pop while actively counting up so the two
          // animations don't fight; the count-up is the reveal in that case.
          !counting && "animate-chance-pop",
          textSize,
        )}
      >
        {label}
      </span>
    </span>
  );
}
