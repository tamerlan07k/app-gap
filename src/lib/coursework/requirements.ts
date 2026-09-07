// Coursework requirements — PURE. Turns verified `college_academic_requirements`
// rows into scope-correct VerifiedExpectations for the student's exact target,
// and overlays them onto the deterministic findings as ADDITIVE annotations.
//
// Two hard rules:
//   1. Scope correctness is delegated to the generic resolver, so a requirement
//      for one school/program/track can never appear for a different one.
//   2. The overlay NEVER changes a finding's status. Availability still decides
//      strength/opportunity/unavailable/unknown/gap — a matched requirement only
//      adds context. So an unavailable or unknown area can never become a gap
//      just because a requirement matched it.

import {
  resolveScoped,
  type ScopedRow,
  type ScopeTarget,
} from "./requirement-scope";
import type {
  Finding,
  Importance,
  PreparationArea,
  SubjectArea,
  VerifiedExpectation,
} from "./types";

/** A verified requirement row (camelCase mapping of the DB table). */
export type CollegeAcademicRequirement = ScopedRow & {
  requirementType: "required" | "recommended";
  subjectArea: SubjectArea;
  topic: string | null;
  label: string;
  sourceUrl: string;
};

const IMPORTANCE_FOR: Record<
  CollegeAcademicRequirement["requirementType"],
  Importance
> = {
  required: "core",
  recommended: "recommended",
};

/**
 * Resolve verified requirement rows to the scope-correct set for a target and map
 * them to VerifiedExpectations. Collapses to the most specific per (subject,
 * topic). Returns [] when there are no applicable verified rows (today's reality
 * for every target — never fabricated).
 */
export function resolveRequirements(
  rows: CollegeAcademicRequirement[],
  target: ScopeTarget,
): VerifiedExpectation[] {
  const resolved = resolveScoped(
    rows,
    target,
    (r) => `${r.subjectArea}:${r.topic ?? ""}`,
  );
  return resolved.map((r) => ({
    scope: r.scope,
    requirementType: r.requirementType,
    label: r.label,
    subjectArea: r.subjectArea,
    topic: r.topic,
    importance: IMPORTANCE_FOR[r.requirementType],
    sourceUrl: r.sourceUrl,
  }));
}

/**
 * Pick the best expectation for a preparation area: a topic-exact match wins over
 * a broad (topic-less) subject match; otherwise none. Never matches across
 * subject areas.
 */
export function matchExpectationForArea(
  area: PreparationArea,
  expectations: VerifiedExpectation[],
): VerifiedExpectation | null {
  let broad: VerifiedExpectation | null = null;
  for (const exp of expectations) {
    if (exp.subjectArea !== area.subjectArea) continue;
    if (exp.topic != null && area.topic != null && exp.topic === area.topic) {
      return exp; // exact topic match — best
    }
    if (exp.topic == null && broad == null) {
      broad = exp; // subject-wide requirement — fallback
    }
  }
  return broad;
}

/**
 * Additively annotate findings with any matching verified expectation. Returns a
 * new findings array; STATUS is never touched (see the file header). No-op when
 * there are no expectations — the case for every target until requirement data
 * is ingested.
 */
export function annotateFindings(
  findings: Finding[],
  areas: PreparationArea[],
  expectations: VerifiedExpectation[],
): Finding[] {
  if (expectations.length === 0) return findings;
  const areaByKey = new Map(areas.map((a) => [a.key, a]));
  return findings.map((f) => {
    const area = areaByKey.get(f.key);
    if (!area) return f;
    const exp = matchExpectationForArea(area, expectations);
    return exp ? { ...f, verifiedExpectation: exp } : f;
  });
}
