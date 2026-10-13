"use client";

// The four-branch roadmap overview. A left trunk/spine runs down through four
// connected branch lanes (Academics, Essays, Awards, Activities); each lane lays
// its milestones out as circular nodes joined by curved connectors. Completed
// nodes show a check, the current node is visually prominent, future nodes are
// muted, and every node's status is conveyed with an icon + text (never color
// alone). Fully responsive: lanes stack and each node row scrolls rather than
// forcing a fixed desktop-only diagram.

import {
  Award,
  Check,
  GraduationCap,
  Lock,
  type LucideIcon,
  PenLine,
  Play,
  Users,
} from "lucide-react";
import type { CSSProperties } from "react";
import type { Branch, RoadmapMilestone } from "~/lib/roadmap/types";
import { BRANCHES } from "~/lib/roadmap/types";
import { cn } from "~/lib/utils";

/** Branch accent colors as CSS custom properties — AppGap-harmonized hues (teal
 *  through indigo/violet). Set on a container; referenced as var(--rm-…). Shared
 *  by the loader, the graph, and the detail panel so branch identity is
 *  consistent everywhere. */
export const BRANCH_COLOR_VARS: CSSProperties = {
  ["--rm-acad" as string]: "oklch(0.62 0.11 200)",
  ["--rm-essay" as string]: "oklch(0.6 0.13 250)",
  ["--rm-award" as string]: "oklch(0.6 0.15 300)",
  ["--rm-activ" as string]: "oklch(0.58 0.13 275)",
};

export const BRANCH_META: Record<
  Branch,
  { label: string; cssVar: string; Icon: LucideIcon }
> = {
  academics: {
    label: "Academics",
    cssVar: "var(--rm-acad)",
    Icon: GraduationCap,
  },
  essays: { label: "Essays", cssVar: "var(--rm-essay)", Icon: PenLine },
  awards: { label: "Awards", cssVar: "var(--rm-award)", Icon: Award },
  activities: { label: "Activities", cssVar: "var(--rm-activ)", Icon: Users },
};

/** Human, non-color status label (announced to screen readers + shown as text). */
export function stateLabel(state: RoadmapMilestone["state"]): string {
  switch (state) {
    case "complete":
      return "Completed";
    case "current":
      return "Current step";
    case "in_progress":
      return "In progress";
    case "locked":
      return "Locked";
    case "skipped":
      return "Not applicable";
    default:
      return "Upcoming";
  }
}

function NodeIcon({
  state,
  index,
  cssVar,
}: {
  state: RoadmapMilestone["state"];
  index: number;
  cssVar: string;
}) {
  if (state === "complete") return <Check className="size-5" aria-hidden />;
  if (state === "current") return <Play className="size-4" aria-hidden />;
  if (state === "locked")
    return <Lock className="size-4 text-muted-foreground" aria-hidden />;
  return (
    <span
      className="text-sm font-semibold tabular-nums"
      style={{ color: cssVar }}
    >
      {index + 1}
    </span>
  );
}

function MilestoneNode({
  milestone,
  index,
  preview,
  onSelect,
}: {
  milestone: RoadmapMilestone;
  index: number;
  preview: boolean;
  onSelect: (m: RoadmapMilestone) => void;
}) {
  const { cssVar } = BRANCH_META[milestone.branch];
  const { state } = milestone;
  const isComplete = state === "complete";
  const isCurrent = state === "current";
  const isMuted =
    state === "upcoming" || state === "locked" || state === "skipped";

  return (
    <div className="flex w-24 shrink-0 flex-col items-center gap-1.5 text-center">
      <button
        type="button"
        disabled={preview}
        onClick={() => onSelect(milestone)}
        aria-label={`${milestone.title} — ${stateLabel(state)}`}
        className={cn(
          "flex size-12 items-center justify-center rounded-full border-2 transition-all",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
          !preview && "hover:scale-105 cursor-pointer",
          preview && "cursor-default",
          isComplete && "border-transparent text-white",
          isCurrent && "scale-110 ring-2 ring-offset-2 ring-offset-background",
          state === "in_progress" && "border-dashed",
          isMuted && !isComplete && "bg-card",
          state === "skipped" && "opacity-50",
        )}
        style={{
          borderColor: isComplete ? undefined : cssVar,
          backgroundColor: isComplete ? cssVar : undefined,
          ...(isCurrent
            ? ({ ["--tw-ring-color" as string]: cssVar } as CSSProperties)
            : {}),
        }}
      >
        <NodeIcon state={state} index={index} cssVar={cssVar} />
      </button>
      <span
        className={cn(
          "line-clamp-2 text-[11px] leading-tight",
          isCurrent ? "font-semibold text-foreground" : "text-muted-foreground",
          state === "skipped" && "line-through",
        )}
      >
        {milestone.title}
      </span>
      {isCurrent && (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: cssVar }}
        >
          Next
        </span>
      )}
    </div>
  );
}

/** A curved SVG connector drawn between two nodes in a lane. */
function Connector({ color }: { color: string }) {
  return (
    <svg
      className="mt-6 h-6 w-8 shrink-0"
      viewBox="0 0 32 24"
      fill="none"
      role="presentation"
      aria-hidden="true"
    >
      <path
        d="M 2 12 C 12 12, 20 12, 30 12"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="1 5"
        opacity="0.5"
      />
    </svg>
  );
}

function BranchLane({
  branch,
  milestones,
  preview,
  onSelect,
}: {
  branch: Branch;
  milestones: RoadmapMilestone[];
  preview: boolean;
  onSelect: (m: RoadmapMilestone) => void;
}) {
  const { label, cssVar, Icon } = BRANCH_META[branch];
  const done = milestones.filter((m) => m.state === "complete").length;
  const relevant = milestones.filter((m) => m.state !== "skipped").length;

  return (
    <div className="relative pl-6">
      {/* Node on the trunk spine */}
      <span
        className="absolute left-[-6px] top-1.5 size-3 rounded-full ring-4 ring-background"
        style={{ backgroundColor: cssVar }}
        aria-hidden
      />
      <div className="mb-3 flex items-center gap-2">
        <Icon className="size-4" style={{ color: cssVar }} aria-hidden />
        <h3 className="text-sm font-semibold" style={{ color: cssVar }}>
          {label}
        </h3>
        <span className="text-xs text-muted-foreground">
          {milestones.length === 0
            ? "Nothing needed right now"
            : `${done}/${relevant} done`}
        </span>
      </div>

      {milestones.length === 0 ? (
        <p className="pb-2 text-xs text-muted-foreground">
          No {label.toLowerCase()} milestones apply to your situation right now.
        </p>
      ) : (
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {milestones.map((m, i) => (
            <div key={m.id} className="flex items-start">
              <MilestoneNode
                milestone={m}
                index={i}
                preview={preview}
                onSelect={onSelect}
              />
              {i < milestones.length - 1 && <Connector color={cssVar} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RoadmapGraph({
  milestones,
  preview = false,
  onSelect,
}: {
  milestones: RoadmapMilestone[];
  preview?: boolean;
  onSelect: (m: RoadmapMilestone) => void;
}) {
  return (
    <div
      className="relative rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"
      style={BRANCH_COLOR_VARS}
    >
      {/* The trunk: a vertical spine linking the four branch lanes. */}
      <div
        className="absolute bottom-6 left-5 top-6 w-px bg-gradient-to-b from-brand-teal/40 via-border to-border sm:left-6"
        aria-hidden
      />
      <div className="relative space-y-7">
        {BRANCHES.map((branch) => (
          <BranchLane
            key={branch}
            branch={branch}
            milestones={milestones.filter((m) => m.branch === branch)}
            preview={preview}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
