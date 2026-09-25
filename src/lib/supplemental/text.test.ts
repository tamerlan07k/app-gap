import { describe, expect, it } from "vitest";
import { countWords, extractWordLimit } from "./text";

describe("countWords", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("hello world")).toBe(2);
    expect(countWords("  spaced   out\nlines\ttabs ")).toBe(4);
  });
  it("is 0 for empty/whitespace", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n ")).toBe(0);
  });
});

describe("extractWordLimit", () => {
  it("finds a stated word limit", () => {
    expect(extractWordLimit("Answer in 250 words.")).toBe(250);
    expect(extractWordLimit("In 150-word response…")).toBe(150);
    expect(extractWordLimit("Maximum of 500 words")).toBe(500);
  });
  it("takes the ceiling of a range", () => {
    expect(extractWordLimit("Between 250 and 650 words")).toBe(650);
  });
  it("returns null when none stated", () => {
    expect(extractWordLimit("Tell us about yourself.")).toBeNull();
    expect(extractWordLimit("")).toBeNull();
  });
  it("ignores implausible numbers", () => {
    expect(extractWordLimit("In the year 5000 words meant nothing")).toBeNull();
  });
});
