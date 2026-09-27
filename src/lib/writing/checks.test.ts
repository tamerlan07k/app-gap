import { describe, expect, it } from "vitest";
import {
  ACTIVITY_CHAR_LIMIT,
  activityObjectiveIssues,
  countChars,
  enforceActivityCharLimit,
  isActivityOverLimit,
  isValidTightenedActivity,
} from "./checks";

// Build a string of exactly `n` characters.
const chars = (n: number) => "a".repeat(n);

describe("countChars", () => {
  it("counts by Unicode code point, not UTF-16 unit", () => {
    expect(countChars("")).toBe(0);
    expect(countChars("a")).toBe(1);
    expect(countChars("hello")).toBe(5);
    // An emoji is a single field character even though it's a surrogate pair.
    expect(countChars("😀")).toBe(1);
    expect(countChars("café")).toBe(4);
  });
});

describe("isActivityOverLimit — analysis must run at ANY length", () => {
  it("empty and short descriptions are not over the limit", () => {
    expect(isActivityOverLimit("")).toBe(false);
    expect(isActivityOverLimit("a")).toBe(false);
  });

  it("exactly 150 characters is NOT over the limit", () => {
    expect(countChars(chars(ACTIVITY_CHAR_LIMIT))).toBe(150);
    expect(isActivityOverLimit(chars(ACTIVITY_CHAR_LIMIT))).toBe(false);
  });

  it("151 characters IS over the limit", () => {
    expect(isActivityOverLimit(chars(ACTIVITY_CHAR_LIMIT + 1))).toBe(true);
  });

  it("significantly over the limit is over the limit", () => {
    expect(isActivityOverLimit(chars(280))).toBe(true);
  });
});

describe("activityObjectiveIssues flags over-limit but still returns for analysis", () => {
  it("flags an over-limit description without suppressing it", () => {
    const issues = activityObjectiveIssues(chars(200));
    expect(issues.some((i) => i.kind === "over-char-limit")).toBe(true);
  });

  it("does not flag a 150-char description as over-limit", () => {
    const issues = activityObjectiveIssues(chars(ACTIVITY_CHAR_LIMIT));
    expect(issues.some((i) => i.kind === "over-char-limit")).toBe(false);
  });
});

describe("isValidTightenedActivity — verify ≤150 before displaying", () => {
  it("rejects null/undefined/empty/whitespace", () => {
    expect(isValidTightenedActivity(null)).toBe(false);
    expect(isValidTightenedActivity(undefined)).toBe(false);
    expect(isValidTightenedActivity("")).toBe(false);
    expect(isValidTightenedActivity("   ")).toBe(false);
  });

  it("accepts a non-empty tightened version within the limit", () => {
    expect(isValidTightenedActivity("Led a 12-student robotics team")).toBe(
      true,
    );
    expect(isValidTightenedActivity(chars(ACTIVITY_CHAR_LIMIT))).toBe(true);
  });

  it("rejects a 'tightened' version that is itself over the limit", () => {
    expect(isValidTightenedActivity(chars(ACTIVITY_CHAR_LIMIT + 1))).toBe(
      false,
    );
  });

  it("counts trimmed length so trailing whitespace can't hide overflow", () => {
    // 150 real chars plus padding: trimmed is exactly 150 → valid.
    expect(isValidTightenedActivity(`  ${chars(ACTIVITY_CHAR_LIMIT)}  `)).toBe(
      true,
    );
  });
});

describe("enforceActivityCharLimit — suggestions never cross 150", () => {
  it("returns null-ish input as empty string", () => {
    expect(enforceActivityCharLimit(null)).toBe("");
    expect(enforceActivityCharLimit(undefined)).toBe("");
    expect(enforceActivityCharLimit("   ")).toBe("");
  });

  it("leaves a within-limit rewrite unchanged (aside from trimming)", () => {
    const fits = "Led a 12-student robotics team to the state final.";
    expect(enforceActivityCharLimit(fits)).toBe(fits);
    expect(enforceActivityCharLimit(`  ${fits}  `)).toBe(fits);
    expect(enforceActivityCharLimit(chars(ACTIVITY_CHAR_LIMIT))).toBe(
      chars(ACTIVITY_CHAR_LIMIT),
    );
  });

  it("ALWAYS returns ≤150 characters, whatever the model returns", () => {
    const overSamples = [
      chars(ACTIVITY_CHAR_LIMIT + 1),
      chars(200),
      chars(500),
      `${"word ".repeat(60)}`, // 300 chars of real words + spaces
      "supercalifragilisticexpialidocious".repeat(10), // one giant token
    ];
    for (const s of overSamples) {
      expect(countChars(enforceActivityCharLimit(s))).toBeLessThanOrEqual(
        ACTIVITY_CHAR_LIMIT,
      );
    }
  });

  it("backs off to a whole word instead of chopping mid-word", () => {
    // 148 chars ending a word, then a long word that would overflow.
    const base = `${"ab ".repeat(49)}`.trim(); // "ab ab ... ab" = 49*3-1 = 146 chars
    const input = `${base} overflowingtail`;
    const out = enforceActivityCharLimit(input);
    expect(countChars(out)).toBeLessThanOrEqual(ACTIVITY_CHAR_LIMIT);
    // The dropped word was whole — no partial "overflow…" fragment remains.
    expect(out.endsWith("overflowingtail")).toBe(false);
    expect(/\bab\b$/.test(out)).toBe(true);
  });

  it("strips a separator left dangling by the cut", () => {
    const input = `${"impact, ".repeat(30)}`; // ends in ", " repeatedly, > 150
    const out = enforceActivityCharLimit(input);
    expect(countChars(out)).toBeLessThanOrEqual(ACTIVITY_CHAR_LIMIT);
    expect(/[\s,;:.·|/\\–—-]$/u.test(out)).toBe(false);
  });
});
