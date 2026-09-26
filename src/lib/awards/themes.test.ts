import { describe, expect, it } from "vitest";
import { coerceThemes, themesForActivity, themesForAwardText } from "./themes";

describe("themesForAwardText — deterministic classification", () => {
  it("classifies a CS award", () => {
    expect(
      themesForAwardText("Congressional App Challenge — District Winner"),
    ).toContain("cs-ai");
  });

  it("classifies a math competition as quantitative", () => {
    expect(themesForAwardText("AMC 12 — School Honor Roll")).toContain(
      "quantitative",
    );
  });

  it("classifies a research award", () => {
    expect(
      themesForAwardText("Regeneron Science Talent Search Scholar"),
    ).toContain("research");
  });

  it("returns [] for unrecognizable text (never fabricates a theme)", () => {
    expect(themesForAwardText("The Zorblax Prize")).toEqual([]);
  });

  it("can assign multiple themes at once", () => {
    const themes = themesForAwardText(
      "Founder award for a community service nonprofit",
    );
    expect(themes).toContain("leadership");
    expect(themes).toContain("service");
  });

  // ── Whole-word matching: guard against substring false positives ──
  it("does NOT read 'designed' as design/creativity (word-boundary)", () => {
    const themes = themesForAwardText("I designed and coded a mobile app");
    expect(themes).toContain("cs-ai"); // "app"/"coding"→ still CS
    expect(themes).not.toContain("creativity"); // "designed" ≠ "design"
  });

  it("does NOT read 'artificial intelligence' as art/creativity", () => {
    const themes = themesForAwardText(
      "Artificial intelligence research project",
    );
    expect(themes).toContain("cs-ai");
    expect(themes).toContain("research");
    expect(themes).not.toContain("creativity"); // "artificial" ≠ "art"
  });

  it("does NOT read a debate 'tournament' as athletics", () => {
    const themes = themesForAwardText(
      "Debate team captain who organizes tournaments",
    );
    expect(themes).toContain("leadership"); // "captain"
    expect(themes).not.toContain("athletics"); // "tournament" is not an athletics keyword
  });

  it("still matches genuine athletics text", () => {
    expect(themesForAwardText("Varsity soccer all-state selection")).toContain(
      "athletics",
    );
  });

  it("still matches genuine design/creativity text", () => {
    expect(themesForAwardText("Graphic design portfolio award")).toContain(
      "creativity",
    );
  });
});

describe("themesForActivity — category + keyword + leadership", () => {
  it("reads a robotics club as cs-ai even though 'clubs' carries no theme", () => {
    expect(
      themesForActivity({ name: "Robotics Club", category: "clubs" }),
    ).toContain("cs-ai");
  });

  it("adds leadership when a leadership role is present", () => {
    expect(
      themesForActivity({
        name: "Debate Team",
        category: "clubs",
        leadershipRole: "President",
      }),
    ).toContain("leadership");
  });

  it("maps volunteering category to service", () => {
    expect(
      themesForActivity({ name: "Food Bank", category: "volunteering" }),
    ).toContain("service");
  });
});

describe("coerceThemes", () => {
  it("keeps valid theme keys and drops junk", () => {
    expect(coerceThemes(["cs-ai", "nonsense", "service"])).toEqual([
      "cs-ai",
      "service",
    ]);
  });

  it("handles null/undefined", () => {
    expect(coerceThemes(null)).toEqual([]);
    expect(coerceThemes(undefined)).toEqual([]);
  });
});
