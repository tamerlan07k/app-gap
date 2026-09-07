// Course classification — PURE. Turns a stored course (free-text name + the
// onboarding `type`/`status`/`ap_exam_score` fields) into a ClassifiedCourse with
// a subject area, a finer topic when detectable, a rigor level, and a rigor
// weight. No DB, no network, no React.
//
// Design notes:
//   • Level comes from the explicit stored `type` first (ap/ib/honors/
//     dual-enrollment), then falls back to keywords in the NAME ("AP Biology"
//     typed as "other" still reads as AP). This never fabricates rigor — it only
//     recognizes what the student already wrote.
//   • Subject/topic come from the catalog keyword taxonomy. When nothing matches,
//     the course is kept with subjectArea "other" and classified=false, so the
//     rest of the engine (and the UI) can be honest that it could not be placed —
//     it is never silently dropped or mis-assigned.

import { TOPIC_RULES } from "./catalog";
import type {
  ClassifiedCourse,
  CourseLevel,
  CourseStatus,
  SubjectArea,
} from "./types";

export type RawCourse = {
  name: string;
  type: string;
  status: string;
  gradeLevel: string;
  apExamScore: string;
};

const RIGOR_WEIGHT: Record<CourseLevel, number> = {
  regular: 1,
  honors: 2,
  ap: 3,
  ib: 3,
  "dual-enrollment": 3,
};

const COLLEGE_LEVEL: Record<CourseLevel, boolean> = {
  regular: false,
  honors: false,
  ap: true,
  ib: true,
  "dual-enrollment": true,
};

/** Resolve the rigor level from the stored type, then the name as a fallback. */
export function resolveLevel(type: string, name: string): CourseLevel {
  const t = type.trim().toLowerCase();
  if (t === "ap") return "ap";
  if (t === "ib") return "ib";
  if (t === "honors") return "honors";
  if (t === "dual-enrollment") return "dual-enrollment";

  // type is "other"/""/unknown — infer from the name, conservatively.
  const n = name.toLowerCase();
  if (/\bap\b/.test(n) || n.includes("advanced placement")) return "ap";
  if (/\bib\b/.test(n) || n.includes("international baccalaureate"))
    return "ib";
  if (n.includes("dual enrollment") || n.includes("dual-enrollment"))
    return "dual-enrollment";
  if (
    n.includes("honors") ||
    n.includes("honours") ||
    n.includes("accelerated")
  )
    return "honors";
  return "regular";
}

/** Resolve subject area + finer topic from the course name via the taxonomy. */
export function resolveSubject(name: string): {
  subjectArea: SubjectArea;
  topic: string | null;
  matched: boolean;
} {
  const n = name.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.keywords.some((k) => n.includes(k))) {
      return {
        subjectArea: rule.subjectArea,
        topic: rule.topic,
        matched: true,
      };
    }
  }
  return { subjectArea: "other", topic: null, matched: false };
}

function normalizeStatus(status: string): CourseStatus {
  const s = status.trim().toLowerCase();
  if (s === "current" || s === "completed" || s === "planned") return s;
  return "unknown";
}

/** Classify one raw course. */
export function classifyCourse(course: RawCourse): ClassifiedCourse {
  const level = resolveLevel(course.type, course.name);
  const { subjectArea, topic, matched } = resolveSubject(course.name);
  return {
    name: course.name,
    subjectArea,
    topic,
    level,
    isCollegeLevel: COLLEGE_LEVEL[level],
    rigorWeight: RIGOR_WEIGHT[level],
    gradeLevel: course.gradeLevel ?? "",
    status: normalizeStatus(course.status),
    apExamScore: course.apExamScore ?? "",
    classified: matched,
  };
}

/** Classify a list of raw courses, dropping entries with a blank name. */
export function classifyCourses(courses: RawCourse[]): ClassifiedCourse[] {
  return courses.filter((c) => c.name?.trim()).map((c) => classifyCourse(c));
}
