import { describe, expect, it } from "vitest";
import { buildRecognitionProfile } from "./recognition";
import type { AwardRecord } from "./types";

function award(
  partial: Partial<AwardRecord> & { id: string; name: string },
): AwardRecord {
  return {
    organization: "",
    year: "",
    level: "",
    category: "",
    placement: "",
    grade: "",
    selectivityContext: "",
    description: "",
    evidenceUrl: null,
    studentExplanation: "",
    ...partial,
  };
}

describe("buildRecognitionProfile — the deterministic Recognition Map (AWARDS only)", () => {
  it("marks a theme with two awards as strongly demonstrated", () => {
    const profile = buildRecognitionProfile({
      awards: [
        award({
          id: "a1",
          name: "Congressional App Challenge Winner",
          level: "regional",
        }),
        award({
          id: "a2",
          name: "State Hackathon — 1st Place",
          level: "state-national",
        }),
      ],
      fieldKey: "cs",
    });
    const cs = profile.demonstrated.find((d) => d.theme === "cs-ai");
    expect(cs?.strength).toBe("strong");
    expect(cs?.awardIds).toEqual(["a1", "a2"]);
  });

  it("gaps are field-relevant themes the AWARDS don't cover (activities ignored)", () => {
    const profile = buildRecognitionProfile({
      awards: [award({ id: "a1", name: "Coding award", level: "school" })], // cs-ai
      fieldKey: "cs", // field values cs-ai, quantitative, research
    });
    const themes = profile.gaps.map((g) => g.theme);
    expect(themes).toContain("quantitative");
    expect(themes).toContain("research");
    expect(themes).not.toContain("cs-ai"); // already has a CS award
  });

  it("does NOT flag a gap for a field theme that already has an award", () => {
    const profile = buildRecognitionProfile({
      awards: [
        award({ id: "a1", name: "Community Service Award", level: "regional" }),
      ],
      fieldKey: "polisci", // values leadership, service, academic
    });
    expect(profile.gaps.find((g) => g.theme === "service")).toBeUndefined();
  });

  it("does NOT invent gaps from non-field themes", () => {
    // A CS student with a CS award: leadership/service are not CS field themes,
    // so they are never surfaced as recognition gaps here (that's not this
    // section's job — activities live elsewhere).
    const profile = buildRecognitionProfile({
      awards: [award({ id: "a1", name: "Hackathon Winner" })],
      fieldKey: "cs",
    });
    const themes = profile.gaps.map((g) => g.theme);
    expect(themes).not.toContain("leadership");
    expect(themes).not.toContain("service");
    expect(themes).not.toContain("athletics");
  });

  it("flags redundant awards that only reinforce an existing theme", () => {
    const profile = buildRecognitionProfile({
      awards: [
        award({ id: "a1", name: "Coding Competition Winner" }),
        award({ id: "a2", name: "Another Programming Contest Winner" }),
      ],
      fieldKey: "cs",
    });
    // Both awards share the cs-ai theme → each reinforces the other.
    expect(profile.redundantAwardIds).toContain("a1");
    expect(profile.redundantAwardIds).toContain("a2");
  });

  it("uncoveredFieldThemes mirrors the gap themes (for the finder)", () => {
    const profile = buildRecognitionProfile({
      awards: [award({ id: "a1", name: "Coding award" })], // cs-ai only
      fieldKey: "cs",
    });
    expect(profile.uncoveredFieldThemes).toContain("quantitative");
    expect(profile.uncoveredFieldThemes).toContain("research");
    expect(profile.uncoveredFieldThemes).not.toContain("cs-ai");
    expect([...profile.uncoveredFieldThemes].sort()).toEqual(
      profile.gaps.map((g) => g.theme).sort(),
    );
  });

  it("handles a student with no awards", () => {
    const profile = buildRecognitionProfile({ awards: [], fieldKey: "cs" });
    expect(profile.totalAwards).toBe(0);
    expect(profile.demonstrated).toEqual([]);
    // With no awards, every field theme is an (award) recognition gap.
    expect(profile.gaps.map((g) => g.theme)).toContain("cs-ai");
  });
});
