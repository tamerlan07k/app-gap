// My Roadmap — deterministic milestone selection, state derivation, and
// adaptation. All pure, code-only (no AI): this is what guarantees that routine
// progress updates, next-step recomputation, and profile-change adaptation never
// require another generation and never invent milestones.

import {
  MILESTONE_BY_ID,
  MILESTONE_LIBRARY,
  VALID_MILESTONE_IDS,
} from "./milestones";
import type {
  Branch,
  Importance,
  MilestoneTemplate,
  RoadmapContext,
  RoadmapMilestone,
  SavedMilestone,
} from "./types";
import { BRANCHES } from "./types";

/** Hard cap on roadmap length — keeps plans realistic, never "an excessively
 *  long plan" (spec §4). */
export const MAX_MILESTONES = 14;

const IMPORTANCE_RANK: Record<Importance, number> = {
  required: 0,
  recommended: 1,
  optional: 2,
};

const BRANCH_INDEX: Record<Branch, number> = Object.fromEntries(
  BRANCHES.map((b, i) => [b, i]),
) as Record<Branch, number>;

/** Is this template applicable to the student right now? Grade range + optional
 *  deterministic eligibility predicate. */
export function isEligible(t: MilestoneTemplate, ctx: RoadmapContext): boolean {
  if (t.grades.length > 0 && !t.grades.includes(ctx.grade)) return false;
  if (t.eligible && !t.eligible(ctx)) return false;
  return true;
}

/** Every eligible template, in the stable baseline order (branch, then order). */
export function eligibleTemplates(ctx: RoadmapContext): MilestoneTemplate[] {
  return MILESTONE_LIBRARY.filter((t) => isEligible(t, ctx)).sort(
    (a, b) =>
      BRANCH_INDEX[a.branch] - BRANCH_INDEX[b.branch] || a.order - b.order,
  );
}

/**
 * Build the stored milestone list from an explicit, ordered list of ids
 * (typically from the generation call). Invalid ids, ineligible milestones, and
 * duplicates are dropped; the result is capped. Returns null when nothing usable
 * survives, so callers can fall back deterministically.
 */
export function buildFromIds(
  ids: string[],
  ctx: RoadmapContext,
  notes: Record<string, string> = {},
): SavedMilestone[] | null {
  const seen = new Set<string>();
  const out: SavedMilestone[] = [];
  for (const id of ids) {
    if (!VALID_MILESTONE_IDS.has(id) || seen.has(id)) continue;
    const t = MILESTONE_BY_ID.get(id);
    if (!t || !isEligible(t, ctx)) continue;
    seen.add(id);
    const note = notes[id]?.trim();
    out.push({
      id,
      branch: t.branch,
      state: "upcoming",
      ...(note ? { note } : {}),
    });
    if (out.length >= MAX_MILESTONES) break;
  }
  return out.length > 0 ? out : null;
}

/** The deterministic fallback roadmap: every eligible milestone, baseline order,
 *  capped. Used when AI generation fails or returns nothing valid. */
export function deterministicRoadmap(ctx: RoadmapContext): SavedMilestone[] {
  return eligibleTemplates(ctx)
    .slice(0, MAX_MILESTONES)
    .map((t) => ({ id: t.id, branch: t.branch, state: "upcoming" as const }));
}

/** Priority of an available milestone for picking the single next step. Lower =
 *  sooner. Deadline-sensitive tasks jump forward near deadlines; then importance;
 *  then the stored order (which honors any AI prioritization as a late tiebreak). */
function nextStepSort(ctx: RoadmapContext, indexOf: Map<string, number>) {
  const urgencyBoost = (t: MilestoneTemplate): number => {
    if (!t.deadlineSensitive) return 2;
    if (ctx.urgency === "high") return 0;
    if (ctx.urgency === "medium") return 1;
    return 2;
  };
  return (a: MilestoneTemplate, b: MilestoneTemplate): number =>
    urgencyBoost(a) - urgencyBoost(b) ||
    IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
    (indexOf.get(a.id) ?? 0) - (indexOf.get(b.id) ?? 0);
}

/**
 * Hydrate a stored roadmap into renderable milestones with computed states, and
 * determine the recommended next step. Sticky states (complete, skipped) are
 * preserved; locked/current/upcoming are always derived, so progress and the
 * next step stay correct after any completion or adaptation — no AI involved.
 */
export function deriveRoadmap(
  saved: SavedMilestone[],
  ctx: RoadmapContext,
): { milestones: RoadmapMilestone[]; nextStepId: string | null } {
  const entries = saved.flatMap((s) => {
    const t = MILESTONE_BY_ID.get(s.id);
    return t ? [{ s, t }] : [];
  });

  const indexOf = new Map(entries.map((e, i) => [e.t.id, i]));
  const present = new Set(entries.map((e) => e.t.id));
  const completed = new Set(
    entries.filter((e) => e.s.state === "complete").map((e) => e.t.id),
  );

  const milestones: RoadmapMilestone[] = entries.map(({ s, t }) => {
    let state = s.state;
    if (state !== "complete" && state !== "skipped") {
      const locked = t.prerequisites.some(
        (p) => present.has(p) && !completed.has(p),
      );
      state = locked ? "locked" : "upcoming";
    }
    // Omit `eligible` (a function) — these objects are serialized to the client.
    const { eligible: _eligible, ...rest } = t;
    return { ...rest, state, note: s.note };
  });

  // The next step: the highest-priority milestone that is actionable now.
  const available = milestones.filter((m) => m.state === "upcoming");
  available.sort(nextStepSort(ctx, indexOf));
  const nextStepId = available[0]?.id ?? null;

  for (const m of milestones) {
    if (m.id === nextStepId) m.state = "current";
  }

  return { milestones, nextStepId };
}

/**
 * Deterministic adaptation after a profile/grade/deadline change. Preserves all
 * completed and manually-skipped milestones, marks any now-ineligible (and not
 * completed) milestone as skipped, adds any newly-eligible milestones that aren't
 * already present, and re-derives the next step. NEVER calls AI, never resets
 * completion, never deletes progress.
 */
export function adaptRoadmap(
  saved: SavedMilestone[],
  ctx: RoadmapContext,
): { milestones: SavedMilestone[]; nextStepId: string | null } {
  const present = new Set(saved.map((s) => s.id));

  const adapted: SavedMilestone[] = saved.flatMap((s) => {
    const t = MILESTONE_BY_ID.get(s.id);
    if (!t) return []; // template retired — drop a non-completed stale reference
    // Completed work is never changed or removed.
    if (s.state === "complete") return [s];
    // A milestone that no longer applies becomes skipped (kept, not deleted).
    if (!isEligible(t, ctx)) return [{ ...s, state: "skipped" }];
    // Still applicable: reset to a derivable state (locked/current/upcoming
    // are recomputed by deriveRoadmap); clear a prior skip if it's eligible again.
    return [{ ...s, state: "upcoming" }];
  });

  // Add newly-eligible milestones that weren't in the roadmap, respecting the cap.
  for (const t of eligibleTemplates(ctx)) {
    if (present.has(t.id)) continue;
    if (adapted.length >= MAX_MILESTONES) break;
    adapted.push({ id: t.id, branch: t.branch, state: "upcoming" });
  }

  const { nextStepId } = deriveRoadmap(adapted, ctx);
  return { milestones: adapted, nextStepId };
}

/** Progress summary for the overview header. */
export function roadmapProgress(milestones: RoadmapMilestone[]): {
  completed: number;
  total: number;
  percent: number;
} {
  // Skipped milestones don't count toward the denominator (they're N/A).
  const relevant = milestones.filter((m) => m.state !== "skipped");
  const completed = relevant.filter((m) => m.state === "complete").length;
  const total = relevant.length;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { completed, total, percent };
}
