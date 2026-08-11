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

// Single-color fallback used only for legacy analyses that carry no component
// scores (the overall ring can't be segmented without them).
function getArcColor(score: number): string {
  if (score >= 75) return "oklch(0.55 0.1 204)"; // brand-teal
  if (score >= 50) return "oklch(0.72 0.14 75)"; // amber
  return "oklch(0.62 0.22 27)"; // red
}

// One color per diagnostic component, used consistently by the segmented overall
// ring, its legend, and each component gauge — so a color always means the same
// component across the card. Chosen for distinct hues that read in light + dark.
const COMPONENT_COLORS: Record<ComponentKey, string> = {
  academics: "oklch(0.58 0.11 200)", // teal
  activities: "oklch(0.55 0.15 260)", // blue / indigo
  awards: "oklch(0.75 0.14 75)", // amber
};

// The three visible diagnostic components, in weight order.
const COMPONENT_META: { key: ComponentKey; label: string }[] = [
  { key: "academics", label: "Academics" },
  { key: "activities", label: "Activities" },
  { key: "awards", label: "Awards" },
];

// Animated single-color circular progress arc. Used for the component gauges and
// as the legacy fallback for the overall ring. `color` overrides the score-based
// color (component gauges pass their component color).
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

// Overall AppGap ring segmented by component. The filled arc still equals the
// score (it does NOT wrap the full circle) — it's just split into one colored
// segment per component, each sized by that component's weighted contribution
// (weight × score), so the three segments add up exactly to the overall score.
function SegmentedScoreRing({
  segments,
  size,
  strokeWidth,
  children,
}: {
  segments: { key: ComponentKey; color: string; contribution: number }[];
  size: number;
  strokeWidth: number;
  children: ReactNode;
}) {
  const center = size / 2;
  const radius = center - strokeWidth;
  const circumference = 2 * Math.PI * radius;

  // Lay each segment end-to-end from the top (12 o'clock, after the -90 rotation)
  // going clockwise. Contribution is in score points (0–100), so a fraction of
  // the circumference. Their sum equals the overall score → the ring fills to it.
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const len = (seg.contribution / 100) * circumference;
    const start = (cumulative / 100) * circumference;
    cumulative += seg.contribution;
    return { key: seg.key, color: seg.color, len, start };
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
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="butt"
            strokeDasharray={`${arc.len} ${circumference - arc.len}`}
            strokeDashoffset={-arc.start}
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
      <p className="text-sm font-semibold">{label}</p>
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

  // Weighted contribution per component (weight × score) — sums to the overall
  // score. Null for legacy analyses, which fall back to a single-color ring.
  const segments = components
    ? COMPONENT_META.map(({ key }) => ({
        key,
        color: COMPONENT_COLORS[key],
        contribution: (COMPONENT_WEIGHTS[key] / 100) * components[key].score,
      }))
    : null;

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
          {segments ? (
            <SegmentedScoreRing segments={segments} size={128} strokeWidth={12}>
              <span className="text-3xl font-bold tabular-nums">
                {analysis.gapScore}
              </span>
              <span className="text-xs text-muted-foreground">/ 100</span>
            </SegmentedScoreRing>
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
            {/* Legend — identifies which color in the ring is which component. */}
            {segments && (
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 sm:justify-start">
                {COMPONENT_META.map(({ key, label: componentLabel }) => (
                  <span
                    key={key}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: COMPONENT_COLORS[key] }}
                      aria-hidden={true}
                    />
                    {componentLabel}
                  </span>
                ))}
              </div>
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
                  color={COMPONENT_COLORS[key]}
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
