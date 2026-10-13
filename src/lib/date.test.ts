import { describe, expect, it } from "vitest";
import { isoAddDays, isoDaysBetween, isoFromYMD, toISODate } from "./date";

describe("toISODate — resolves in ET, not UTC", () => {
  it("8:30pm ET on Oct 12 is still Oct 12 (not Oct 13 as UTC would give)", () => {
    // Oct 13 2026 00:30 UTC === Oct 12 2026 20:30 EDT.
    const instant = new Date("2026-10-13T00:30:00Z");
    expect(toISODate(instant)).toBe("2026-10-12");
  });

  it("just after ET midnight rolls to the new day", () => {
    // Oct 13 2026 04:30 UTC === Oct 13 2026 00:30 EDT.
    expect(toISODate(new Date("2026-10-13T04:30:00Z"))).toBe("2026-10-13");
  });
});

describe("iso date math", () => {
  it("adds days across a month boundary", () => {
    expect(isoAddDays("2026-10-30", 5)).toBe("2026-11-04");
  });
  it("is stable across a US DST change (Nov 1 2026)", () => {
    expect(isoAddDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(isoDaysBetween("2026-10-31", "2026-11-02")).toBe(2);
  });
  it("counts whole days between dates", () => {
    expect(isoDaysBetween("2026-09-15", "2026-11-01")).toBe(47);
  });
  it("builds an ISO date from components", () => {
    expect(isoFromYMD(2026, 1, 1)).toBe("2026-01-01");
  });
});
