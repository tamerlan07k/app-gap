import { describe, expect, it } from "vitest";
import {
  buildChecklist,
  coverageSummaryItem,
  wordCountItem,
} from "./checklist";
import type { GradedDirective } from "./scoring";

describe("wordCountItem", () => {
  it("flags over the limit as missing", () => {
    const item = wordCountItem(300, 250);
    expect(item.state).toBe("missing");
    expect(item.detail).toMatch(/over the limit/);
  });
  it("warns when well under the limit", () => {
    expect(wordCountItem(100, 250).state).toBe("warn");
  });
  it("is ok when comfortably within the limit", () => {
    expect(wordCountItem(230, 250).state).toBe("ok");
  });
  it("is unknown with no limit", () => {
    expect(wordCountItem(230, null).state).toBe("unknown");
  });
});

describe("coverageSummaryItem", () => {
  const mk = (statuses: GradedDirective["status"][]): GradedDirective[] =>
    statuses.map((status, i) => ({ directive: `d${i}`, status }));

  it("is unknown with no directives", () => {
    expect(coverageSummaryItem([]).state).toBe("unknown");
  });
  it("is ok when all addressed", () => {
    const item = coverageSummaryItem(mk(["addressed", "addressed"]));
    expect(item.state).toBe("ok");
    expect(item.detail).toBe("2 of 2 addressed");
  });
  it("warns at half coverage and flags missing below half", () => {
    // 1 of 2 addressed → ratio 0.5 → warn
    expect(coverageSummaryItem(mk(["addressed", "missing"])).state).toBe(
      "warn",
    );
    // 1 of 3 addressed → ratio 0.33 → missing
    expect(
      coverageSummaryItem(mk(["missing", "missing", "addressed"])).state,
    ).toBe("missing");
  });
});

describe("buildChecklist", () => {
  it("produces one directive row per directive and the four summary rows", () => {
    const { directives, summary } = buildChecklist({
      directives: [
        { directive: "a", status: "addressed" },
        { directive: "b", status: "missing" },
      ],
      wordCount: 200,
      wordLimit: 250,
      collegeSpecificity: "weak",
      repetition: "repetitive",
    });
    expect(directives).toHaveLength(2);
    expect(summary).toHaveLength(4);
    // college specificity "weak" → missing; repetition "repetitive" → missing.
    const labels = summary.map((s) => s.label);
    expect(labels).toContain("College specificity");
    expect(labels).toContain("Application repetition");
  });
});
