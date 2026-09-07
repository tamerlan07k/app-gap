import { describe, expect, it } from "vitest";
import { preparationAreasForField } from "./field-requirements";

describe("preparationAreasForField", () => {
  it("is field-specific — CS and humanities differ", () => {
    const cs = preparationAreasForField("cs").map((a) => a.key);
    const hum = preparationAreasForField("humanities").map((a) => a.key);
    expect(cs).toContain("cs-calculus");
    expect(cs).toContain("cs-computing");
    expect(hum).toContain("hum-english");
    expect(hum).not.toContain("cs-calculus");
  });

  it("marks calculus core for CS and English core for humanities", () => {
    const csCalc = preparationAreasForField("cs").find(
      (a) => a.key === "cs-calculus",
    );
    expect(csCalc?.importance).toBe("core");
    const humEng = preparationAreasForField("humanities").find(
      (a) => a.key === "hum-english",
    );
    expect(humEng?.importance).toBe("core");
  });

  it("gives undecided students NO core areas (so no forced gaps)", () => {
    const und = preparationAreasForField("undecided");
    expect(und.length).toBeGreaterThan(0);
    expect(und.every((a) => a.importance !== "core")).toBe(true);
  });

  it("never assumes specific advanced courses are universally available", () => {
    const csCalc = preparationAreasForField("cs").find(
      (a) => a.key === "cs-calculus",
    );
    // Calculus is core but must NOT be flagged universally-available, so its
    // absence under uncertainty can never become a gap.
    expect(csCalc?.universallyAvailable).toBe(false);
  });

  it("falls back to the undecided set for an unknown field key", () => {
    // @ts-expect-error — exercising the runtime fallback path deliberately.
    const out = preparationAreasForField("not-a-field");
    expect(out).toEqual(preparationAreasForField("undecided"));
  });
});
