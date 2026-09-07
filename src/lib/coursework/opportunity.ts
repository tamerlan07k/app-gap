// Gap vs. opportunity classification — PURE, and the heart of the feature.
//
// For each general preparation area of the student's field, this decides which of
// five states applies, using coursework taken + school-availability context:
//
//   🟢 strength      advanced (or solid) coverage present
//   🟠 developing    present but below the advanced level the area rewards
//   🟡 opportunity   not taken, but available (or likely) — an OPTION, not a fault
//   🔴 potential-gap absent AND field-core AND a universally-available foundation
//                    — the ONLY path to a "gap", so a gap is always defensible
//   ⚪ unavailable   the school does not offer it — never counted against them
//   ⚪ unknown       availability unknown — unknown context, never a gap
//
// The governing principle: AppGap must NEVER call something a genuine academic
// gap when the student may simply have lacked access. A specific advanced course
// (calculus, AP Physics, AP CS) is therefore NEVER a gap under uncertainty —
// only broadly-universal foundations (English, a general math/social-studies
// sequence) can be, because for those access is not realistically in question.

import { COMMON_ADVANCED_COURSES } from "./catalog";
import type {
  AvailabilityMap,
  AvailabilityState,
  ClassifiedCourse,
  Finding,
  PreparationArea,
} from "./types";

/** Classified courses that satisfy a preparation area (subject + topic match). */
export function coverageFor(
  area: PreparationArea,
  classified: ClassifiedCourse[],
): ClassifiedCourse[] {
  return classified.filter((c) => {
    if (c.subjectArea !== area.subjectArea) return false;
    if (area.topic == null) return true;
    return c.topic === area.topic;
  });
}

/**
 * Resolve whether the courses for an area are AVAILABLE at the student's school.
 * A taken matching course is itself proof of availability. Otherwise we combine
 * the self-reported checklist for the catalog courses that map to this area:
 * any "offered" ⇒ offered; all "not_offered" ⇒ not_offered; anything unknown or
 * unreported ⇒ "unsure" (the default — treated as unknown context, not a gap).
 */
export function resolveAreaAvailability(
  area: PreparationArea,
  coverage: ClassifiedCourse[],
  availability: AvailabilityMap,
): AvailabilityState {
  if (coverage.length > 0) return "offered";

  const catalogKeys = COMMON_ADVANCED_COURSES.filter((c) => {
    if (c.subjectArea !== area.subjectArea) return false;
    if (area.topic == null) return true;
    return c.topic === area.topic;
  }).map((c) => c.key);

  if (catalogKeys.length === 0) return "unsure";

  const states = catalogKeys.map((k) => availability[k] ?? "unsure");
  if (states.some((s) => s === "offered")) return "offered";
  if (states.every((s) => s === "not_offered")) return "not_offered";
  return "unsure";
}

function coveredStatus(
  area: PreparationArea,
  coverage: ClassifiedCourse[],
): Finding["status"] {
  const advanced = coverage.some((c) => c.isCollegeLevel);
  const honors = coverage.some((c) => c.level === "honors");
  if (advanced) return "strength";
  if (honors) return area.importance === "core" ? "developing" : "strength";
  return "developing";
}

function notCoveredStatus(
  area: PreparationArea,
  availability: AvailabilityState,
): Finding["status"] {
  if (availability === "not_offered") return "unavailable";

  if (area.importance === "core" && area.universallyAvailable) {
    // A universal foundation, core to the field, absent: access is not in
    // question, so this is a genuine (if gently-worded) gap regardless of the
    // self-report — unless the student explicitly marked it not offered above.
    return "potential-gap";
  }

  // A specific / non-universal area, or a non-core area:
  //   offered  → an option worth considering (never an automatic deficiency)
  //   unsure   → unknown context, NEVER a gap
  return availability === "offered" ? "opportunity" : "unknown";
}

function shortNames(coverage: ClassifiedCourse[]): string {
  const names = coverage.map((c) => c.name).filter(Boolean);
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")}, and more`;
}

function buildDetail(
  area: PreparationArea,
  status: Finding["status"],
  coverage: ClassifiedCourse[],
): string {
  const label = area.label.toLowerCase();
  switch (status) {
    case "strength":
      return `Your coursework includes ${shortNames(coverage)} — solid, ${
        coverage.some((c) => c.isCollegeLevel) ? "college-level " : ""
      }preparation in ${label}.`;
    case "developing":
      return `You have coursework in ${label} (${shortNames(
        coverage,
      )}), with room to reach a more advanced level if it's available to you.`;
    case "opportunity":
      return `You haven't taken advanced ${label} yet, and your school-context notes indicate it's available — an option to consider, not a shortfall.`;
    case "unavailable":
      return `Your school-context notes indicate ${label} isn't offered at your school, so this is not treated as a gap.`;
    case "potential-gap":
      return `Your coursework doesn't yet show ${label}, which is a widely-available foundation for this field.`;
    default: // unknown
      return `Your coursework doesn't yet show advanced ${label}. Because it's unclear whether your school offers it, this is left as context — not a gap. Marking its availability sharpens the analysis.`;
  }
}

/** Classify every preparation area of the field into a Finding. */
export function classifyFindings(
  preparationAreas: PreparationArea[],
  classified: ClassifiedCourse[],
  availability: AvailabilityMap,
): Finding[] {
  return preparationAreas.map((area) => {
    const coverage = coverageFor(area, classified);
    const covered = coverage.length > 0;
    const areaAvailability = resolveAreaAvailability(
      area,
      coverage,
      availability,
    );
    const status = covered
      ? coveredStatus(area, coverage)
      : notCoveredStatus(area, areaAvailability);

    return {
      key: area.key,
      status,
      title: area.label,
      subjectArea: area.subjectArea,
      importance: area.importance,
      availability: covered ? "offered" : areaAvailability,
      detail: buildDetail(area, status, coverage),
      whyItMatters: area.whyGeneral,
    };
  });
}
