import { describe, expect, it } from "vitest";
import { assessAdmission } from "./assessment";
import { deriveApplicantStrength, neutralStrength } from "./strength";
import type { CollegeStats, MatchProfile, TestPolicy } from "./types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Columbia-like: ~4% admit, ultra-selective. Real data has gpa_avg = null.
const ULTRA: CollegeStats = {
  admitRate: 0.04,
  satEbrw25: 730,
  satEbrw75: 770,
  satMath25: 760,
  satMath75: 800, // total middle-50%: 1490–1570, mid 1530
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// Selective private: ~30% admit.
const SELECTIVE: CollegeStats = {
  admitRate: 0.3,
  satEbrw25: 660,
  satEbrw75: 730,
  satMath25: 680,
  satMath75: 770, // total 1340–1500, mid 1420
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// Accessible public: ~70% admit.
const ACCESSIBLE: CollegeStats = {
  admitRate: 0.7,
  satEbrw25: 570,
  satEbrw75: 660,
  satMath25: 560,
  satMath75: 670, // total 1130–1330, mid 1230
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// A stronger holistic profile (AppGap ~89) and a weaker one (AppGap ~74),
// derived from cached LLM component scores.
const STRENGTH_89 = deriveApplicantStrength({
  academics: { score: 92 },
  activities: { score: 90 },
  awards: { score: 85 },
});
const STRENGTH_74 = deriveApplicantStrength({
  academics: { score: 78 },
  activities: { score: 62 },
  awards: { score: 55 },
});

const profileSat = (sat: number | null): MatchProfile => ({
  unweightedGpa: null,
  satScore: sat,
  actScore: null,
});

const opts = (testPolicy: TestPolicy) => ({ testPolicy });

// ─── Core bug: 74 vs 89 at a ~4% school with the SAME SAT ────────────────────

describe("74 vs 89 profile at a ~4% school (the reported bug)", () => {
  const sat = 1530; // at Columbia's median → academic position ≈ 0
  const a74 = assessAdmission(profileSat(sat), ULTRA, STRENGTH_74);
  const a89 = assessAdmission(profileSat(sat), ULTRA, STRENGTH_89);

  it("no longer collapses both to an identical 1%", () => {
    expect(a74.chance).not.toBeCloseTo(a89.chance ?? -1, 5);
    expect(a89.chance ?? 0).toBeGreaterThan(a74.chance ?? 0);
  });

  it("produces DIFFERENT ranges", () => {
    expect(a89.chanceRange).not.toEqual(a74.chanceRange);
  });

  it("keeps BOTH a High Reach (stronger profile does not buy in)", () => {
    expect(a74.category).toBe("reach");
    expect(a89.category).toBe("reach");
    expect(a74.displayCategory).toBe("High Reach");
    expect(a89.displayCategory).toBe("High Reach");
  });

  it("never awards a high probability just because AppGap is high", () => {
    // Even the strong profile stays well under the selectivity ceiling.
    expect(a89.chance ?? 1).toBeLessThan(0.25);
  });

  it("caps confidence at ultra-selective schools (inherent uncertainty)", () => {
    expect(a89.confidence).not.toBe("high");
  });
});

// ─── Same profile across the selectivity spectrum ────────────────────────────

describe("the same strong profile moves across categories as selectivity drops", () => {
  it("~30% school: an above-median strong profile is a Target with real odds", () => {
    const r = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    expect(["target", "safety"]).toContain(r.category);
    // Nothing sub-35% admit is a true safety.
    expect(r.category).toBe("target");
    expect(r.chance ?? 0).toBeGreaterThan(0.35);
  });

  it("~70% school: a well-above-median strong profile is a Safety", () => {
    const r = assessAdmission(profileSat(1400), ACCESSIBLE, STRENGTH_89);
    expect(r.category).toBe("safety");
    expect(r.chance ?? 0).toBeGreaterThan(0.75);
  });

  it("strength moves the needle far MORE at less-selective schools", () => {
    const strongUltra = assessAdmission(profileSat(1530), ULTRA, STRENGTH_89);
    const weakUltra = assessAdmission(profileSat(1530), ULTRA, STRENGTH_74);
    const strongMid = assessAdmission(profileSat(1420), SELECTIVE, STRENGTH_89);
    const weakMid = assessAdmission(profileSat(1420), SELECTIVE, STRENGTH_74);
    const ultraGap = (strongUltra.chance ?? 0) - (weakUltra.chance ?? 0);
    const midGap = (strongMid.chance ?? 0) - (weakMid.chance ?? 0);
    expect(midGap).toBeGreaterThan(ultraGap);
  });
});

// ─── Missing / partial data behaviour ────────────────────────────────────────

describe("missing SAT", () => {
  const r = assessAdmission(profileSat(null), SELECTIVE, STRENGTH_89);
  it("still produces a rating from holistic + selectivity", () => {
    expect(r.chanceRange).not.toBeNull();
    expect(r.category).not.toBe("unrated");
  });
  it("lowers confidence and flags the missing score", () => {
    expect(r.confidence).not.toBe("high");
    expect(r.lowConfidence).toBe(true);
    expect(r.drivers.some((d) => /test score/i.test(d.text))).toBe(true);
  });
});

describe("test-optional college with no score", () => {
  const r = assessAdmission(
    profileSat(null),
    SELECTIVE,
    STRENGTH_89,
    opts("optional"),
  );
  it("does not penalize the student for a missing score", () => {
    expect(r.drivers.some((d) => /test-optional/i.test(d.text))).toBe(true);
    // Test-optional partial-credit keeps completeness above the score-required case.
    const required = assessAdmission(
      profileSat(null),
      SELECTIVE,
      STRENGTH_89,
      opts("required"),
    );
    expect(r.dataCompleteness).toBeGreaterThan(required.dataCompleteness);
  });
});

describe("test-blind college ignores a submitted score", () => {
  it("does not use the SAT even when present", () => {
    const blind = assessAdmission(
      profileSat(1600),
      SELECTIVE,
      STRENGTH_74,
      opts("blind"),
    );
    const noScore = assessAdmission(
      profileSat(null),
      SELECTIVE,
      STRENGTH_74,
      opts("blind"),
    );
    expect(blind.chance).toBeCloseTo(noScore.chance ?? -1, 10);
  });
});

describe("missing GPA data (gpa_avg is null everywhere today)", () => {
  const r = assessAdmission(
    { unweightedGpa: 3.9, satScore: 1500, actScore: null },
    SELECTIVE,
    STRENGTH_89,
  );
  it("does not fabricate GPA and flags the gap", () => {
    expect(r.drivers.some((d) => /GPA data unavailable/i.test(d.text))).toBe(
      true,
    );
  });
  it("still rates the college", () => {
    expect(r.category).not.toBe("unrated");
  });
});

// ─── Guardrails: neither SAT nor AppGap may dominate ─────────────────────────

describe("very high SAT with a weak holistic profile", () => {
  it("does not let SAT alone drive a high chance at a ~4% school", () => {
    const r = assessAdmission(profileSat(1600), ULTRA, STRENGTH_74);
    expect(r.category).toBe("reach");
    expect(r.chance ?? 1).toBeLessThan(0.25); // bounded by the selectivity ceiling
  });
});

describe("strong holistic profile with below-range academics", () => {
  it("cannot rescue a student into Target at an ultra-selective school", () => {
    const r = assessAdmission(profileSat(1250), ULTRA, STRENGTH_89);
    expect(r.category).toBe("reach");
  });
  it("but a strong holistic still helps relative to a weak one", () => {
    const strong = assessAdmission(profileSat(1250), ULTRA, STRENGTH_89);
    const weak = assessAdmission(profileSat(1250), ULTRA, STRENGTH_74);
    expect(strong.chance ?? 0).toBeGreaterThan(weak.chance ?? 0);
  });
});

describe("anti-absurdity: a 70%-AppGap profile is never ~70% at a 4% school", () => {
  it("caps a mid profile far below its AppGap score", () => {
    const mid = deriveApplicantStrength({
      academics: { score: 70 },
      activities: { score: 70 },
      awards: { score: 70 },
    });
    const r = assessAdmission(profileSat(1530), ULTRA, mid);
    expect(r.chance ?? 1).toBeLessThan(0.2);
  });
});

// ─── Housekeeping ────────────────────────────────────────────────────────────

describe("unrated & determinism", () => {
  it("is unrated when the college has no admit rate (no fabricated base)", () => {
    const noRate: CollegeStats = { ...ULTRA, admitRate: null };
    const r = assessAdmission(profileSat(1530), noRate, STRENGTH_89);
    expect(r.category).toBe("unrated");
    expect(r.chanceRange).toBeNull();
  });

  it("is deterministic for identical inputs", () => {
    const a = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    const b = assessAdmission(profileSat(1500), SELECTIVE, STRENGTH_89);
    expect(a).toEqual(b);
  });

  it("neutral strength (no analysis) still rates but with lower confidence", () => {
    const r = assessAdmission(profileSat(1530), ULTRA, neutralStrength());
    expect(r.category).toBe("reach");
    expect(r.drivers.some((d) => /profile analysis/i.test(d.text))).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
//  v2.1 UNIVERSAL CALIBRATION — real production stats, no school-specific logic.
//  These lock in the audited behaviour: SAT position is a real but non-dominant
//  signal, a strong GPA counts even with no college GPA data, holistic strength
//  differentiates strong applicants, and selectivity still owns a low ceiling.
// ══════════════════════════════════════════════════════════════════════════════

// Real middle-50% (EBRW+Math) and admit rates pulled from the DB. gpa_avg is null
// for every school (College Scorecard never reports it) — mirrored here.
const realStats = (
  admitRate: number,
  p25: number | null,
  p75: number | null,
): CollegeStats => ({
  admitRate,
  satEbrw25: null,
  satEbrw75: null,
  satMath25: null,
  satMath75: null,
  satTotal25: p25,
  satTotal75: p75,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
});

// The ultra-selective tier (real p25/p75). The SAME rules must hold for all.
const TIER: { name: string; stats: CollegeStats; p25: number; p75: number }[] =
  [
    {
      name: "Stanford",
      stats: realStats(0.0361, 1510, 1580),
      p25: 1510,
      p75: 1580,
    },
    {
      name: "Harvard",
      stats: realStats(0.0365, 1510, 1580),
      p25: 1510,
      p75: 1580,
    },
    {
      name: "Yale",
      stats: realStats(0.0387, 1470, 1570),
      p25: 1470,
      p75: 1570,
    },
    {
      name: "Columbia",
      stats: realStats(0.0399, 1510, 1580),
      p25: 1510,
      p75: 1580,
    },
    {
      name: "Princeton",
      stats: realStats(0.0462, 1510, 1580),
      p25: 1510,
      p75: 1580,
    },
    { name: "MIT", stats: realStats(0.0455, 1520, 1580), p25: 1520, p75: 1580 },
    {
      name: "Brown",
      stats: realStats(0.0539, 1510, 1580),
      p25: 1510,
      p75: 1580,
    },
    { name: "Penn", stats: realStats(0.054, 1510, 1570), p25: 1510, p75: 1570 },
    {
      name: "Dartmouth",
      stats: realStats(0.054, 1500, 1570),
      p25: 1500,
      p75: 1570,
    },
    {
      name: "Cornell",
      stats: realStats(0.0876, 1500, 1570),
      p25: 1500,
      p75: 1570,
    },
  ];
const COLUMBIA = {
  name: "Columbia",
  stats: realStats(0.0399, 1510, 1580),
  p25: 1510,
  p75: 1580,
};

// Profiles keep the real GPA (4.0) and vary the SAT; strength varies by fixture.
const gpaProfile = (sat: number | null, gpa = 4.0): MatchProfile => ({
  unweightedGpa: gpa,
  satScore: sat,
  actScore: null,
});
const WEAK = deriveApplicantStrength({
  academics: { score: 45 },
  activities: { score: 30 },
  awards: { score: 20 },
}); // holistic ≈ 0.26

const optional = { testPolicy: "optional" as const };

describe("v2.1 · 74 vs 89 distinguished by holistic strength (real Columbia)", () => {
  it("1. same SAT & GPA → 89 is meaningfully stronger than 74", () => {
    const sat = 1545; // in Columbia's real 1510–1580 band
    const a74 = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      STRENGTH_74,
      optional,
    );
    const a89 = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      STRENGTH_89,
      optional,
    );
    expect(a89.chance ?? 0).toBeGreaterThan((a74.chance ?? 0) * 1.4); // clearly, not marginally
    expect(a89.chance ?? 0).toBeGreaterThan(a74.chance ?? 0);
  });

  it("5. a genuinely weak profile scores lower than the 74 (same SAT & GPA)", () => {
    const sat = 1545;
    const weak = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      WEAK,
      optional,
    );
    const a74 = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      STRENGTH_74,
      optional,
    );
    expect(weak.chance ?? 1).toBeLessThan(a74.chance ?? 0);
  });

  it("6. a 74 stays a High Reach at an Ivy-level school (no inflated odds)", () => {
    const a74 = assessAdmission(
      gpaProfile(1545),
      COLUMBIA.stats,
      STRENGTH_74,
      optional,
    );
    expect(a74.category).toBe("reach");
    expect(a74.displayCategory).toBe("High Reach");
    expect(a74.chance ?? 1).toBeLessThan(0.25); // still bounded by selectivity
  });
});

describe("v2.1 · academics component (course rigor) is a small extra signal", () => {
  // Two profiles identical in activities/awards/SAT/GPA, differing ONLY in the
  // LLM academics component score (course rigor / academic quality).
  const richCourses = deriveApplicantStrength({
    academics: { score: 95 },
    activities: { score: 70 },
    awards: { score: 70 },
  });
  const thinCourses = deriveApplicantStrength({
    academics: { score: 55 },
    activities: { score: 70 },
    awards: { score: 70 },
  });

  it("adds a little beyond GPA: stronger course rigor helps, holistic held equal", () => {
    const sat = 1545; // in-range at Columbia
    const rich = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      richCourses,
      optional,
    );
    const thin = assessAdmission(
      gpaProfile(sat),
      COLUMBIA.stats,
      thinCourses,
      optional,
    );
    expect(rich.chance ?? 0).toBeGreaterThan(thin.chance ?? 0);
  });

  it("stays SMALL: the course-rigor swing is far smaller than the SAT swing", () => {
    const sat = 1545;
    const rich =
      assessAdmission(gpaProfile(sat), COLUMBIA.stats, richCourses, optional)
        .chance ?? 0;
    const thin =
      assessAdmission(gpaProfile(sat), COLUMBIA.stats, thinCourses, optional)
        .chance ?? 0;
    const courseSwing = rich - thin;
    // Same holistic, move SAT from in-range to well-above → the academic axis's
    // dominant lever must still move the estimate more than course rigor alone.
    const lowSat =
      assessAdmission(gpaProfile(1450), COLUMBIA.stats, richCourses, optional)
        .chance ?? 0;
    const highSat =
      assessAdmission(gpaProfile(1580), COLUMBIA.stats, richCourses, optional)
        .chance ?? 0;
    expect(highSat - lowSat).toBeGreaterThan(courseSwing);
  });

  it("cannot rescue a far-below-range score into a target", () => {
    const r = assessAdmission(
      gpaProfile(1250),
      COLUMBIA.stats,
      richCourses,
      optional,
    );
    expect(r.category).toBe("reach");
  });
});

describe("v2.1 · academic position is a real but non-dominant signal", () => {
  it("2. 4.0 GPA + slightly-below-p25 SAT does NOT collapse to ~1–2%", () => {
    for (const s of TIER) {
      const sat = s.p25 - 20; // just under the published 25th percentile
      const mod = assessAdmission(
        gpaProfile(sat),
        s.stats,
        STRENGTH_74,
        optional,
      );
      const str = assessAdmission(
        gpaProfile(sat),
        s.stats,
        STRENGTH_89,
        optional,
      );
      // The reported bug: below-p25 collapsed everyone to ~1–2%. It must not.
      expect(mod.chance ?? 0).toBeGreaterThan(0.03);
      expect(str.chance ?? 0).toBeGreaterThan(0.05);
      // …but selectivity still keeps it a reach, never a target/safety.
      expect(str.category).toBe("reach");
    }
  });

  it("3. SAT exactly at p25 is labelled 'in range' (never 'below')", () => {
    for (const s of TIER) {
      const r = assessAdmission(
        gpaProfile(s.p25),
        s.stats,
        STRENGTH_89,
        optional,
      );
      const acad = r.drivers.find((d) => /Academics/.test(d.text));
      expect(acad?.text).toMatch(/in range/i);
      expect(acad?.text).not.toMatch(/below/i);
    }
  });

  it("3b. SAT at p75 is 'in range' (not yet 'above')", () => {
    const r = assessAdmission(
      gpaProfile(COLUMBIA.p75),
      COLUMBIA.stats,
      STRENGTH_89,
      optional,
    );
    const acad = r.drivers.find((d) => /Academics/.test(d.text));
    expect(acad?.text).toMatch(/in range/i);
  });

  it("4. slightly-below-p25 is 'below range' BUT keeps resolution vs far-below", () => {
    for (const s of TIER) {
      const slight = assessAdmission(
        gpaProfile(s.p25 - 30),
        s.stats,
        STRENGTH_89,
        optional,
      );
      const far = assessAdmission(
        gpaProfile(s.p25 - 250),
        s.stats,
        STRENGTH_89,
        optional,
      );
      const acad = slight.drivers.find((d) => /Academics/.test(d.text));
      expect(acad?.text).toMatch(/below/i);
      // Not lumped together: a slightly-below score must beat a far-below one.
      expect(slight.chance ?? 0).toBeGreaterThan((far.chance ?? 0) + 0.005);
    }
  });

  it("GPA still discriminates: 4.0 beats 3.4 at the same (below-range) SAT", () => {
    const strong = assessAdmission(
      gpaProfile(1490, 4.0),
      COLUMBIA.stats,
      STRENGTH_89,
      optional,
    );
    const weakGpa = assessAdmission(
      gpaProfile(1490, 3.4),
      COLUMBIA.stats,
      STRENGTH_89,
      optional,
    );
    expect(strong.chance ?? 0).toBeGreaterThan(weakGpa.chance ?? 0);
  });
});

describe("v2.1 · the same rules hold across the whole ultra-selective tier", () => {
  it("7. 89 > 74 at every school, and both remain a reach", () => {
    for (const s of TIER) {
      const sat = Math.round((s.p25 + s.p75) / 2); // in-range median
      const a74 = assessAdmission(
        gpaProfile(sat),
        s.stats,
        STRENGTH_74,
        optional,
      );
      const a89 = assessAdmission(
        gpaProfile(sat),
        s.stats,
        STRENGTH_89,
        optional,
      );
      expect(a89.chance ?? 0, `${s.name}: 89 must beat 74`).toBeGreaterThan(
        a74.chance ?? 0,
      );
      expect(a74.category, `${s.name}: 74 is a reach`).toBe("reach");
      expect(a89.category, `${s.name}: 89 is a reach`).toBe("reach");
      // Selectivity ceiling: even the strong profile never looks like a normal bet.
      expect(a89.chance ?? 1, `${s.name}: ceiling`).toBeLessThan(0.3);
    }
  });

  it("holistic strength differentiates strong applicants everywhere (spread ≥ 2pt)", () => {
    for (const s of TIER) {
      const sat = Math.round((s.p25 + s.p75) / 2);
      const a74 =
        assessAdmission(gpaProfile(sat), s.stats, STRENGTH_74, optional)
          .chance ?? 0;
      const a89 =
        assessAdmission(gpaProfile(sat), s.stats, STRENGTH_89, optional)
          .chance ?? 0;
      expect(a89 - a74, `${s.name}: holistic spread`).toBeGreaterThan(0.02);
    }
  });
});

describe("v2.1 · 74 & 89 before/after snapshot (real stats, printed)", () => {
  it("8. prints the after-fix ranges for 74 and 89 across the tier", () => {
    const pct = (n: number | null) =>
      n == null ? "—" : `${(n * 100).toFixed(1)}%`;
    for (const s of TIER) {
      const mid = Math.round((s.p25 + s.p75) / 2);
      const cases: [string, number][] = [
        ["below p25-20", s.p25 - 20],
        ["in-range mid", mid],
        ["at p75", s.p75],
      ];
      const parts = cases.map(([label, sat]) => {
        const a74 = assessAdmission(
          gpaProfile(sat),
          s.stats,
          STRENGTH_74,
          optional,
        );
        const a89 = assessAdmission(
          gpaProfile(sat),
          s.stats,
          STRENGTH_89,
          optional,
        );
        return `${label}: 74=${pct(a74.chance)} [${a74.displayCategory}] / 89=${pct(a89.chance)} [${a89.displayCategory}]`;
      });
      console.log(`${s.name.padEnd(10)} | ${parts.join("  |  ")}`);
    }
  });
});
