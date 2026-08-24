import { describe, expect, it } from "vitest";
import {
  buildFitNarrative,
  type CollegeFitFacets,
  type StudentFitContext,
} from "./fit-narrative";
import type { FieldFit } from "./types";

const fieldFit = (over: Partial<FieldFit> = {}): FieldFit => ({
  fieldKey: "cs",
  rating: "unknown",
  rationale: "",
  hasData: false,
  verified: false,
  resources: [],
  ...over,
});

const student: StudentFitContext = {
  majorLabel: "Computer Science / AI",
  careerInterest: "software engineering",
  activities: [
    { category: "sports", name: "Varsity Soccer", leadershipRole: "Captain" },
    { category: "personal-project", name: "Weather app", leadershipRole: null },
  ],
};

const noFacets: CollegeFitFacets = {
  setting: null,
  campusLife: null,
  diversity: null,
  opportunities: null,
  vibe: null,
  careerFit: null,
  verified: false,
};

const fullFacets: CollegeFitFacets = {
  setting: "urban",
  campusLife: "Residential houses anchor social life.",
  diversity: "One of the most international student bodies in the Ivy League.",
  opportunities: "Undergrad research funding is widely available.",
  vibe: "Intense, intellectual, and city-driven.",
  careerFit: "Strong tech recruiting pipeline into NYC.",
  verified: true,
};

describe("buildFitNarrative — real reasons, no admission repetition", () => {
  it("NEVER restates the admission chance or category", () => {
    const out = buildFitNarrative({
      collegeName: "Columbia University",
      fieldFit: fieldFit(),
      student,
      facets: fullFacets,
    }).join(" ");
    expect(out).not.toMatch(/chance/i);
    expect(out).not.toMatch(/reach|target|safety/i);
    expect(out).not.toMatch(/AppGap estimates/i);
    expect(out).not.toMatch(/%/);
  });

  it("LEADS with the verified school qualities (vibe/campus life/etc.)", () => {
    const out = buildFitNarrative({
      collegeName: "Columbia University",
      fieldFit: fieldFit({ hasData: true, rating: "excellent" }),
      student,
      facets: fullFacets,
    });
    // First lines are the real reasons, not the student's stats.
    expect(out[0]).toBe("Intense, intellectual, and city-driven.");
    const joined = out.join(" ");
    expect(joined).toMatch(/Residential houses anchor social life/);
    expect(joined).toMatch(/international student bodies/);
    expect(joined).toMatch(/research funding/);
    expect(joined).toMatch(/recruiting pipeline/);
    expect(joined).toMatch(/urban campus/);
  });

  it("still connects to the student's field and activities", () => {
    const out = buildFitNarrative({
      collegeName: "Columbia University",
      fieldFit: fieldFit({ hasData: true, rating: "excellent" }),
      student,
      facets: fullFacets,
    }).join(" ");
    expect(out).toMatch(/study Computer Science \/ AI/);
    expect(out).toMatch(/software engineering/);
    expect(out).toMatch(/rated excellent/);
    expect(out).toMatch(/athletics/);
    expect(out).toMatch(/personal project/);
    expect(out).toMatch(/leadership role/);
  });

  it("does NOT fabricate school qualities when nothing is verified", () => {
    const out = buildFitNarrative({
      collegeName: "Columbia University",
      fieldFit: fieldFit(),
      student,
      facets: noFacets,
    }).join(" ");
    expect(out).toMatch(/verified detail/); // honest placeholder
    expect(out).not.toMatch(/rated (excellent|strong|moderate|limited)/);
  });

  it("renders school qualities even with no student profile", () => {
    const out = buildFitNarrative({
      collegeName: "Columbia University",
      fieldFit: null,
      student: null,
      facets: fullFacets,
    }).join(" ");
    expect(out).toMatch(/Intense, intellectual/);
    expect(out).not.toMatch(/You bring/);
    expect(out).not.toMatch(/verified detail/); // facets exist → no placeholder
  });
});
