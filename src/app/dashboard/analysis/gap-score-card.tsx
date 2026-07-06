"use client";

import { useEffect, useRef } from "react";
import type { Analysis } from "~/lib/ai/schema";
import { cn } from "~/lib/utils";

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Developing";
  if (score >= 35) return "Building";
  return "Early Stage";
}

function getScoreLabelColor(score: number): string {
  if (score >= 75) return "text-brand-teal";
  if (score >= 50) return "text-amber-500";
  return "text-red-500 dark:text-red-400";
}

function getArcColor(score: number): string {
  if (score >= 75) return "oklch(0.55 0.1 204)"; // brand-teal
  if (score >= 50) return "oklch(0.72 0.14 75)"; // amber
  return "oklch(0.62 0.22 27)"; // red
}

function GapScoreArc({ score }: { score: number }) {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - score / 100);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start fully hidden, then animate to the target offset
    el.style.strokeDashoffset = String(circumference);
    const raf1 = requestAnimationFrame(() => {
      const raf2 = requestAnimationFrame(() => {
        el.style.strokeDashoffset = String(targetOffset);
      });
      return () => cancelAnimationFrame(raf2);
    });
    return () => cancelAnimationFrame(raf1);
  }, [circumference, targetOffset]);

  return (
    <div className="relative flex shrink-0 items-center justify-center">
      <svg
        width={128}
        height={128}
        viewBox="0 0 128 128"
        className="-rotate-90"
        aria-hidden={true}
      >
        {/* Track */}
        <circle
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={12}
          className="text-muted"
        />
        {/* Score arc */}
        <circle
          ref={circleRef}
          cx={64}
          cy={64}
          r={radius}
          fill="none"
          stroke={getArcColor(score)}
          strokeWidth={12}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold tabular-nums">{score}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

export function GapScoreCard({ analysis }: { analysis: Analysis }) {
  const label = getScoreLabel(analysis.gapScore);
  const labelColor = getScoreLabelColor(analysis.gapScore);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Gap Score
        </p>
      </div>
      <div className="flex flex-col items-center gap-6 p-6 sm:flex-row">
        <GapScoreArc score={analysis.gapScore} />
        <div className="space-y-3 text-center sm:text-left">
          <div>
            <p className={cn("text-2xl font-bold tracking-tight", labelColor)}>
              {label}
            </p>
            <p className="text-sm text-muted-foreground">
              Application Readiness
            </p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {analysis.gapScoreExplanation}
          </p>
        </div>
      </div>
    </div>
  );
}
