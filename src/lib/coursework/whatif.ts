// What-If simulator — PURE, deterministic, and fully explainable. Adds one
// hypothetical course to the student's profile and DIFFS the deterministic
// CourseworkProfile before vs after. No LLM, no admission-point/percentage
// claims — only qualitative changes the engine can prove.
//
// It reuses buildCourseworkProfile for both snapshots, so a What-If result is
// always consistent with the real analysis the student sees.

import { classifyCourse } from "./classify";
import { buildCourseworkProfile } from "./engine";
import { preparationBand } from "./rigor";
import type {
  BandDelta,
  ClassifiedCourse,
  CourseworkInput,
  Finding,
  FindingChange,
  FindingStatus,
  PreparationArea,
  PreparationBand,
  WhatIfEffect,
  WhatIfResult,
} from "./types";

const BAND_ORDER: Record<PreparationBand, number> = {
  limited: 0,
  developing: 1,
  solid: 2,
  strong: 3,
};

// Preparation quality of a finding status (higher = better prepared). Used only
// to detect whether adding the course IMPROVED a finding. "unavailable" and
// "unknown" both sit low (area not covered); taking the course lifts it.
const STATUS_RANK: Record<FindingStatus, number> = {
  "potential-gap": 0,
  unavailable: 1,
  unknown: 1,
  opportunity: 2,
  developing: 3,
  strength: 4,
};

export type HypotheticalCourse = {
  name: string;
  type?: string;
  gradeLevel?: string;
  apExamScore?: string;
};

function bandDelta(before: PreparationBand, after: PreparationBand): BandDelta {
  return { before, after, improved: BAND_ORDER[after] > BAND_ORDER[before] };
}

function areaForCourse(
  areas: PreparationArea[],
  course: ClassifiedCourse,
): PreparationArea | null {
  return (
    areas.find(
      (a) =>
        a.subjectArea === course.subjectArea &&
        (a.topic == null || a.topic === course.topic),
    ) ?? null
  );
}

function classifyEffect(params: {
  relevant: boolean;
  addressedOpportunity: boolean;
  addsBreadth: boolean;
  deepened: boolean;
  subjectBandBefore: PreparationBand;
}): WhatIfEffect {
  if (params.relevant && params.addressedOpportunity)
    return "address-opportunity";
  if (params.addsBreadth) return "broaden-preparation";
  if (params.deepened) return "add-depth";
  if (
    params.subjectBandBefore === "solid" ||
    params.subjectBandBefore === "strong"
  )
    return "strengthen-existing";
  return "limited-relevance";
}

const EFFECT_SUMMARY: Record<WhatIfEffect, (label: string) => string> = {
  "address-opportunity": (l) =>
    `Adding this would directly address an opportunity in ${l} for your field.`,
  "broaden-preparation": (l) =>
    `Adding this would broaden your preparation into ${l}, a subject you don't currently cover.`,
  "add-depth": (l) => `Adding this would add depth to your ${l} preparation.`,
  "strengthen-existing": (l) =>
    `Adding this would reinforce an area (${l}) where you're already solid.`,
  "limited-relevance": (l) =>
    `Adding this would have limited effect on your ${l} preparation for this field.`,
};

export function simulateWhatIf(
  base: CourseworkInput,
  hypothetical: HypotheticalCourse,
): WhatIfResult {
  const raw = {
    name: hypothetical.name,
    type: hypothetical.type ?? "",
    status: "planned",
    gradeLevel: hypothetical.gradeLevel ?? "",
    apExamScore: hypothetical.apExamScore ?? "",
  };
  const course = classifyCourse(raw);

  const before = buildCourseworkProfile(base);
  const after = buildCourseworkProfile({
    ...base,
    courses: [...base.courses, raw],
  });

  // Rigor deltas.
  const rigor = {
    overall: bandDelta(
      before.rigor.overallChallenge,
      after.rigor.overallChallenge,
    ),
    quantitative: bandDelta(
      before.rigor.quantitativePrep,
      after.rigor.quantitativePrep,
    ),
    stem: bandDelta(before.rigor.stemPrep, after.rigor.stemPrep),
    humanities: bandDelta(
      before.rigor.humanitiesPrep,
      after.rigor.humanitiesPrep,
    ),
  };

  // Subject depth (in the course's own subject area).
  const inSubjectBefore = before.classified.filter(
    (c) => c.subjectArea === course.subjectArea,
  );
  const subjectBandBefore = preparationBand(inSubjectBefore);
  const subjectBandAfter = preparationBand([...inSubjectBefore, course]);
  const subjectDepth = {
    subjectArea: course.subjectArea,
    beforeCount: inSubjectBefore.length,
    afterCount: inSubjectBefore.length + 1,
    deepened:
      inSubjectBefore.length > 0 &&
      BAND_ORDER[subjectBandAfter] > BAND_ORDER[subjectBandBefore],
  };

  const addsBreadth =
    course.subjectArea !== "other" && inSubjectBefore.length === 0;

  // Major alignment.
  const area = areaForCourse(before.preparationAreas, course);
  const majorAlignment = {
    relevant: area != null,
    importance: area?.importance ?? null,
    areaLabel: area?.label ?? null,
  };

  // Findings that improved. We report ALL improvements, but only an improvement
  // to an ACTIONABLE prior state (opportunity / developing / potential-gap) makes
  // the primary effect "address-opportunity" — improving an incidental "unknown"
  // or "unavailable" area (e.g. adding a new subject) reads as breadth/depth, not
  // as filling an identified opportunity.
  const ACTIONABLE: FindingStatus[] = [
    "opportunity",
    "developing",
    "potential-gap",
  ];
  const beforeByKey = new Map<string, Finding>(
    before.findings.map((f) => [f.key, f]),
  );
  const addressedFindings: FindingChange[] = [];
  let addressedActionable = false;
  let addressedCore = false;
  for (const f of after.findings) {
    const prev = beforeByKey.get(f.key);
    if (prev && STATUS_RANK[f.status] > STATUS_RANK[prev.status]) {
      addressedFindings.push({
        key: f.key,
        title: f.title,
        from: prev.status,
        to: f.status,
      });
      if (ACTIONABLE.includes(prev.status)) addressedActionable = true;
      if (f.importance === "core") addressedCore = true;
    }
  }

  const primaryEffect = classifyEffect({
    relevant: majorAlignment.relevant,
    addressedOpportunity: addressedActionable,
    addsBreadth,
    deepened: subjectDepth.deepened,
    subjectBandBefore,
  });

  const label = area?.label ?? subjectLabel(course.subjectArea);
  const summary = EFFECT_SUMMARY[primaryEffect](label);

  // Trade-offs / opportunity cost — honest, never numeric. When the course does
  // NOT tackle a core need but a core area for the field is still open, name it.
  const tradeoffs: string[] = [];
  const addressedKeys = new Set(addressedFindings.map((f) => f.key));
  const openCoreArea = after.findings.find(
    (f) =>
      f.importance === "core" &&
      (f.status === "opportunity" ||
        f.status === "potential-gap" ||
        f.status === "developing") &&
      !addressedKeys.has(f.key),
  );
  if (openCoreArea && !addressedCore) {
    tradeoffs.push(
      `A core area for your field — ${openCoreArea.title} — is still open. If your time is limited, that may be the higher-value place to invest.`,
    );
  }
  if (
    primaryEffect === "strengthen-existing" &&
    subjectBandBefore === "strong"
  ) {
    tradeoffs.push(
      `You're already strong in ${label}; another course here adds less than it would in a newer area.`,
    );
  }
  if (!course.classified) {
    tradeoffs.push(
      "We couldn't confidently recognize this course's subject, so this estimate is rough — try a more standard course name.",
    );
  }

  return {
    course,
    primaryEffect,
    summary,
    rigor,
    subjectDepth,
    addsBreadth,
    majorAlignment,
    addressedFindings,
    tradeoffs,
  };
}

// Local subject label (avoids importing the client-facing catalog into the pure
// engine path; kept in sync with catalog.SUBJECT_AREA_LABELS).
function subjectLabel(area: ClassifiedCourse["subjectArea"]): string {
  const map: Record<ClassifiedCourse["subjectArea"], string> = {
    math: "mathematics",
    science: "science",
    "computer-science": "computer science",
    english: "English / writing",
    "social-studies": "social studies",
    "world-language": "world language",
    arts: "arts",
    other: "this",
  };
  return map[area];
}
