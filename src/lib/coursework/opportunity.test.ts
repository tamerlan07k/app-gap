import { describe, expect, it } from "vitest";
import { classifyCourses } from "./classify";
import { preparationAreasForField } from "./field-requirements";
import { classifyFindings, resolveAreaAvailability } from "./opportunity";
import type { AvailabilityMap, Finding } from "./types";

const raw = (name: string, type: string) => ({
  name,
  type,
  status: "completed",
  gradeLevel: "11",
  apExamScore: "",
});

function findingsFor(
  field: Parameters<typeof preparationAreasForField>[0],
  courseNames: Array<[string, string]>,
  availability: AvailabilityMap = {},
): Map<string, Finding> {
  const classified = classifyCourses(courseNames.map(([n, t]) => raw(n, t)));
  const findings = classifyFindings(
    preparationAreasForField(field),
    classified,
    availability,
  );
  return new Map(findings.map((f) => [f.key, f]));
}

describe("the five-state framework — the product's core distinction", () => {
  it("STRENGTH: advanced coursework in a core area", () => {
    const f = findingsFor("cs", [
      ["AP Calculus BC", "ap"],
      ["AP Computer Science A", "ap"],
    ]);
    expect(f.get("cs-calculus")?.status).toBe("strength");
    expect(f.get("cs-computing")?.status).toBe("strength");
  });

  it("UNAVAILABLE: a course the school does not offer is NEVER a gap", () => {
    const f = findingsFor("cs", [["AP Computer Science A", "ap"]], {
      "ap-calculus-ab": "not_offered",
      "ap-calculus-bc": "not_offered",
    });
    const calc = f.get("cs-calculus");
    expect(calc?.status).toBe("unavailable");
    expect(calc?.status).not.toBe("potential-gap");
  });

  it("OPPORTUNITY: not taken but available — an option, not a deficiency", () => {
    const f = findingsFor("cs", [["AP Computer Science A", "ap"]], {
      "ap-calculus-bc": "offered",
    });
    expect(f.get("cs-calculus")?.status).toBe("opportunity");
  });

  it("UNKNOWN: unknown availability of a specific advanced course is context, not a gap", () => {
    // No availability reported → unsure → a non-universal core area stays unknown.
    const f = findingsFor("cs", [["AP Computer Science A", "ap"]]);
    const calc = f.get("cs-calculus");
    expect(calc?.status).toBe("unknown");
    expect(calc?.status).not.toBe("potential-gap");
  });

  it("POTENTIAL GAP: only for absent, field-core, universally-available foundations", () => {
    // A humanities applicant with no English coursework, availability unknown:
    // English is core + universal, so access is not in question → a real gap.
    const f = findingsFor("humanities", []);
    expect(f.get("hum-english")?.status).toBe("potential-gap");
    expect(f.get("hum-history")?.status).toBe("potential-gap");
  });

  it("respects a self-report of not-offered even for a universal core area", () => {
    const f = findingsFor("humanities", [], {
      "ap-english-lang": "not_offered",
      "ap-english-lit": "not_offered",
    });
    expect(f.get("hum-english")?.status).toBe("unavailable");
  });

  it("an undecided student is NEVER told they have a gap", () => {
    const f = findingsFor("undecided", []);
    for (const finding of f.values()) {
      expect(finding.status).not.toBe("potential-gap");
    }
  });
});

describe("resolveAreaAvailability", () => {
  const areas = preparationAreasForField("cs");
  const calcArea = areas.find((a) => a.key === "cs-calculus");
  if (!calcArea) throw new Error("expected cs-calculus preparation area");

  it("treats a taken matching course as proof of availability", () => {
    const covered = classifyCourses([raw("AP Calculus AB", "ap")]);
    expect(resolveAreaAvailability(calcArea, covered, {})).toBe("offered");
  });

  it("defaults to unsure when nothing is reported", () => {
    expect(resolveAreaAvailability(calcArea, [], {})).toBe("unsure");
  });

  it("is not_offered only when every mapped course is not_offered", () => {
    expect(
      resolveAreaAvailability(calcArea, [], {
        "ap-calculus-ab": "not_offered",
        "ap-calculus-bc": "not_offered",
      }),
    ).toBe("not_offered");
    expect(
      resolveAreaAvailability(calcArea, [], {
        "ap-calculus-ab": "not_offered",
      }),
    ).toBe("unsure"); // bc still unknown
  });
});
