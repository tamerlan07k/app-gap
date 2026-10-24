"use client";

import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Analysis } from "~/lib/ai/schema";
import { COMPONENT_WEIGHTS } from "~/lib/ai/score";
import { classifyScoreChange } from "~/lib/score-delta";
import { cn } from "~/lib/utils";

const SCORE_COMPONENTS: {
  key: "academics" | "activities" | "awards";
  label: string;
}[] = [
  { key: "academics", label: "Academics" },
  { key: "activities", label: "Activities" },
  { key: "awards", label: "Awards" },
];

// Per-browser record of the last analysis id we've already revealed, so the
// count-up animation and the "what changed" cue play exactly ONCE per genuinely
// new score — never again on a plain refresh or a later return to the page.
// Best-effort (like chance-reveal): a fresh device simply shows the final number
// with no animation.
const SEEN_KEY = "appgap:score-revealed";
const COUNT_MS = 900;

function readSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeSeen(id: string): void {
  try {
    localStorage.setItem(SEEN_KEY, id);
  } catch {
    // Private mode / blocked storage — the reveal just won't be remembered.
  }
}

/**
 * The AppGap Score card on the Profile Overview. Summarizes the diagnostic and
 * links to the full analysis (it never regenerates). When a profile edit has
 * produced a genuinely new, successfully computed score, the number animates from
 * the previous value to the new one — up or down — with a subtle directional cue
 * and a grounded "what changed" line. Respects prefers-reduced-motion, and plays
 * only once per new analysis id.
 */
export function ScoreSummary({
  analysis,
  analysisId,
  previousScore,
  changeText,
}: {
  analysis: Analysis;
  analysisId: string;
  /** The prior analysis's overall score, or null if this is the first analysis. */
  previousScore: number | null;
  /** A truthful one-liner describing the latest reassessment (from score-delta). */
  changeText: string;
}) {
  const components = analysis.componentScores;
  const change = classifyScoreChange(previousScore, analysis.gapScore);
  // Primitives the reveal effect depends on (so the dependency list is exact; the
  // `readSeen` guard, not the deps, is what prevents a replay on re-render).
  const targetScore = analysis.gapScore;
  const { material: changeMaterial, previous: changePrevious } = change;

  // `fresh` is decided once, on mount, before we mark this id as seen.
  const [fresh, setFresh] = useState(false);
  const [displayScore, setDisplayScore] = useState(analysis.gapScore);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const alreadySeen = readSeen() === analysisId;
    writeSeen(analysisId);
    if (alreadySeen) return;

    // This is the first time this browser is showing this analysis.
    setFresh(true);

    if (!changeMaterial) return; // nothing to count

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // honor reduced motion: show final value, no count-up

    const from = changePrevious ?? targetScore;
    const to = targetScore;
    const start = performance.now();
    setDisplayScore(from);

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - (1 - t) * (1 - t); // easeOutQuad
      setDisplayScore(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setDisplayScore(to);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [analysisId, targetScore, changeMaterial, changePrevious]);

  const showCue = fresh && change.material;

  return (
    <div className="space-y-2">
      <Link
        href={`/dashboard/roadmap/${analysisId}`}
        className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
      >
        <div className="flex items-center justify-between border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            AppGap Score
          </p>
          <span className="flex items-center gap-1 text-xs font-medium text-brand-teal">
            View analysis
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10">
              <div className="text-center">
                <p className="text-2xl font-bold tabular-nums text-brand-teal">
                  {displayScore}
                </p>
                <p className="text-[10px] text-muted-foreground">/ 100</p>
              </div>
            </div>
            {showCue && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold tabular-nums",
                  change.direction === "up" &&
                    "bg-brand-teal/10 text-brand-teal",
                  change.direction === "down" &&
                    "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                )}
              >
                {change.direction === "up" ? (
                  <TrendingUp className="size-3.5" />
                ) : (
                  <TrendingDown className="size-3.5" />
                )}
                {change.delta > 0 ? "+" : ""}
                {change.delta}
              </span>
            )}
          </div>
          {components ? (
            <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
              {SCORE_COMPONENTS.map((component) => {
                const score = components[component.key].score;
                return (
                  <div key={component.key} className="space-y-1.5">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-medium">
                        {component.label}
                      </span>
                      <span className="text-sm font-bold tabular-nums">
                        {score}
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-brand-teal"
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">
                      {COMPONENT_WEIGHTS[component.key]}% weight
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">
              Open your analysis to see the full breakdown.
            </p>
          )}
        </div>
      </Link>

      {/* Grounded "what changed" line — shown once, only for a genuinely new
          score relative to a previous one (and the subtle "unchanged" note when an
          edit didn't move it). Suppressed on the first-ever analysis, which has
          nothing to compare against. */}
      {fresh && previousScore != null && (
        <p
          className={cn(
            "flex items-center gap-1.5 px-1 text-xs",
            change.material && change.direction === "up"
              ? "text-brand-teal"
              : change.material && change.direction === "down"
                ? "text-amber-700 dark:text-amber-400"
                : "text-muted-foreground",
          )}
        >
          {!change.material && <Minus className="size-3.5 shrink-0" />}
          {changeText}
        </p>
      )}
    </div>
  );
}
