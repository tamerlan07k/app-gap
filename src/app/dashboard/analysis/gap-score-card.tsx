"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
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

// Distinct colour per diagnostic component — used both for the segments of the
// overall ring and for each component's own gauge, so the two read as one system.
const COMPONENT_COLORS: Record<ComponentKey, string> = {
  academics: "oklch(0.55 0.1 204)", // teal
  activities: "oklch(0.58 0.15 275)", // indigo
  awards: "oklch(0.72 0.14 75)", // amber
};

// The three visible diagnostic components, in weight order.
const COMPONENT_META: { key: ComponentKey; label: string }[] = [
  { key: "academics", label: "Academics" },
  { key: "activities", label: "Activities" },
  { key: "awards", label: "Awards" },
];

// Single-colour animated progress arc — used for each component gauge (and as
// the overall fallback for legacy analyses with no component scores).
function ScoreArc({
  score,
  size,
  strokeWidth,
  color,
  children,
}: {
  score: number;
  size: number;
  strokeWidth: number;
  color?: string;
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
          stroke={color ?? getArcColor(score)}
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

// Overall AppGap ring, segmented by each component's WEIGHTED CONTRIBUTION to the
// score. The filled arc equals the overall score (not a full circle); within it,
// each coloured segment's length is proportional to weight·componentScore, so the
// ring literally shows what the score is built from.
function SegmentedScoreArc({
  gapScore,
  componentScores,
  size,
  strokeWidth,
  children,
}: {
  gapScore: number;
  componentScores: Record<ComponentKey, number>;
  size: number;
  strokeWidth: number;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;
  const fillFraction = Math.max(0, Math.min(1, gapScore / 100));

  // Weighted contribution (in points) of each component to the overall score.
  const contributions = COMPONENT_META.map(
    ({ key }) => (COMPONENT_WEIGHTS[key] / 100) * componentScores[key],
  );
  const totalContribution = contributions.reduce((a, b) => a + b, 0);

  // Split the filled arc among the components in proportion to their weighted
  // contribution. Guard against an all-zero profile.
  let cursor = 0;
  const segments = COMPONENT_META.map(({ key }, i) => {
    const share =
      totalContribution > 0 ? contributions[i] / totalContribution : 0;
    const fraction = share * fillFraction;
    const start = cursor;
    cursor += fraction;
    return {
      key,
      color: COMPONENT_COLORS[key],
      length: fraction * circumference,
      offset: -start * circumference,
    };
  });

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
        {segments.map((seg) => (
          <circle
            key={seg.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${mounted ? seg.length : 0} ${circumference}`}
            strokeDashoffset={seg.offset}
            style={{
              transition: "stroke-dasharray 1.1s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center">{children}</div>
    </div>
  );
}

function ComponentGauge({
  label,
  score,
  color,
}: {
  label: string;
  score: number;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <ScoreArc score={score} size={76} strokeWidth={8} color={color}>
        <span className="text-lg font-bold tabular-nums">{score}</span>
      </ScoreArc>
      <div className="flex items-center gap-1.5">
        <span
          className="size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden={true}
        />
        <p className="text-sm font-semibold">{label}</p>
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

  const componentScoreMap = components
    ? {
        academics: components.academics.score,
        activities: components.activities.score,
        awards: components.awards.score,
      }
    : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          AppGap Score
        </p>
      </div>
      <div className="space-y-6 p-6">
        {/* Overall score — segmented by weighted contribution when component
            scores exist; single arc for legacy analyses. */}
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          {componentScoreMap ? (
            <SegmentedScoreArc
              gapScore={analysis.gapScore}
              componentScores={componentScoreMap}
              size={128}
              strokeWidth={12}
            >
              <span className="text-3xl font-bold tabular-nums">
                {analysis.gapScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </SegmentedScoreArc>
          ) : (
            <ScoreArc score={analysis.gapScore} size={128} strokeWidth={12}>
              <span className="text-3xl font-bold tabular-nums">
                {analysis.gapScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </ScoreArc>
          )}
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
            {componentScoreMap && (
              <p className="text-xs text-muted-foreground/80">
                Ring segments show each area’s weighted contribution to your
                score.
              </p>
            )}
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
                  score={components[key].score}
                  color={COMPONENT_COLORS[key]}
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
