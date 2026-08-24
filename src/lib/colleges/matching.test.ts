import { describe, expect, it } from "vitest";
import { evaluateCollege } from "./evaluate";
import { buildBalancedList } from "./matching";
import { deriveApplicantStrength, neutralStrength } from "./strength";
import {
  type ApplicantStrength,
  type CollegeStats,
  type CollegeWithData,
  CURRENT_CYCLE_YEAR,
  type MatchProfile,
} from "./types";

// ══════════════════════════════════════════════════════════════════════════════
//  Regression: the generated list (buildBalancedList) and the displayed buckets
//  (evaluateCollege — the exact code the college page runs) MUST agree.
//
//  The reported bug: a strong profile generated 3/6/4 but the page showed 3/10/0
//  because generation classified with neutral strength while display classified
//  with the real applicant strength. These tests lock the two paths to the same
//  inputs and prove consistency for strong, average, and weaker profiles.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Synthetic college pool spanning the full selectivity spectrum ───────────
// p25/p75 rise with selectivity, mirroring real data (gpa_avg is always null,
// as it is across the entire production dataset).

let seq = 0;
function college(
  admitRate: number,
  p25: number,
  p75: number,
  testPolicy: string | null = "optional",
): CollegeWithData {
  seq += 1;
  const stats: CollegeStats = {
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
  };
  return {
    id: `c${seq}`,
    slug: `c${seq}`,
    name: `College ${seq}`,
    city: null,
    state: null,
    institutionType: null,
    logoAssetPath: null,
    logoVariant: null,
    officialWebsite: null,
    stats,
    cycle: {
      cycleYear: CURRENT_CYCLE_YEAR,
      testPolicy,
      verified: true,
      rounds: [],
    },
  };
}

// A broad pool: plenty of accessible/mid schools (safeties for a strong
// profile), a rich 0.16–0.34 band (which the "nothing sub-35% is a true safety"
// guard caps at target), and >4 reaches (ultra + highly-selective) so the reach
// spread has something to spread across.
const POOL: CollegeWithData[] = [
  // Accessible / mid (admit >= 0.35) — safeties for a strong profile.
  college(0.85, 950, 1150),
  college(0.78, 1020, 1220),
  college(0.7, 1080, 1280),
  college(0.6, 1150, 1350),
  college(0.5, 1220, 1400),
  college(0.42, 1280, 1450),
  college(0.38, 1300, 1470),
  // Selective (admit 0.16–0.34) — capped at target by the sub-35% guard.
  college(0.33, 1330, 1490),
  college(0.3, 1350, 1500),
  college(0.27, 1370, 1510),
  college(0.24, 1390, 1520),
  college(0.2, 1410, 1530),
  college(0.17, 1430, 1540),
  // Highly selective (admit 0.08–0.15) — the "flip zone".
  college(0.14, 1450, 1550),
  college(0.11, 1470, 1560),
  college(0.08, 1480, 1560),
  // Ultra-selective (admit < 0.06) — forced reach for everyone.
  college(0.055, 1490, 1570),
  college(0.05, 1500, 1580),
  college(0.045, 1500, 1580),
  college(0.04, 1510, 1580),
  college(0.035, 1510, 1590),
  college(0.03, 1520, 1590),
];

const byId = new Map(POOL.map((c) => [c.id, c]));

// ─── Profiles: strong / average / weaker ─────────────────────────────────────

const STRONG = {
  profile: {
    unweightedGpa: 4.0,
    satScore: 1500,
    actScore: null,
  } as MatchProfile,
  strength: deriveApplicantStrength({
    academics: { score: 92 },
    activities: { score: 90 },
    awards: { score: 85 },
  }),
};
const AVERAGE = {
  profile: {
    unweightedGpa: 3.6,
    satScore: 1280,
    actScore: null,
  } as MatchProfile,
  strength: deriveApplicantStrength({
    academics: { score: 68 },
    activities: { score: 60 },
    awards: { score: 55 },
  }),
};
const WEAKER = {
  profile: {
    unweightedGpa: 3.2,
    satScore: 1120,
    actScore: null,
  } as MatchProfile,
  strength: deriveApplicantStrength({
    academics: { score: 48 },
    activities: { score: 35 },
    awards: { score: 25 },
  }),
};

/** The EXACT category the college page would show (evaluateCollege is what the
 * page calls). This is the display path — the source of truth we compare against. */
function displayCategory(
  profile: MatchProfile,
  strength: ApplicantStrength,
  c: CollegeWithData,
) {
  return evaluateCollege({
    profile,
    strength,
    fieldKey: null,
    college: c,
    fieldData: { strength: null, resources: [] },
    source: "recommended",
    selectedRoundId: null,
  }).admission.category;
}

/** Re-bucket a set of generated ids the way the page will, and count. */
function displayCounts(
  profile: MatchProfile,
  strength: ApplicantStrength,
  ids: string[],
) {
  const counts = { safety: 0, target: 0, reach: 0, unrated: 0 };
  for (const id of ids) {
    const c = byId.get(id);
    if (!c) continue;
    counts[displayCategory(profile, strength, c)] += 1;
  }
  return counts;
}

// ─── The core invariant: generation buckets == display buckets ───────────────

describe.each([
  ["strong", STRONG],
  ["average", AVERAGE],
  ["weaker", WEAKER],
])("generated buckets match displayed buckets — %s profile", (_label, p) => {
  const { safetyIds, targetIds, reachIds } = buildBalancedList(
    p.profile,
    POOL,
    p.strength,
  );

  it("every generated SAFETY displays as a safety", () => {
    for (const id of safetyIds) {
      const c = byId.get(id);
      if (!c) throw new Error(`missing ${id}`);
      expect(displayCategory(p.profile, p.strength, c)).toBe("safety");
    }
  });

  it("every generated TARGET displays as a target", () => {
    for (const id of targetIds) {
      const c = byId.get(id);
      if (!c) throw new Error(`missing ${id}`);
      expect(displayCategory(p.profile, p.strength, c)).toBe("target");
    }
  });

  it("every generated REACH displays as a reach", () => {
    for (const id of reachIds) {
      const c = byId.get(id);
      if (!c) throw new Error(`missing ${id}`);
      expect(displayCategory(p.profile, p.strength, c)).toBe("reach");
    }
  });

  it("never exceeds the 3 / 6 / 4 caps and has no cross-bucket duplicates", () => {
    expect(safetyIds.length).toBeLessThanOrEqual(3);
    expect(targetIds.length).toBeLessThanOrEqual(6);
    expect(reachIds.length).toBeLessThanOrEqual(4);
    const all = [...safetyIds, ...targetIds, ...reachIds];
    expect(new Set(all).size).toBe(all.length);
  });
});

// ─── The reported case: 3 / 6 / 4 that used to become 3 / 10 / 0 ─────────────

describe("the reported 3-safety / 10-target / 0-reach regression", () => {
  it("a strong profile generates a full 3 / 6 / 4 list", () => {
    const list = buildBalancedList(STRONG.profile, POOL, STRONG.strength);
    expect(list.safetyIds.length).toBe(3);
    expect(list.targetIds.length).toBe(6);
    expect(list.reachIds.length).toBe(4);
  });

  it("the fix: displayed buckets stay 3 / 6 / 4 (no drift on load)", () => {
    const list = buildBalancedList(STRONG.profile, POOL, STRONG.strength);
    const ids = [...list.safetyIds, ...list.targetIds, ...list.reachIds];
    const shown = displayCounts(STRONG.profile, STRONG.strength, ids);
    // The whole point: reaches stay reaches on load (the bug turned these to 0).
    expect(shown).toEqual({ safety: 3, target: 6, reach: 4, unrated: 0 });
  });

  it("OLD behaviour reproduced: neutral-strength generation drifts to fewer reaches", () => {
    // Simulate the pre-fix generator (neutral strength) for the SAME strong user…
    const old = buildBalancedList(STRONG.profile, POOL, neutralStrength());
    const oldIds = [...old.safetyIds, ...old.targetIds, ...old.reachIds];
    // …then display it with the user's REAL strength (what the page does).
    const drifted = displayCounts(STRONG.profile, STRONG.strength, oldIds);
    expect(drifted.reach).toBeLessThan(old.reachIds.length); // reaches evaporate
    expect(drifted.target).toBeGreaterThan(old.targetIds.length); // pile into target

    // The fix generates with real strength → what you build is what you see.
    const fixed = buildBalancedList(STRONG.profile, POOL, STRONG.strength);
    const fixedIds = [
      ...fixed.safetyIds,
      ...fixed.targetIds,
      ...fixed.reachIds,
    ];
    const stable = displayCounts(STRONG.profile, STRONG.strength, fixedIds);
    expect(stable.safety).toBe(fixed.safetyIds.length);
    expect(stable.target).toBe(fixed.targetIds.length);
    expect(stable.reach).toBe(fixed.reachIds.length);
  });
});

// ─── Reach spread: not 4 "barely reaches" clustered at the 0.3 boundary ──────

describe("reach selection is spread across selectivity, not clustered", () => {
  it("spans a wider chance range than the 4 highest-chance reaches would", () => {
    const { reachIds } = buildBalancedList(
      STRONG.profile,
      POOL,
      STRONG.strength,
    );
    const chanceOf = (id: string) => {
      const c = byId.get(id);
      if (!c) throw new Error(`missing ${id}`);
      return (
        evaluateCollege({
          profile: STRONG.profile,
          strength: STRONG.strength,
          fieldKey: null,
          college: c,
          fieldData: { strength: null, resources: [] },
          source: "recommended",
          selectedRoundId: null,
        }).admission.chance ?? 0
      );
    };

    const selected = reachIds.map(chanceOf).sort((a, b) => b - a);
    const selectedSpan = selected[0] - selected[selected.length - 1];

    // All reaches in the pool, ranked by chance; the naive top-4 clusters high.
    const allReachChances = POOL.filter(
      (c) => displayCategory(STRONG.profile, STRONG.strength, c) === "reach",
    )
      .map((c) => chanceOf(c.id))
      .sort((a, b) => b - a);
    const naiveTop4 = allReachChances.slice(0, 4);
    const naiveSpan = naiveTop4[0] - naiveTop4[naiveTop4.length - 1];

    expect(allReachChances.length).toBeGreaterThan(4); // spread is meaningful
    expect(selectedSpan).toBeGreaterThan(naiveSpan);
    // And it reaches down to a genuine long shot near the bottom of the band.
    expect(selected[selected.length - 1]).toBeLessThanOrEqual(
      allReachChances[allReachChances.length - 1] + 0.01,
    );
  });
});
