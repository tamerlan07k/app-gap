import { describe, expect, it } from "vitest";
import {
  filterProgramsByQuery,
  hasSchoolLayer,
  isSelectorRelevant,
  isValidProgramSelection,
  programDegreeLabel,
  type SelectorProgram,
  type SelectorSchool,
  visibleProgramsForSchool,
} from "./program-selection";

const school = (
  id: string,
  admitsSeparately: boolean,
  name = id,
): SelectorSchool => ({ id, name, admitsSeparately });

const prog = (
  id: string,
  name: string,
  schoolId: string | null = null,
  degree: string | null = null,
): SelectorProgram => ({ id, name, schoolId, degree });

// Single-admission college: flat program list, no schools (Tier-A shape).
const flatPrograms: SelectorProgram[] = [
  prog("p1", "Computer Science"),
  prog("p2", "Economics"),
  prog("p3", "Political Science"),
  prog("p4", "Mechanical Engineering"),
  prog("p5", "English Language & Literature"),
];

// School-layer college (Cornell-shape): programs scoped to schools, some
// carrying a verified degree.
const schoolLayerSchools: SelectorSchool[] = [
  school("eng", true, "College of Engineering"),
  school("as", true, "College of Arts and Sciences"),
];
const schoolLayerPrograms: SelectorProgram[] = [
  prog("e-cs", "Computer Science", "eng", "B.S."),
  prog("e-me", "Mechanical Engineering", "eng", "B.S."),
  prog("a-cs", "Computer Science", "as", "B.A."),
  prog("a-econ", "Economics", "as", "B.A."),
  prog("wide", "Interdisciplinary Studies", null, null),
];

describe("hierarchy mode detection", () => {
  it("single-admission college (no schools, has programs) is relevant, no school layer", () => {
    expect(hasSchoolLayer([])).toBe(false);
    expect(isSelectorRelevant([], flatPrograms)).toBe(true);
  });

  it("school-layer college (separately-admitting schools) uses the school layer", () => {
    expect(hasSchoolLayer(schoolLayerSchools)).toBe(true);
    expect(isSelectorRelevant(schoolLayerSchools, schoolLayerPrograms)).toBe(
      true,
    );
  });

  it("more than one school (even if not admits_separately) is a school layer", () => {
    expect(hasSchoolLayer([school("a", false), school("b", false)])).toBe(true);
  });

  it("a single non-separating school is NOT a school layer", () => {
    expect(hasSchoolLayer([school("only", false)])).toBe(false);
  });

  it("a college with no schools and no programs shows nothing", () => {
    expect(isSelectorRelevant([], [])).toBe(false);
  });
});

describe("school-layer program scoping (unchanged behavior)", () => {
  it("scopes programs to the chosen school plus college-wide (null) ones", () => {
    const visible = visibleProgramsForSchool(schoolLayerPrograms, "eng");
    const ids = visible.map((p) => p.id).sort();
    expect(ids).toEqual(["e-cs", "e-me", "wide"]); // eng-scoped + college-wide
    expect(ids).not.toContain("a-cs");
  });

  it("with no school chosen, all programs are visible", () => {
    expect(visibleProgramsForSchool(schoolLayerPrograms, "")).toHaveLength(
      schoolLayerPrograms.length,
    );
  });
});

describe("typeahead search (single-admission picker)", () => {
  it("matches by case-insensitive substring", () => {
    const r = filterProgramsByQuery(flatPrograms, "eng");
    // "Mechanical Engineering" and "English Language & Literature"
    expect(r.items.map((p) => p.id).sort()).toEqual(["p4", "p5"]);
    expect(r.total).toBe(2);
  });

  it("empty query returns the head of the list (capped)", () => {
    const r = filterProgramsByQuery(flatPrograms, "   ", 3);
    expect(r.items).toHaveLength(3);
    expect(r.total).toBe(5);
    expect(r.truncated).toBe(true);
  });

  it("no match yields an empty result set", () => {
    const r = filterProgramsByQuery(flatPrograms, "zzzz");
    expect(r.items).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.truncated).toBe(false);
  });

  it("handles a very large (100+) program list by capping the rendered rows", () => {
    const big: SelectorProgram[] = Array.from({ length: 120 }, (_, i) =>
      prog(`b${i}`, `Program ${i}`),
    );
    const all = filterProgramsByQuery(big, "", 50);
    expect(all.items).toHaveLength(50);
    expect(all.total).toBe(120);
    expect(all.truncated).toBe(true);

    // A specific query still finds the exact matches within the big list.
    const one = filterProgramsByQuery(big, "Program 7");
    // "Program 7", "Program 70".."Program 79" → 11 matches
    expect(one.total).toBe(11);
    expect(one.items.some((p) => p.name === "Program 7")).toBe(true);
  });
});

describe("degree labelling (never fabricate)", () => {
  it("shows the verified degree when present", () => {
    expect(programDegreeLabel(prog("x", "CS", "eng", "B.S."))).toBe("B.S.");
  });

  it("shows 'Not sure yet' when the degree is unknown (Tier-A)", () => {
    expect(programDegreeLabel(prog("x", "CS", null, null))).toBe(
      "Not sure yet",
    );
    expect(programDegreeLabel(null)).toBe("Not sure yet");
  });
});

describe("valid-selection guard (prevents saving invalid program ids)", () => {
  it("accepts a program that belongs to the single-admission college", () => {
    expect(isValidProgramSelection(flatPrograms, "p1", "")).toBe(true);
  });

  it("rejects a program id not in the college's list", () => {
    expect(isValidProgramSelection(flatPrograms, "ghost", "")).toBe(false);
  });

  it("empty program ('Not sure yet') is always valid", () => {
    expect(isValidProgramSelection(flatPrograms, "", "")).toBe(true);
  });

  it("rejects a program that belongs to a different school", () => {
    expect(isValidProgramSelection(schoolLayerPrograms, "a-cs", "eng")).toBe(
      false,
    );
  });

  it("accepts a school-scoped program under its own school", () => {
    expect(isValidProgramSelection(schoolLayerPrograms, "e-cs", "eng")).toBe(
      true,
    );
  });

  it("accepts a college-wide (null-school) program under any school", () => {
    expect(isValidProgramSelection(schoolLayerPrograms, "wide", "eng")).toBe(
      true,
    );
  });
});

describe("persistence hydration (survives refresh only when still valid)", () => {
  it("a previously-saved program id that still belongs to the college is valid on reload", () => {
    // Simulates re-opening a college target: initialProgramId comes from
    // user_colleges.program_id and must still resolve against loaded programs.
    const savedId = "p2";
    expect(isValidProgramSelection(flatPrograms, savedId, "")).toBe(true);
    expect(flatPrograms.find((p) => p.id === savedId)?.name).toBe("Economics");
  });

  it("a stale saved id (program removed) is rejected rather than shown", () => {
    expect(isValidProgramSelection(flatPrograms, "removed-id", "")).toBe(false);
  });
});
