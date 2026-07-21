"use client";

import { useId, useState } from "react";

export interface ChartPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  points: ChartPoint[];
  /** CSS color for the line/area. Defaults to the brand teal token. */
  color?: string;
  /** Optional suffix for tooltip values (e.g. " users"). */
  valueSuffix?: string;
}

const W = 800;
const H = 300;
const PAD = { top: 20, right: 20, bottom: 34, left: 44 };
const INNER_W = W - PAD.left - PAD.right;
const INNER_H = H - PAD.top - PAD.bottom;

function niceCeil(value: number): number {
  if (value <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(value));
  const frac = value / pow;
  const niceFrac = frac <= 1 ? 1 : frac <= 2 ? 2 : frac <= 5 ? 5 : 10;
  return niceFrac * pow;
}

export function LineChart({
  points,
  color = "var(--color-brand-teal)",
  valueSuffix = "",
}: LineChartProps) {
  const gradientId = useId();
  const [hover, setHover] = useState<number | null>(null);

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        No data yet.
      </div>
    );
  }

  const maxValue = Math.max(...points.map((p) => p.value));
  const yMax = niceCeil(maxValue);

  const xFor = (i: number) =>
    points.length === 1
      ? PAD.left + INNER_W / 2
      : PAD.left + (INNER_W * i) / (points.length - 1);
  const yFor = (v: number) => PAD.top + INNER_H - (INNER_H * v) / yMax;

  const coords = points.map((p, i) => ({ x: xFor(i), y: yFor(p.value), p }));
  const linePath = coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");
  const areaPath =
    `M ${coords[0].x} ${PAD.top + INNER_H} ` +
    coords.map((c) => `L ${c.x} ${c.y}`).join(" ") +
    ` L ${coords[coords.length - 1].x} ${PAD.top + INNER_H} Z`;

  // Y-axis ticks (5 evenly spaced lines).
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    v: Math.round(yMax * f),
    y: yFor(yMax * f),
  }));

  // Show a readable subset of x labels.
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Chart"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Horizontal gridlines + y labels */}
      {yTicks.map((t) => (
        <g key={t.y}>
          <line
            x1={PAD.left}
            y1={t.y}
            x2={W - PAD.right}
            y2={t.y}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text
            x={PAD.left - 8}
            y={t.y + 4}
            textAnchor="end"
            className="fill-muted-foreground text-[11px]"
          >
            {t.v}
          </text>
        </g>
      ))}

      {/* Area + line */}
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Points */}
      {coords.map((c, i) => (
        <circle
          key={c.p.label}
          cx={c.x}
          cy={c.y}
          r={hover === i ? 5 : 3.5}
          fill={color}
          stroke="var(--color-card)"
          strokeWidth={2}
        />
      ))}

      {/* X labels */}
      {coords.map((c, i) =>
        i % labelStep === 0 || i === coords.length - 1 ? (
          <text
            key={`x-${c.p.label}`}
            x={c.x}
            y={H - 12}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {c.p.label}
          </text>
        ) : null,
      )}

      {/* Hover guide + tooltip */}
      {hover !== null && (
        <g pointerEvents="none">
          <line
            x1={coords[hover].x}
            y1={PAD.top}
            x2={coords[hover].x}
            y2={PAD.top + INNER_H}
            stroke={color}
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.5}
          />
          <TooltipBox
            x={coords[hover].x}
            y={coords[hover].y}
            label={coords[hover].p.label}
            value={`${coords[hover].p.value}${valueSuffix}`}
          />
        </g>
      )}

      {/* Invisible hit bands for hover detection */}
      {coords.map((c, i) => {
        const bandW = INNER_W / Math.max(1, points.length);
        return (
          // biome-ignore lint/a11y/noStaticElementInteractions: decorative hover hit-area for the chart tooltip; not keyboard-interactive by design
          <rect
            key={`hit-${c.p.label}`}
            x={c.x - bandW / 2}
            y={PAD.top}
            width={bandW}
            height={INNER_H}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          />
        );
      })}
    </svg>
  );
}

function TooltipBox({
  x,
  y,
  label,
  value,
}: {
  x: number;
  y: number;
  label: string;
  value: string;
}) {
  const boxW = Math.max(90, label.length * 7 + 24, value.length * 7 + 24);
  const boxH = 40;
  // Clamp horizontally so the box stays inside the chart.
  const left = Math.min(Math.max(x - boxW / 2, PAD.left), W - PAD.right - boxW);
  const top = Math.max(y - boxH - 12, PAD.top);
  return (
    <g>
      <rect
        x={left}
        y={top}
        width={boxW}
        height={boxH}
        rx={8}
        className="fill-popover stroke-border"
        strokeWidth={1}
      />
      <text
        x={left + boxW / 2}
        y={top + 17}
        textAnchor="middle"
        className="fill-foreground text-[12px] font-semibold"
      >
        {value}
      </text>
      <text
        x={left + boxW / 2}
        y={top + 31}
        textAnchor="middle"
        className="fill-muted-foreground text-[10px]"
      >
        {label}
      </text>
    </g>
  );
}
