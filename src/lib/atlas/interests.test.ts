import { describe, expect, it } from "vitest";
import { ACADEMIC_AREAS } from "~/lib/academic-interests";
import { atlasGradeFromLevel, atlasInterestsForDirection } from "./interests";
import { ATLAS_INTERESTS } from "./link";

const INTEREST_SET = new Set<string>(ATLAS_INTERESTS);

describe("atlasInterestsForDirection", () => {
  it("prefers the granular major over the coarse field key", () => {
    // ai-ml's field key is "cs" (→ Computer Science), but the granular major wins.
    expect(
      atlasInterestsForDirection({ academicMajor: "ai-ml", fieldKey: "cs" }),
    ).toEqual(["AI / Machine Learning"]);
  });

  it("falls back to the coarse field key when the major is unknown/absent", () => {
    expect(
      atlasInterestsForDirection({ academicMajor: null, fieldKey: "cs" }),
    ).toEqual(["Computer Science"]);
    expect(
      atlasInterestsForDirection({
        academicMajor: "not-a-real-major",
        fieldKey: "engineering",
      }),
    ).toEqual(["Engineering"]);
  });

  it("maps a major to multiple interests where both are implied", () => {
    expect(
      atlasInterestsForDirection({
        academicMajor: "environmental-engineering",
      }),
    ).toEqual(["Engineering", "Environmental Science"]);
  });

  it("returns [] for undecided / unmapped directions", () => {
    expect(atlasInterestsForDirection({ academicMajor: "undecided" })).toEqual(
      [],
    );
    expect(atlasInterestsForDirection({ fieldKey: "undecided" })).toEqual([]);
    expect(atlasInterestsForDirection({})).toEqual([]);
  });

  it("only ever returns valid Atlas interest names", () => {
    for (const area of ACADEMIC_AREAS) {
      for (const major of area.majors) {
        const resolved = atlasInterestsForDirection({
          academicMajor: major.key,
          fieldKey: major.fieldKey,
        });
        for (const name of resolved) {
          expect(INTEREST_SET.has(name)).toBe(true);
        }
      }
    }
  });
});

describe("atlasGradeFromLevel", () => {
  it("parses usable high-school grades", () => {
    expect(atlasGradeFromLevel("9")).toBe(9);
    expect(atlasGradeFromLevel("12")).toBe(12);
  });

  it("returns null for non-grade or out-of-range values", () => {
    expect(atlasGradeFromLevel("gap")).toBeNull();
    expect(atlasGradeFromLevel("")).toBeNull();
    expect(atlasGradeFromLevel(null)).toBeNull();
    expect(atlasGradeFromLevel(undefined)).toBeNull();
    expect(atlasGradeFromLevel("13")).toBeNull();
    expect(atlasGradeFromLevel("5")).toBeNull();
  });
});
