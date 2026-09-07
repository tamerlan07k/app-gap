// Rigor analysis — PURE. Reads classified courses and describes the academic
// challenge they represent: per-subject depth, rigor trajectory across grades,
// and grouped quantitative / STEM / humanities preparation. No DB, no network,
// no React. Produces qualitative BANDS only — never a numeric "rigor score".

import type {
  ClassifiedCourse,
  PreparationBand,
  RigorProfile,
  SubjectArea,
  SubjectRigor,
  TrajectoryDirection,
} from "./types";

const LEVEL_ORDER: Record<ClassifiedCourse["level"], number> = {
  regular: 0,
  honors: 1,
  ap: 2,
  ib: 2,
  "dual-enrollment": 2,
};

/**
 * Qualitative preparation band for a set of courses. Present-but-regular reads as
 * "developing" (not "limited"): limited is reserved for essentially-absent
 * preparation, so the band never overstates a gap.
 */
export function preparationBand(courses: ClassifiedCourse[]): PreparationBand {
  const total = courses.length;
  if (total === 0) return "limited";
  const advanced = courses.filter((c) => c.isCollegeLevel).length;
  const honors = courses.filter((c) => c.level === "honors").length;
  if (advanced >= 2) return "strong";
  if (advanced >= 1) return "solid";
  if (honors >= 1) return "developing";
  return "developing";
}

function highestLevel(courses: ClassifiedCourse[]): ClassifiedCourse["level"] {
  let best: ClassifiedCourse["level"] = "regular";
  for (const c of courses) {
    if (LEVEL_ORDER[c.level] > LEVEL_ORDER[best]) best = c.level;
  }
  return best;
}

function subjectRigor(
  subjectArea: SubjectArea,
  courses: ClassifiedCourse[],
): SubjectRigor {
  return {
    subjectArea,
    courseCount: courses.length,
    highestLevel: highestLevel(courses),
    hasAdvanced: courses.some((c) => c.isCollegeLevel),
    band: preparationBand(courses),
  };
}

/** Rigor trajectory across grades 9 → 12, from average course rigor weight. */
export function computeTrajectory(
  courses: ClassifiedCourse[],
): TrajectoryDirection {
  const grades = ["9", "10", "11", "12"];
  const points: number[] = [];
  for (const g of grades) {
    const inGrade = courses.filter((c) => c.gradeLevel === g);
    if (inGrade.length === 0) continue;
    const avg =
      inGrade.reduce((sum, c) => sum + c.rigorWeight, 0) / inGrade.length;
    points.push(avg);
  }
  if (points.length < 2) return "insufficient-data";
  const slope = points[points.length - 1] - points[0];
  if (slope >= 0.5) return "increasing";
  if (slope <= -0.5) return "decreasing";
  return "steady";
}

function overallChallenge(
  advancedCount: number,
  honorsCount: number,
): PreparationBand {
  if (advancedCount >= 5) return "strong";
  if (advancedCount >= 2) return "solid";
  if (advancedCount >= 1 || honorsCount >= 2) return "developing";
  return "limited";
}

export function analyzeRigor(classified: ClassifiedCourse[]): RigorProfile {
  const apCount = classified.filter((c) => c.level === "ap").length;
  const ibCount = classified.filter((c) => c.level === "ib").length;
  const honorsCount = classified.filter((c) => c.level === "honors").length;
  const dualEnrollmentCount = classified.filter(
    (c) => c.level === "dual-enrollment",
  ).length;
  const advancedCount = classified.filter((c) => c.isCollegeLevel).length;

  // Per-subject rigor for every subject the student actually has courses in
  // (excluding the unclassifiable "other" bucket so it never reads as a subject).
  const subjects = Array.from(
    new Set(classified.map((c) => c.subjectArea)),
  ).filter((s): s is SubjectArea => s !== "other");
  const bySubject = subjects.map((s) =>
    subjectRigor(
      s,
      classified.filter((c) => c.subjectArea === s),
    ),
  );

  const inAreas = (areas: SubjectArea[]) =>
    classified.filter((c) => areas.includes(c.subjectArea));

  return {
    totalCourses: classified.length,
    advancedCount,
    apCount,
    ibCount,
    honorsCount,
    dualEnrollmentCount,
    bySubject,
    trajectory: computeTrajectory(classified),
    quantitativePrep: preparationBand(inAreas(["math"])),
    stemPrep: preparationBand(inAreas(["math", "science", "computer-science"])),
    humanitiesPrep: preparationBand(
      inAreas(["english", "social-studies", "world-language"]),
    ),
    overallChallenge: overallChallenge(advancedCount, honorsCount),
  };
}
