import { describe, expect, it } from "vitest";
import {
  applicableRows,
  resolveScoped,
  rowAppliesToTarget,
  type ScopedRow,
} from "./requirement-scope";

type Row = ScopedRow & { subject: string; label: string };

const row = (
  scope: ScopedRow["scope"],
  ids: Partial<Pick<ScopedRow, "schoolId" | "programId" | "trackId">>,
  subject: string,
  label: string,
): Row => ({
  scope,
  schoolId: ids.schoolId ?? null,
  programId: ids.programId ?? null,
  trackId: ids.trackId ?? null,
  subject,
  label,
});

const noTarget = { schoolId: null, programId: null, trackId: null };

describe("rowAppliesToTarget — the no-leak guarantee", () => {
  it("university rows apply to any target at the college", () => {
    expect(
      rowAppliesToTarget(row("university", {}, "math", "u"), noTarget),
    ).toBe(true);
  });

  it("a school row NEVER applies to a different or unset school", () => {
    const r = row("school", { schoolId: "A" }, "math", "s");
    expect(rowAppliesToTarget(r, { ...noTarget, schoolId: "A" })).toBe(true);
    expect(rowAppliesToTarget(r, { ...noTarget, schoolId: "B" })).toBe(false);
    expect(rowAppliesToTarget(r, noTarget)).toBe(false);
  });

  it("a program row NEVER applies to a different or unset program", () => {
    const r = row("program", { programId: "X" }, "math", "p");
    expect(rowAppliesToTarget(r, { ...noTarget, programId: "X" })).toBe(true);
    expect(rowAppliesToTarget(r, { ...noTarget, programId: "Y" })).toBe(false);
    expect(rowAppliesToTarget(r, noTarget)).toBe(false);
  });

  it("a track row NEVER applies to a different or unset track", () => {
    const r = row("track", { trackId: "T1" }, "arts", "t");
    expect(rowAppliesToTarget(r, { ...noTarget, trackId: "T1" })).toBe(true);
    expect(rowAppliesToTarget(r, { ...noTarget, trackId: "T2" })).toBe(false);
  });
});

describe("applicableRows — cross-scope isolation", () => {
  it("returns university + only the matching narrower rows", () => {
    const rows = [
      row("university", {}, "english", "u"),
      row("school", { schoolId: "A" }, "math", "sA"),
      row("school", { schoolId: "B" }, "math", "sB"),
      row("program", { programId: "X" }, "physics", "pX"),
    ];
    // Applicant to school A, program X.
    const out = applicableRows(rows, {
      schoolId: "A",
      programId: "X",
      trackId: null,
    }).map((r) => r.label);
    expect(out).toEqual(["u", "sA", "pX"]);
    // The other school's row is never present.
    expect(out).not.toContain("sB");
  });
});

describe("resolveScoped — specificity precedence", () => {
  const rows = [
    row("university", {}, "math", "univ-math"),
    row("program", { programId: "X" }, "math", "prog-math"),
    row("university", {}, "english", "univ-english"),
  ];
  const keyOf = (r: Row) => r.subject;

  it("a more specific scope overrides a broader one for the same concern", () => {
    const out = resolveScoped(
      rows,
      { schoolId: null, programId: "X", trackId: null },
      keyOf,
    );
    const math = out.find((r) => r.subject === "math");
    expect(math?.label).toBe("prog-math"); // program beats university
    expect(out.find((r) => r.subject === "english")?.label).toBe(
      "univ-english",
    );
  });

  it("falls back to the broader scope when the specific target doesn't match", () => {
    const out = resolveScoped(
      rows,
      { schoolId: null, programId: "Y", trackId: null },
      keyOf,
    );
    expect(out.find((r) => r.subject === "math")?.label).toBe("univ-math");
  });

  it("returns nothing when no rows apply", () => {
    expect(resolveScoped([], noTarget, keyOf)).toEqual([]);
  });
});
