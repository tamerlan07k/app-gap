import { describe, expect, it } from "vitest";
import { classifyCourses } from "./classify";
import { analyzeRigor, computeTrajectory, preparationBand } from "./rigor";

const raw = (name: string, type: string, gradeLevel: string) => ({
  name,
  type,
  status: "completed",
  gradeLevel,
  apExamScore: "",
});

describe("preparationBand", () => {
  it("scales limited → developing → solid → strong with rigor", () => {
    expect(preparationBand([])).toBe("limited");
    expect(
      preparationBand(classifyCourses([raw("Algebra 2", "other", "10")])),
    ).toBe("developing");
    expect(
      preparationBand(classifyCourses([raw("AP Calculus AB", "ap", "11")])),
    ).toBe("solid");
    expect(
      preparationBand(
        classifyCourses([
          raw("AP Calculus AB", "ap", "11"),
          raw("AP Calculus BC", "ap", "12"),
        ]),
      ),
    ).toBe("strong");
  });
});

describe("computeTrajectory", () => {
  it("reads rising rigor across grades as increasing", () => {
    const courses = classifyCourses([
      raw("Biology", "other", "9"),
      raw("AP Chemistry", "ap", "12"),
    ]);
    expect(computeTrajectory(courses)).toBe("increasing");
  });

  it("needs at least two grades of data", () => {
    const courses = classifyCourses([raw("AP Chemistry", "ap", "12")]);
    expect(computeTrajectory(courses)).toBe("insufficient-data");
  });
});

describe("analyzeRigor", () => {
  it("counts advanced coursework and grouped preparation bands", () => {
    const courses = classifyCourses([
      raw("AP Calculus BC", "ap", "12"),
      raw("AP Computer Science A", "ap", "11"),
      raw("Honors English", "honors", "10"),
      raw("Spanish 2", "other", "9"),
    ]);
    const r = analyzeRigor(courses);
    expect(r.totalCourses).toBe(4);
    expect(r.apCount).toBe(2);
    expect(r.advancedCount).toBe(2);
    expect(r.quantitativePrep).toBe("solid"); // one AP math course
    expect(r.stemPrep).toBe("strong"); // two advanced STEM courses
    // Only the subjects with courses appear, never the "other" bucket.
    expect(r.bySubject.some((s) => s.subjectArea === "other")).toBe(false);
    expect(r.bySubject.find((s) => s.subjectArea === "math")?.hasAdvanced).toBe(
      true,
    );
  });
});
