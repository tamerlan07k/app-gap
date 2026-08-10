"use client";

import { type ReactNode, useEffect, useRef } from "react";
import type { Analysis } from "~/lib/ai/schema";
import { COMPONENT_WEIGHTS, type ComponentKey } from "~/lib/ai/score";
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

// Animated circular progress arc, sized by `size`. Used for both the overall
// score (large) and each of the three components (small).
function ScoreArc({
  score,
  size,
  strokeWidth,
  children,
}: {
  score: number;
  size: number;
  strokeWidth: number;
  children: ReactNode;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const targetOffset = circumference * (1 - score / 100);

  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
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
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        aria-hidden={true}
      >
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        <circle
          ref={circleRef}
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={getArcColor(score)}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          style={{
            transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">{children}</div>
    </div>
  );
}

// The three visible diagnostic components, in weight order.
const COMPONENT_META: { key: ComponentKey; label: string }[] = [
  { key: "academics", label: "Academics" },
  { key: "activities", label: "Activities" },
  { key: "awards", label: "Awards" },
];

function ComponentGauge({
  label,
  weight,
  score,
}: {
  label: string;
  weight: number;
  score: number;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <ScoreArc score={score} size={76} strokeWidth={8}>
        <span className="text-lg font-bold tabular-nums">{score}</span>
      </ScoreArc>
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{weight}% weight</p>
      </div>
    </div>
  );
}

export function GapScoreCard({
  analysis,
  compact = false,
}: {
  analysis: Analysis;
  compact?: boolean;
}) {
  const label = getScoreLabel(analysis.gapScore);
  const labelColor = getScoreLabelColor(analysis.gapScore);
  const components = analysis.componentScores;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          AppGap Score
        </p>
      </div>
      <div className="space-y-6 p-6">
        {/* Overall score */}
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreArc score={analysis.gapScore} size={128} strokeWidth={12}>
            <span className="text-3xl font-bold tabular-nums">
              {analysis.gapScore}
            </span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </ScoreArc>
          <div className="space-y-3 text-center sm:text-left">
            <div>
              <p
                className={cn("text-2xl font-bold tracking-tight", labelColor)}
              >
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

        {/* Three diagnostic components (V2). Only present on analyses that carry
            component scores; legacy analyses show the overall arc alone. */}
        {components && (
          <div className="space-y-5 border-t border-border pt-6">
            <div className="grid grid-cols-3 gap-4">
              {COMPONENT_META.map(({ key, label: componentLabel }) => (
                <ComponentGauge
                  key={key}
                  label={componentLabel}
                  weight={COMPONENT_WEIGHTS[key]}
                  score={components[key].score}
                />
              ))}
            </div>
            {!compact && (
              <div className="space-y-2">
                {COMPONENT_META.map(({ key, label: componentLabel }) => (
                  <p
                    key={key}
                    className="text-xs leading-relaxed text-muted-foreground"
                  >
                    <span className="font-medium text-foreground">
                      {componentLabel}:
                    </span>{" "}
                    {components[key].explanation}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
