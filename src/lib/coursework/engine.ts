// Coursework engine — PURE composition. Assembles the full CourseworkProfile
// from a student's raw courses, intended field, and school-availability context.
// This is the single deterministic entry point the server page, the AI prompt
// builder, and the tests all share, so they never diverge. No DB, no network, no
// React, and — importantly — no dependency on the AppGap Score or chancing
// engine. Nothing computed here feeds those systems.

import { classifyCourses } from "./classify";
import { preparationAreasForField } from "./field-requirements";
import { classifyFindings } from "./opportunity";
import { annotateFindings } from "./requirements";
import { analyzeRigor } from "./rigor";
import type {
  CourseworkInput,
  CourseworkProfile,
  Finding,
  TargetContext,
} from "./types";

/** An empty target — the default when the student has set no college target. */
export function emptyTarget(): TargetContext {
  return {
    hasTarget: false,
    collegeId: null,
    schoolId: null,
    programId: null,
    trackId: null,
    collegeName: null,
    programLabel: null,
    fieldStrength: null,
    verifiedExpectations: [],
  };
}

function summarize(findings: Finding[]): CourseworkProfile["summary"] {
  const count = (s: Finding["status"]) =>
    findings.filter((f) => f.status === s).length;
  return {
    strengths: count("strength"),
    opportunities: count("opportunity"),
    developing: count("developing"),
    potentialGaps: count("potential-gap"),
    unavailable: count("unavailable"),
    unknown: count("unknown"),
  };
}

export function buildCourseworkProfile(
  input: CourseworkInput,
): CourseworkProfile {
  const classified = classifyCourses(
    input.courses.map((c) => ({
      name: c.name,
      type: c.type,
      status: c.status,
      gradeLevel: c.gradeLevel,
      apExamScore: c.apExamScore,
    })),
  );

  const rigor = analyzeRigor(classified);
  const preparationAreas = preparationAreasForField(input.fieldKey);
  const baseFindings = classifyFindings(
    preparationAreas,
    classified,
    input.availability,
  );

  // Additive overlay: annotate findings with any VERIFIED requirement for the
  // exact target. This never changes a finding's status — availability alone
  // decides that — so an unavailable/unknown area can never become a gap because
  // a requirement matched. No-op when there are no expectations (every target
  // until requirement data is ingested).
  const target = input.target ?? emptyTarget();
  const findings = annotateFindings(
    baseFindings,
    preparationAreas,
    target.verifiedExpectations,
  );

  return {
    classified,
    rigor,
    fieldKey: input.fieldKey,
    preparationAreas,
    findings,
    target,
    summary: summarize(findings),
  };
}
