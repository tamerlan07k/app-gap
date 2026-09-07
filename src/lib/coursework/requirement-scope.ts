// Generic hierarchy-scope resolver — PURE. The reusable core of AppGap's
// "requirements are scoped to the exact target" guarantee.
//
// A university's expectations can attach at four levels — University → School →
// Program → Track. Given the student's exact target, this returns ONLY the rows
// that apply to that target, with specificity precedence (a more specific scope
// overrides a broader one for the same concern). It is generic over the row
// payload so the SAME algorithm can back Coursework academic requirements today
// and the future Supplemental Essays requirements — different tables, one
// correctness guarantee.
//
// THE INVARIANT (tested): a row scoped to school/program/track X is NEVER
// returned for a target whose school/program/track is different or unset. A
// requirement for Cornell Engineering can never leak onto a Cornell Arts &
// Sciences applicant.

import type { RequirementScope } from "./types";

/** The minimal shape the resolver needs; payloads extend this freely. */
export type ScopedRow = {
  scope: RequirementScope;
  schoolId: string | null;
  programId: string | null;
  trackId: string | null;
};

/** The student's target within one university (college already fixed upstream). */
export type ScopeTarget = {
  schoolId: string | null;
  programId: string | null;
  trackId: string | null;
};

const SPECIFICITY: Record<RequirementScope, number> = {
  university: 0,
  school: 1,
  program: 2,
  track: 3,
};

/**
 * Does this row apply to the target? University rows always apply (to any target
 * at that college). A narrower row applies ONLY when the target's matching id is
 * set AND equal to the row's — never otherwise. This is the no-leak guarantee.
 */
export function rowAppliesToTarget(
  row: ScopedRow,
  target: ScopeTarget,
): boolean {
  switch (row.scope) {
    case "university":
      return true;
    case "school":
      return target.schoolId != null && row.schoolId === target.schoolId;
    case "program":
      return target.programId != null && row.programId === target.programId;
    case "track":
      return target.trackId != null && row.trackId === target.trackId;
    default:
      return false;
  }
}

/** All rows that apply to the target (no dedup), preserving input order. */
export function applicableRows<T extends ScopedRow>(
  rows: T[],
  target: ScopeTarget,
): T[] {
  return rows.filter((r) => rowAppliesToTarget(r, target));
}

/**
 * Resolve the applicable rows and collapse to the MOST SPECIFIC per concern.
 * `keyOf` names the concern (e.g. subject+topic); when several scopes speak to
 * the same concern, the most specific (track > program > school > university)
 * wins — "more specific narrows/overrides broader". Ties within a scope keep the
 * first occurrence, so the result is deterministic.
 */
export function resolveScoped<T extends ScopedRow>(
  rows: T[],
  target: ScopeTarget,
  keyOf: (row: T) => string,
): T[] {
  const winners = new Map<string, T>();
  for (const row of applicableRows(rows, target)) {
    const key = keyOf(row);
    const current = winners.get(key);
    if (!current || SPECIFICITY[row.scope] > SPECIFICITY[current.scope]) {
      winners.set(key, row);
    }
  }
  return Array.from(winners.values());
}
