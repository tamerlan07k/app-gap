import { describe, expect, it } from "vitest";
import { deriveCollegeSignal, summarizeProgress } from "./status";

describe("summarizeProgress", () => {
  it("tallies statuses", () => {
    const p = summarizeProgress([
      "finalized",
      "finalized",
      "needs_revision",
      "drafting",
      "not_started",
    ]);
    expect(p).toEqual({
      total: 5,
      finalized: 2,
      needsRevision: 1,
      drafting: 1,
      notStarted: 1,
    });
  });
});

describe("deriveCollegeSignal", () => {
  it("is not_started with no essays", () => {
    expect(deriveCollegeSignal([])).toBe("not_started");
  });
  it("is not_started when all untouched", () => {
    expect(deriveCollegeSignal(["not_started", "not_started"])).toBe(
      "not_started",
    );
  });
  it("prioritizes needs_revision", () => {
    expect(deriveCollegeSignal(["finalized", "needs_revision"])).toBe(
      "needs_revision",
    );
  });
  it("is strong when all finalized", () => {
    expect(deriveCollegeSignal(["finalized", "finalized"])).toBe("strong");
  });
  it("is developing when some in progress", () => {
    expect(deriveCollegeSignal(["finalized", "drafting"])).toBe("developing");
    expect(deriveCollegeSignal(["drafting", "not_started"])).toBe("developing");
  });
});
