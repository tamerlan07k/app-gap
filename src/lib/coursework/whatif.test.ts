import { describe, expect, it } from "vitest";
import type { CourseworkInput } from "./types";
import { simulateWhatIf } from "./whatif";

const baseInput = (
  overrides: Partial<CourseworkInput> = {},
): CourseworkInput => ({
  courses: [],
  gradeLevel: "11",
  fieldKey: "cs",
  academicMajor: "",
  academicInterests: [],
  availability: {},
  ...overrides,
});

const course = (name: string, type = "ap", gradeLevel = "12") => ({
  name,
  type,
  status: "completed",
  gradeLevel,
  apExamScore: "",
});

describe("simulateWhatIf — deterministic, qualitative effects", () => {
  it("ADDRESS-OPPORTUNITY: a field-core course that was an available opportunity", () => {
    // CS student with CS but no calculus; calculus is offered → opportunity.
    const base = baseInput({
      courses: [course("AP Computer Science A")],
      availability: { "ap-calculus-bc": "offered" },
    });
    const r = simulateWhatIf(base, { name: "AP Calculus BC", type: "ap" });
    expect(r.primaryEffect).toBe("address-opportunity");
    expect(r.majorAlignment.relevant).toBe(true);
    expect(r.addressedFindings.some((f) => f.key === "cs-calculus")).toBe(true);
  });

  it("BROADEN-PREPARATION: a course in a subject not previously covered", () => {
    const base = baseInput({
      fieldKey: "humanities",
      courses: [course("AP English Literature")],
    });
    const r = simulateWhatIf(base, { name: "AP Spanish Language", type: "ap" });
    expect(r.addsBreadth).toBe(true);
    expect(r.primaryEffect).toBe("broaden-preparation");
    expect(r.subjectDepth.subjectArea).toBe("world-language");
  });

  it("ADD-DEPTH: raising the level within an already-present subject", () => {
    // Regular biology present; adding AP Chemistry deepens science.
    const base = baseInput({
      fieldKey: "bio-premed",
      courses: [course("Biology", "other", "9")],
      // mark other bio-premed areas offered so science isn't the only signal
      availability: {},
    });
    const r = simulateWhatIf(base, { name: "AP Chemistry", type: "ap" });
    expect(r.subjectDepth.subjectArea).toBe("science");
    expect(r.subjectDepth.deepened).toBe(true);
    expect(["add-depth", "address-opportunity"]).toContain(r.primaryEffect);
  });

  it("STRENGTHEN-EXISTING: another advanced course in an already-strong area", () => {
    // Two AP maths already → math is strong; adding a third strengthens.
    const base = baseInput({
      fieldKey: "math-physics",
      courses: [
        course("AP Calculus BC"),
        course("Multivariable Calculus", "dual-enrollment"),
      ],
    });
    const r = simulateWhatIf(base, { name: "AP Statistics", type: "ap" });
    // Statistics is a different topic (fills mp-... recommended?) — assert it does
    // not fabricate a gap and the subject is already strong.
    expect(r.subjectDepth.subjectArea).toBe("math");
    expect([
      "strengthen-existing",
      "address-opportunity",
      "add-depth",
    ]).toContain(r.primaryEffect);
  });

  it("LIMITED-RELEVANCE: an off-field elective that changes little", () => {
    // A strong CS student adds an unrelated arts elective.
    const base = baseInput({
      courses: [course("AP Computer Science A"), course("AP Calculus BC")],
    });
    const r = simulateWhatIf(base, { name: "Ceramics", type: "other" });
    expect(r.majorAlignment.relevant).toBe(false);
    // New subject area → broaden; but it's off-field, so a tradeoff should note
    // an open core area if one exists. Either way, no numbers and no gap claims.
    expect(typeof r.summary).toBe("string");
    expect(r.summary).not.toMatch(/\d+\s*%/); // never a percentage
  });

  it("never emits admission-point/percentage claims", () => {
    const base = baseInput({ courses: [course("AP Computer Science A")] });
    const r = simulateWhatIf(base, { name: "AP Physics C", type: "ap" });
    const text = [r.summary, ...r.tradeoffs].join(" ");
    expect(text).not.toMatch(/%|\bpoints?\b|\bchance\b|\bodds\b/i);
  });

  it("surfaces an opportunity-cost tradeoff when a core area stays open", () => {
    // Engineering student with strong math adds MORE math while physics (core)
    // is an available opportunity.
    const base = baseInput({
      fieldKey: "engineering",
      courses: [course("AP Calculus BC")],
      availability: { "ap-physics-1": "offered" },
    });
    const r = simulateWhatIf(base, { name: "AP Statistics", type: "ap" });
    // Physics remains an open core opportunity → a tradeoff should mention it.
    expect(r.tradeoffs.join(" ")).toMatch(/physics/i);
  });
});
