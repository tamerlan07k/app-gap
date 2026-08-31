// Taxonomy integrity + backward-compat mapping tests.

import { describe, expect, it } from "vitest";
import {
  ACADEMIC_AREAS,
  areaForMajor,
  type FieldKey,
  fieldKeyForMajor,
  findMajor,
  majorsForArea,
  specializationsForMajor,
} from "./academic-interests";

// The pre-existing coarse field-fit keys that `profiles.major_category` must
// remain within (used by college_field_strengths.field_key and the AI labels).
const VALID_FIELD_KEYS: FieldKey[] = [
  "cs",
  "engineering",
  "bio-premed",
  "business",
  "math-physics",
  "polisci",
  "psych",
  "humanities",
  "design",
  "education",
  "law",
  "undecided",
  "other",
];

describe("taxonomy integrity", () => {
  it("has unique major keys across all areas", () => {
    const keys = ACADEMIC_AREAS.flatMap((a) => a.majors.map((m) => m.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("every major maps to a valid coarse field-fit key", () => {
    for (const area of ACADEMIC_AREAS) {
      for (const major of area.majors) {
        expect(VALID_FIELD_KEYS).toContain(major.fieldKey);
      }
    }
  });

  it("keeps genuinely distinct fields separate (not lumped)", () => {
    // These were previously combined ("Math / Physics / Statistics", one
    // "Engineering", "Computer Science / Software / Data") — now separate.
    const keys = ACADEMIC_AREAS.flatMap((a) => a.majors.map((m) => m.key));
    for (const k of [
      "mathematics",
      "statistics",
      "physics",
      "astronomy",
      "computer-science",
      "data-science",
      "software-engineering",
      "computer-engineering",
      "mechanical-engineering",
      "aerospace-engineering",
    ]) {
      expect(keys).toContain(k);
    }
  });

  it("is substantially more comprehensive than the old ~10 categories", () => {
    const total = ACADEMIC_AREAS.flatMap((a) => a.majors).length;
    expect(total).toBeGreaterThan(60);
  });
});

describe("lookups", () => {
  it("resolves a major to its area and field key", () => {
    expect(areaForMajor("aerospace-engineering")).toBe("engineering");
    expect(fieldKeyForMajor("aerospace-engineering")).toBe("engineering");
    expect(fieldKeyForMajor("statistics")).toBe("math-physics");
    expect(fieldKeyForMajor("computer-science")).toBe("cs");
  });

  it("falls back to 'undecided' for unknown majors (never fabricated)", () => {
    expect(fieldKeyForMajor("not-a-real-major")).toBe("undecided");
    expect(findMajor("not-a-real-major")).toBeNull();
  });

  it("returns specializations for majors that have them", () => {
    const specs = specializationsForMajor("computer-science").map((s) => s.key);
    expect(specs).toContain("ai");
    expect(specs).toContain("cybersecurity");
  });

  it("lists majors for an area", () => {
    const engMajors = majorsForArea("engineering").map((m) => m.key);
    expect(engMajors).toContain("civil-engineering");
    expect(engMajors).toContain("biomedical-engineering");
  });
});
