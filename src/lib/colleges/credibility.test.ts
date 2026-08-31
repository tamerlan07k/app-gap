// College-specific chance credibility tests (the approved validation matrix).
//
// These lock in that the estimate is genuinely college-specific — not a renamed
// universal AppGap score — and that it behaves sensibly and bounded.

import { describe, expect, it } from "vitest";
import { assessAdmission, formatChance } from "./assessment";
import { evaluateCollege } from "./evaluate";
import { deriveApplicantStrength, neutralStrength } from "./strength";
import type { CollegeStats, CollegeWithData, MatchProfile } from "./types";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ULTRA: CollegeStats = {
  admitRate: 0.04,
  satEbrw25: 730,
  satEbrw75: 770,
  satMath25: 760,
  satMath75: 800, // 1490–1570
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

// Same ultra-selective admit rate, but a NOTABLY lower academic band — a student
// with a mid score sits differently here vs ULTRA. Distinguishes "admit rate is
// the whole story" from a genuinely college-specific academic position.
const ULTRA_LOWER_BAND: CollegeStats = {
  ...ULTRA,
  satEbrw25: 680,
  satEbrw75: 730,
  satMath25: 700,
  satMath75: 760, // 1380–1490
};

const SELECTIVE: CollegeStats = {
  admitRate: 0.3,
  satEbrw25: 660,
  satEbrw75: 730,
  satMath25: 680,
  satMath75: 770, // 1340–1500
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

const ACCESSIBLE: CollegeStats = {
  admitRate: 0.7,
  satEbrw25: 570,
  satEbrw75: 660,
  satMath25: 560,
  satMath75: 670, // 1130–1330
  satTotal25: null,
  satTotal75: null,
  actComposite25: null,
  actComposite75: null,
  gpaAvg: null,
};

const STRONG = deriveApplicantStrength({
  academics: { score: 92 },
  activities: { score: 90 },
  awards: { score: 85 },
});
const WEAK = deriveApplicantStrength({
  academics: { score: 60 },
  activities: { score: 45 },
  awards: { score: 30 },
});

const profile = (
  sat: number | null,
  gpa: number | null = null,
): MatchProfile => ({
  unweightedGpa: gpa,
  satScore: sat,
  actScore: null,
});

// ── 1. Same student, different colleges → different estimates ─────────────────

describe("same student, meaningfully different colleges", () => {
  const student = profile(1450);

  it("produces different estimates across selectivity tiers", () => {
    const atUltra = assessAdmission(student, ULTRA, STRONG).chance;
    const atSelective = assessAdmission(student, SELECTIVE, STRONG).chance;
    const atAccessible = assessAdmission(student, ACCESSIBLE, STRONG).chance;
    expect(atUltra).not.toBeCloseTo(atSelective ?? -1, 2);
    expect(atSelective).not.toBeCloseTo(atAccessible ?? -1, 2);
    // Sensible ordering: easier school → higher chance.
    expect(atAccessible ?? 0).toBeGreaterThan(atSelective ?? 0);
    expect(atSelective ?? 0).toBeGreaterThan(atUltra ?? 0);
  });

  it("differs at two equally-selective colleges with different academic bands", () => {
    // 1450 is below ULTRA's band but IN ULTRA_LOWER_BAND's band — so the
    // estimate must differ even though both admit ~4%.
    const a = assessAdmission(student, ULTRA, STRONG).chance ?? 0;
    const b = assessAdmission(student, ULTRA_LOWER_BAND, STRONG).chance ?? 0;
    expect(a).not.toBeCloseTo(b, 3);
    expect(b).toBeGreaterThan(a);
  });
});

// ── 2. Different students, same college → different estimates ─────────────────

describe("different students at the same college", () => {
  it("a stronger applicant gets a higher estimate", () => {
    const strong =
      assessAdmission(profile(1550), SELECTIVE, STRONG).chance ?? 0;
    const weak = assessAdmission(profile(1250), SELECTIVE, WEAK).chance ?? 0;
    expect(strong).toBeGreaterThan(weak);
  });
});

// ── 3. Higher SAT → higher estimate, all else equal ──────────────────────────

describe("academic position moves the estimate", () => {
  it("a higher SAT raises the estimate at the same college", () => {
    const lo = assessAdmission(profile(1300), SELECTIVE, STRONG).chance ?? 0;
    const hi = assessAdmission(profile(1520), SELECTIVE, STRONG).chance ?? 0;
    expect(hi).toBeGreaterThan(lo);
  });
});

// ── 4. Stronger holistic (activities/awards) → higher estimate ───────────────

describe("holistic strength moves the estimate", () => {
  it("stronger activities/awards raise the estimate, same scores", () => {
    const strong =
      assessAdmission(profile(1500), SELECTIVE, STRONG).chance ?? 0;
    const weak = assessAdmission(profile(1500), SELECTIVE, WEAK).chance ?? 0;
    expect(strong).toBeGreaterThan(weak);
  });
});

// ── 5. Missing college data → lower confidence, no fabrication ────────────────

describe("missing data lowers confidence rather than fabricating precision", () => {
  it("is unrated (no number) when admit rate is unknown", () => {
    const noRate: CollegeStats = { ...SELECTIVE, admitRate: null };
    const r = assessAdmission(profile(1450), noRate, STRONG);
    expect(r.category).toBe("unrated");
    expect(r.chance).toBeNull();
  });

  it("no test score lowers confidence below the with-score case", () => {
    const withScore = assessAdmission(profile(1500), SELECTIVE, STRONG);
    const without = assessAdmission(profile(null), SELECTIVE, STRONG);
    expect(without.lowConfidence).toBe(true);
    expect(without.dataCompleteness).toBeLessThan(withScore.dataCompleteness);
  });
});

// ── 6. Extremely strong student, ultra-selective → still bounded ─────────────

describe("no absurdly high estimate at an ultra-selective college", () => {
  it("keeps even a perfect-fit applicant under the selectivity ceiling", () => {
    const r = assessAdmission(profile(1600, 4.0), ULTRA, STRONG);
    expect(r.chance ?? 1).toBeLessThan(0.3);
  });
});

// ── 7. Weak student, high-admit college → not absurdly high ───────────────────

describe("high overall admit rate does not rescue a weak applicant", () => {
  it("keeps a well-below-band weak applicant modest at an accessible school", () => {
    const r = assessAdmission(profile(900), ACCESSIBLE, WEAK);
    // Accessible school → not a lottery, but a weak, below-band profile should
    // sit clearly below the college's own 70% overall admit rate.
    expect(r.chance ?? 1).toBeLessThan(0.7);
  });
});

// ── 8. Determinism ────────────────────────────────────────────────────────────

describe("determinism", () => {
  it("same inputs → identical single estimate", () => {
    const a = assessAdmission(profile(1480), SELECTIVE, STRONG).chance;
    const b = assessAdmission(profile(1480), SELECTIVE, STRONG).chance;
    expect(a).toBe(b);
    expect(formatChance(a)).toBe(formatChance(b));
  });
});

// ── 9. Order independence (per-college estimates are independent) ─────────────

describe("order independence", () => {
  const mk = (id: string, stats: CollegeStats): CollegeWithData => ({
    id,
    slug: id,
    name: id,
    city: null,
    state: null,
    institutionType: null,
    logoAssetPath: null,
    logoVariant: null,
    officialWebsite: null,
    stats,
    cycle: null,
  });
  const colleges = [
    mk("ultra", ULTRA),
    mk("selective", SELECTIVE),
    mk("accessible", ACCESSIBLE),
  ];
  const evalAll = (list: CollegeWithData[]) =>
    list.map((college) =>
      evaluateCollege({
        profile: profile(1450),
        strength: STRONG,
        fieldKey: null,
        college,
        fieldData: { strength: null, resources: [] },
        source: "manual",
        selectedRoundId: null,
      }),
    );

  it("reordering the list does not change any college's estimate", () => {
    const forward = evalAll(colleges);
    const reversed = evalAll([...colleges].reverse());
    for (const f of forward) {
      const r = reversed.find((x) => x.college.id === f.college.id);
      expect(r?.admission.chance).toBe(f.admission.chance);
    }
  });
});

// ── 10. formatChance formatting ──────────────────────────────────────────────

describe("formatChance", () => {
  it("renders a single rounded percentage", () => {
    expect(formatChance(0.12)).toBe("12%");
    expect(formatChance(0.126)).toBe("13%");
  });
  it("renders <1% for tiny values and — for null", () => {
    expect(formatChance(0.004)).toBe("<1%");
    expect(formatChance(null)).toBe("—");
  });
});

// ── 11. Verified school-level baseline overrides institution-level ───────────
// The engine already accepts whatever CollegeStats it's given, so a school-level
// stats row (real, verified data) naturally produces a different estimate than
// the institution-level row — with NO fabricated major multiplier.

describe("school-level baseline (when real data is supplied)", () => {
  it("uses the school-level admit rate when it differs from institution-level", () => {
    const institution: CollegeStats = { ...SELECTIVE, admitRate: 0.3 };
    const engineeringSchool: CollegeStats = { ...SELECTIVE, admitRate: 0.12 };
    const student = profile(1500);
    const atInstitution =
      assessAdmission(student, institution, STRONG).chance ?? 0;
    const atSchool =
      assessAdmission(student, engineeringSchool, STRONG).chance ?? 0;
    // Tighter school admit rate → lower estimate, purely from real data.
    expect(atSchool).toBeLessThan(atInstitution);
  });
});

// ── Sanity: neutral strength still rates, just less confidently ──────────────

describe("neutral strength", () => {
  it("still produces a bounded estimate with a score present", () => {
    const r = assessAdmission(profile(1450), SELECTIVE, neutralStrength());
    expect(r.chance).not.toBeNull();
    expect(r.chance ?? 1).toBeLessThanOrEqual(0.8);
  });
});
