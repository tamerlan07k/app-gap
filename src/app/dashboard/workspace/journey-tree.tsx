"use client";

// The roadmap as ONE connected tree (matching the reference): a horizontal trunk
// of foundation nodes → a glowing current node → curved paths that fan out to the
// four labeled application branches, each continuing as a row of milestone nodes.
// Rendered as a single scalable SVG (scrolls horizontally on small screens),
// themed with AppGap tokens. Nodes are focusable/clickable; status is conveyed by
// glyph + an accessible label, never color alone.

import type { KeyboardEvent } from "react";
import {
  FOUNDATION_STEPS,
  type FoundationState,
  type FoundationStepId,
} from "~/lib/roadmap/foundation";
import type { Branch, RoadmapMilestone } from "~/lib/roadmap/types";
import { BRANCHES } from "~/lib/roadmap/types";
import { BRANCH_COLOR_VARS, BRANCH_META } from "./roadmap-graph";

// ─── Layout constants (SVG user units) ───────────────────────────────────────
const TRUNK_Y = 282;
const F_START_X = 70;
const F_GAP = 122;
const RF = 30; // foundation node radius
const BRANCH_START_X = 664;
const B_GAP = 116;
const RB = 24; // branch node radius
const BRANCH_Y = [84, 216, 348, 480]; // 4 branches, spread around TRUNK_Y
const VIEW_H = 564;

type NodeVisual =
  | "complete"
  | "current"
  | "upcoming"
  | "locked"
  | "attention"
  | "skipped";

function truncate(s: string, n = 16): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// ─── Glyphs drawn as SVG paths (match the reference: check / play / lock) ─────
function Glyph({
  visual,
  cx,
  cy,
  color,
  label,
}: {
  visual: NodeVisual;
  cx: number;
  cy: number;
  color: string;
  label: string;
}) {
  if (visual === "complete") {
    return (
      <path
        d={`M ${cx - 9} ${cy} l 6 6 l 12 -13`}
        fill="none"
        stroke="#fff"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    );
  }
  if (visual === "current") {
    return (
      <path
        d={`M ${cx - 6} ${cy - 9} L ${cx + 10} ${cy} L ${cx - 6} ${cy + 9} Z`}
        fill="#fff"
      />
    );
  }
  if (visual === "locked") {
    return (
      <g stroke={color} strokeWidth="2" fill="none" opacity="0.7">
        <rect
          x={cx - 7}
          y={cy - 2}
          width="14"
          height="11"
          rx="2"
          fill={color}
          stroke="none"
        />
        <path d={`M ${cx - 4} ${cy - 2} v -3 a 4 4 0 0 1 8 0 v 3`} />
      </g>
    );
  }
  if (visual === "attention") {
    return (
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="22"
        fontWeight="700"
        fill={color}
      >
        !
      </text>
    );
  }
  // upcoming / skipped → the ordinal label
  return (
    <text
      x={cx}
      y={cy}
      textAnchor="middle"
      dominantBaseline="central"
      fontSize="16"
      fontWeight="600"
      fill={color}
      opacity={visual === "skipped" ? 0.5 : 1}
    >
      {label}
    </text>
  );
}

function TreeNode({
  cx,
  cy,
  r,
  visual,
  color,
  glyphLabel,
  title,
  caption,
  ariaLabel,
  disabled,
  onActivate,
}: {
  cx: number;
  cy: number;
  r: number;
  visual: NodeVisual;
  color: string;
  glyphLabel: string;
  title: string;
  caption?: string;
  ariaLabel: string;
  disabled?: boolean;
  onActivate?: () => void;
}) {
  const filled = visual === "complete" || visual === "current";
  const onKey = (e: KeyboardEvent) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onActivate?.();
    }
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: an SVG <g> cannot be a native <button>; role + tabIndex + keyboard handler provide the semantics.
    <g
      className="jt-node"
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onActivate}
      onKeyDown={onKey}
      style={{ cursor: disabled ? "default" : "pointer" }}
    >
      {/* Glow halo for the current node */}
      {visual === "current" && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 10}
          fill={color}
          opacity="0.18"
          className="jt-pulse"
        />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={filled ? color : "var(--color-card)"}
        stroke={
          visual === "upcoming" || visual === "locked" || visual === "skipped"
            ? color
            : visual === "attention"
              ? "#f59e0b"
              : color
        }
        strokeWidth={visual === "current" ? 3 : 2}
        strokeDasharray={visual === "locked" ? "4 4" : undefined}
        opacity={visual === "skipped" ? 0.5 : 1}
      />
      {visual === "current" && (
        <circle
          cx={cx}
          cy={cy}
          r={r + 4}
          fill="none"
          stroke={color}
          strokeWidth="2"
          opacity="0.5"
        />
      )}
      <Glyph
        visual={visual}
        cx={cx}
        cy={cy}
        color={visual === "attention" ? "#f59e0b" : color}
        label={glyphLabel}
      />

      {/* Title under the node */}
      <text
        x={cx}
        y={cy + r + 16}
        textAnchor="middle"
        fontSize="12"
        fontWeight={visual === "current" ? 700 : 500}
        fill={
          visual === "current"
            ? "var(--color-foreground)"
            : "var(--color-muted-foreground)"
        }
      >
        {truncate(title)}
      </text>
      {caption && (
        <text
          x={cx}
          y={cy + r + 31}
          textAnchor="middle"
          fontSize="10.5"
          fontWeight="600"
          fill={caption === "Needs info" ? "#d97706" : color}
        >
          {caption}
        </text>
      )}
      {visual === "current" && (
        <g>
          <rect
            x={cx - 20}
            y={cy - r - 26}
            width="40"
            height="18"
            rx="9"
            fill={color}
          />
          <text
            x={cx}
            y={cy - r - 17}
            textAnchor="middle"
            fontSize="10.5"
            fontWeight="700"
            fill="#fff"
          >
            Next
          </text>
        </g>
      )}
    </g>
  );
}

function foundationVisual(
  status: FoundationState["steps"][FoundationStepId],
  isCurrent: boolean,
): NodeVisual {
  if (status === "complete") return "complete";
  if (status === "attention") return "attention";
  if (status === "locked") return "locked";
  // "ready": only the first actionable step glows as the current node; other
  // ready-but-not-first steps are plain upcoming (still clickable).
  return isCurrent ? "current" : "upcoming";
}

function foundationCaption(
  status: FoundationState["steps"][FoundationStepId],
): string {
  if (status === "complete") return "Good to go";
  if (status === "attention") return "Needs info";
  if (status === "ready") return "Start here";
  return "Locked";
}

function milestoneVisual(m: RoadmapMilestone): NodeVisual {
  if (m.state === "complete") return "complete";
  if (m.state === "current") return "current";
  if (m.state === "locked") return "locked";
  if (m.state === "skipped") return "skipped";
  return "upcoming";
}

export function JourneyTree({
  foundation,
  journeyStarted,
  milestones,
  onFoundationSelect,
  onMilestoneSelect,
}: {
  foundation: FoundationState;
  journeyStarted: boolean;
  milestones: RoadmapMilestone[];
  onFoundationSelect: (id: FoundationStepId) => void;
  onMilestoneSelect: (m: RoadmapMilestone) => void;
}) {
  // Group branch milestones (empty before the journey starts).
  const byBranch: Record<Branch, RoadmapMilestone[]> = {
    academics: [],
    essays: [],
    awards: [],
    activities: [],
  };
  for (const m of milestones) byBranch[m.branch].push(m);

  const maxNodes = Math.max(1, ...BRANCHES.map((b) => byBranch[b].length));
  const viewW = Math.max(1040, BRANCH_START_X + maxNodes * B_GAP + 40);

  const branchPointX = F_START_X + 3 * F_GAP;
  const labelX = (branchPointX + BRANCH_START_X) / 2;

  // The single glowing "current" foundation step = the first actionable one.
  const currentFoundationId = FOUNDATION_STEPS.find(
    (s) =>
      foundation.steps[s.id] === "ready" ||
      foundation.steps[s.id] === "attention",
  )?.id;

  return (
    <div
      className="overflow-x-auto rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-4"
      style={BRANCH_COLOR_VARS}
    >
      <style>{`
        .jt-node:focus-visible { outline: none; }
        .jt-node:focus-visible > circle:nth-of-type(1) { stroke: var(--color-brand-teal); }
        .jt-pulse { animation: jt-pulse 2.4s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes jt-pulse { 0%,100% { opacity:.14; transform:scale(1);} 50% { opacity:.28; transform:scale(1.08);} }
        @media (prefers-reduced-motion: reduce) { .jt-pulse { animation: none; } }
      `}</style>
      {/* biome-ignore lint/a11y/useSemanticElements: an <svg> is the diagram container; role="group" labels the set of interactive nodes within it. */}
      <svg
        viewBox={`0 0 ${viewW} ${VIEW_H}`}
        width="100%"
        style={{ minWidth: 760, height: "auto", display: "block" }}
        role="group"
        aria-label="Your application roadmap"
      >
        {/* ── Trunk connectors (foundation) ── */}
        {FOUNDATION_STEPS.slice(0, 3).map((step, i) => {
          const prevComplete = foundation.steps[step.id] === "complete";
          const x1 = F_START_X + i * F_GAP + RF;
          const x2 = F_START_X + (i + 1) * F_GAP - RF;
          return (
            <line
              key={`trunk-${step.id}`}
              x1={x1}
              y1={TRUNK_Y}
              x2={x2}
              y2={TRUNK_Y}
              stroke={
                prevComplete ? "var(--color-brand-teal)" : "var(--color-border)"
              }
              strokeWidth="3"
              strokeLinecap="round"
            />
          );
        })}

        {/* ── Branch curves fanning from the "Begin" node ── */}
        {BRANCHES.map((branch, j) => {
          const by = BRANCH_Y[j];
          const { cssVar } = BRANCH_META[branch];
          const active = journeyStarted;
          return (
            <path
              key={`curve-${branch}`}
              d={`M ${branchPointX + RF - 4} ${TRUNK_Y} C ${labelX} ${TRUNK_Y}, ${labelX} ${by}, ${BRANCH_START_X - RB - 2} ${by}`}
              fill="none"
              stroke={active ? cssVar : "var(--color-border)"}
              strokeWidth="3"
              strokeLinecap="round"
              opacity={active ? 0.9 : 0.5}
            />
          );
        })}

        {/* ── Branch node connectors ── */}
        {BRANCHES.map((branch, j) => {
          const by = BRANCH_Y[j];
          const { cssVar } = BRANCH_META[branch];
          const nodes = byBranch[branch];
          return nodes.slice(0, -1).map((m, k) => {
            const x1 = BRANCH_START_X + k * B_GAP + RB;
            const x2 = BRANCH_START_X + (k + 1) * B_GAP - RB;
            const nextLocked = nodes[k + 1]?.state === "locked";
            return (
              <line
                key={`bc-${branch}-${m.id}`}
                x1={x1}
                y1={by}
                x2={x2}
                y2={by}
                stroke={cssVar}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray={nextLocked ? "4 4" : undefined}
                opacity="0.7"
              />
            );
          });
        })}

        {/* ── START pill ── */}
        <g>
          <rect
            x={F_START_X - 34}
            y={TRUNK_Y - RF - 34}
            width="68"
            height="22"
            rx="11"
            fill="var(--color-brand-teal)"
          />
          <text
            x={F_START_X}
            y={TRUNK_Y - RF - 23}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            letterSpacing="1"
            fill="#fff"
          >
            START
          </text>
        </g>

        {/* ── Foundation nodes ── */}
        {FOUNDATION_STEPS.map((step, i) => {
          const status = foundation.steps[step.id];
          const visual = foundationVisual(
            status,
            step.id === currentFoundationId,
          );
          return (
            <TreeNode
              key={step.id}
              cx={F_START_X + i * F_GAP}
              cy={TRUNK_Y}
              r={RF}
              visual={visual}
              color="var(--color-brand-teal)"
              glyphLabel={String(i + 1)}
              title={step.title}
              caption={foundationCaption(status)}
              ariaLabel={`${step.title} — ${foundationCaption(status)}`}
              disabled={status === "locked"}
              onActivate={() => onFoundationSelect(step.id)}
            />
          );
        })}

        {/* ── Branch labels + nodes ── */}
        {BRANCHES.map((branch, j) => {
          const by = BRANCH_Y[j];
          const { cssVar, label } = BRANCH_META[branch];
          const nodes = byBranch[branch];
          const active = journeyStarted;
          return (
            <g key={`branch-${branch}`}>
              {/* Label pill on the curve */}
              <rect
                x={labelX - 56}
                y={by - 15}
                width="112"
                height="30"
                rx="15"
                fill="var(--color-card)"
                stroke={active ? cssVar : "var(--color-border)"}
                strokeWidth="1.5"
              />
              <text
                x={labelX}
                y={by}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="13.5"
                fontWeight="600"
                fill={active ? cssVar : "var(--color-muted-foreground)"}
              >
                {label}
              </text>

              {active && nodes.length > 0 ? (
                nodes.map((m, k) => {
                  const visual = milestoneVisual(m);
                  return (
                    <TreeNode
                      key={m.id}
                      cx={BRANCH_START_X + k * B_GAP}
                      cy={by}
                      r={RB}
                      visual={visual}
                      color={cssVar}
                      glyphLabel={String(k + 1)}
                      title={m.title}
                      ariaLabel={`${label}: ${m.title} — ${visual}`}
                      onActivate={() => onMilestoneSelect(m)}
                    />
                  );
                })
              ) : (
                // Pre-journey (or empty branch): a single muted stub node.
                <g>
                  <circle
                    cx={BRANCH_START_X}
                    cy={by}
                    r={RB}
                    fill="var(--color-card)"
                    stroke="var(--color-border)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <Glyph
                    visual="locked"
                    cx={BRANCH_START_X}
                    cy={by}
                    color="var(--color-muted-foreground)"
                    label=""
                  />
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
