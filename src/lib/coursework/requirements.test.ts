import { describe, expect, it } from "vitest";
import { classifyCourses } from "./classify";
import { buildCourseworkProfile } from "./engine";
import { preparationAreasForField } from "./field-requirements";
import { classifyFindings } from "./opportunity";
import {
  annotateFindings,
  type CollegeAcademicRequirement,
  matchExpectationForArea,
  resolveRequirements,
} from "./requirements";
import type { CourseworkInput, VerifiedExpectation } from "./types";

const req = (
  partial: Partial<CollegeAcademicRequirement> &
    Pick<CollegeAcademicRequirement, "scope" | "subjectArea" | "label">,
): CollegeAcademicRequirement => ({
  schoolId: null,
  programId: null,
  trackId: null,
  requirementType: "recommended",
  topic: null,
  sourceUrl: "https://example.edu",
  ...partial,
});

describe("resolveRequirements", () => {
  it("maps requirement_type to importance and scopes to the target", () => {
    const rows: CollegeAcademicRequirement[] = [
      req({
        scope: "university",
        subjectArea: "math",
        topic: "calculus",
        label: "Calculus recommended",
        requirementType: "recommended",
        sourceUrl: "u",
      }),
      req({
        scope: "program",
        programId: "X",
        subjectArea: "math",
        topic: "calculus",
        label: "Calculus required",
        requirementType: "required",
        sourceUrl: "p",
      }),
    ];

    // Applicant to program X → the program-scoped "required" wins.
    const forX = resolveRequirements(rows, {
      schoolId: null,
      programId: "X",
      trackId: null,
    });
    expect(forX).toHaveLength(1);
    expect(forX[0].label).toBe("Calculus required");
    expect(forX[0].importance).toBe("core");
    expect(forX[0].requirementType).toBe("required");

    // Applicant to a different program → falls back to the university row.
    const forY = resolveRequirements(rows, {
      schoolId: null,
      programId: "Y",
      trackId: null,
    });
    expect(forY[0].label).toBe("Calculus recommended");
    expect(forY[0].importance).toBe("recommended");
  });
});

describe("matchExpectationForArea", () => {
  const areas = preparationAreasForField("cs");
  const calc = areas.find((a) => a.key === "cs-calculus");
  const stats = areas.find((a) => a.key === "cs-statistics");
  if (!calc || !stats) throw new Error("expected cs areas");

  const exp = (
    subjectArea: string,
    topic: string | null,
  ): VerifiedExpectation => ({
    scope: "program",
    requirementType: "required",
    label: `${subjectArea}/${topic}`,
    subjectArea: subjectArea as VerifiedExpectation["subjectArea"],
    topic,
    importance: "core",
    sourceUrl: "s",
  });

  it("matches on subject + topic exactly, never across subjects/topics", () => {
    expect(
      matchExpectationForArea(calc, [exp("math", "calculus")])?.topic,
    ).toBe("calculus");
    // math/statistics expectation must NOT match the calculus area.
    expect(
      matchExpectationForArea(calc, [exp("math", "statistics")]),
    ).toBeNull();
    // english expectation must not match a math area.
    expect(matchExpectationForArea(calc, [exp("english", null)])).toBeNull();
  });

  it("a subject-wide (topic-less) requirement matches as a fallback", () => {
    expect(
      matchExpectationForArea(stats, [exp("math", null)])?.subjectArea,
    ).toBe("math");
  });
});

describe("annotateFindings never changes a status (unavailable stays unavailable)", () => {
  it("attaches a matching requirement WITHOUT turning an unavailable area into a gap", () => {
    // Engineering applicant: physics not taken, school marks it not offered.
    const input: CourseworkInput = {
      courses: [
        {
          name: "AP Calculus AB",
          type: "ap",
          status: "completed",
          gradeLevel: "11",
          apExamScore: "4",
        },
      ],
      gradeLevel: "11",
      fieldKey: "engineering",
      academicMajor: "",
      academicInterests: [],
      availability: {
        "ap-physics-1": "not_offered",
        "ap-physics-c": "not_offered",
      },
      target: {
        hasTarget: true,
        collegeId: "c1",
        schoolId: null,
        programId: "prog-eng",
        trackId: null,
        collegeName: "Test University",
        programLabel: "Engineering",
        fieldStrength: null,
        // A verified requirement that the target program requires physics.
        verifiedExpectations: [
          {
            scope: "program",
            requirementType: "required",
            label: "Physics required",
            subjectArea: "science",
            topic: "physics",
            importance: "core",
            sourceUrl: "https://test.edu/eng",
          },
        ],
      },
    };

    const profile = buildCourseworkProfile(input);
    const physics = profile.findings.find((f) => f.key === "eng-physics");
    expect(physics).toBeDefined();
    // Status is unchanged by the requirement — availability still governs.
    expect(physics?.status).toBe("unavailable");
    // But the verified requirement is attached as context.
    expect(physics?.verifiedExpectation?.sourceUrl).toBe(
      "https://test.edu/eng",
    );
    // A requirement must NEVER manufacture a gap.
    expect(profile.summary.potentialGaps).toBe(0);
  });

  it("is a no-op when there are no expectations", () => {
    const areas = preparationAreasForField("cs");
    const findings = classifyFindings(areas, classifyCourses([]), {});
    expect(annotateFindings(findings, areas, [])).toBe(findings);
  });
});
