import { describe, expect, it } from "vitest";
import { buildAtlasLink } from "./link";

describe("buildAtlasLink", () => {
  it("builds the documented example URL exactly", () => {
    const url = buildAtlasLink({
      grade: 11,
      state: "VA",
      interests: ["Biology", "Computer Science"],
    });
    expect(url).toBe(
      "https://www.atlasofopportunity.org/finder?grade=11&state=VA&interests=%5B%22Biology%22%2C%22Computer+Science%22%5D&ref=appgap",
    );
  });

  it("always includes ref=appgap, even with no params", () => {
    expect(buildAtlasLink()).toBe(
      "https://www.atlasofopportunity.org/finder?ref=appgap",
    );
    expect(buildAtlasLink({})).toBe(
      "https://www.atlasofopportunity.org/finder?ref=appgap",
    );
  });

  it("emits params in a stable order (grade, state, interests, ref)", () => {
    const url = buildAtlasLink({
      interests: ["Math"],
      state: "ny",
      grade: 9,
    });
    const query = url.split("?")[1];
    expect(query.startsWith("grade=9&state=NY&interests=")).toBe(true);
    expect(query.endsWith("&ref=appgap")).toBe(true);
  });

  it("omits grade outside 6–12 or non-integer", () => {
    for (const grade of [5, 13, 0, -1, 11.5, Number.NaN]) {
      expect(buildAtlasLink({ grade })).not.toContain("grade=");
    }
    expect(buildAtlasLink({ grade: 6 })).toContain("grade=6");
    expect(buildAtlasLink({ grade: 12 })).toContain("grade=12");
  });

  it("omits grade when null/undefined", () => {
    expect(buildAtlasLink({ grade: null })).not.toContain("grade=");
    expect(buildAtlasLink({ grade: undefined })).not.toContain("grade=");
  });

  it("uppercases and validates state, accepting DC and INTL", () => {
    expect(buildAtlasLink({ state: "ca" })).toContain("state=CA");
    expect(buildAtlasLink({ state: " dc " })).toContain("state=DC");
    expect(buildAtlasLink({ state: "intl" })).toContain("state=INTL");
  });

  it("omits unknown state values", () => {
    for (const state of ["ZZ", "XX", "USA", "", "California"]) {
      expect(buildAtlasLink({ state })).not.toContain("state=");
    }
  });

  it("drops interests not in the Atlas list", () => {
    const url = buildAtlasLink({
      interests: ["Biology", "Underwater Basket Weaving", "Math"],
    });
    const interests = JSON.parse(
      new URL(url).searchParams.get("interests") as string,
    );
    expect(interests).toEqual(["Biology", "Math"]);
  });

  it("de-duplicates interests, preserving first-seen order", () => {
    const url = buildAtlasLink({
      interests: ["Physics", "Math", "Physics"],
    });
    const interests = JSON.parse(
      new URL(url).searchParams.get("interests") as string,
    );
    expect(interests).toEqual(["Physics", "Math"]);
  });

  it("omits the interests param entirely when none are valid or empty", () => {
    expect(buildAtlasLink({ interests: [] })).not.toContain("interests=");
    expect(buildAtlasLink({ interests: ["Nope"] })).not.toContain("interests=");
    expect(buildAtlasLink({ interests: null })).not.toContain("interests=");
  });

  it("preserves the exact spelling of 'AI / Machine Learning'", () => {
    const url = buildAtlasLink({ interests: ["AI / Machine Learning"] });
    const interests = JSON.parse(
      new URL(url).searchParams.get("interests") as string,
    );
    expect(interests).toEqual(["AI / Machine Learning"]);
  });
});
