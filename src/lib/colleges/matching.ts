// Admission-fit engine — PURE functions, no DB, no network, no field data.
//
// This module owns ONE dimension: how likely admission is (safety/target/reach).
// It intentionally knows nothing about academic/field fit, so the chancing math
// can be tuned independently. See field-fit.ts for the other dimension and
// evaluate.ts for the composition.
//
// Philosophy: classification reflects the student's academic profile against a
// college's standardized admission stats and its selectivity — never prestige,
// ranking, or name. A college with no usable stats is `unrated`; we never invent
// numbers to force a category.

import type {
  AdmissionFit,
  CollegeStats,
  CollegeWithData,
  MatchCategory,
  MatchProfile,
} from "./types";

// ACT composite → SAT total concordance (College Board / ACT official table,
// rounded). Lets a student with only an ACT be positioned against a college's
// SAT range and vice-versa.
const ACT_TO_SAT: Record<number, number> = {
  36: 1590,
  35: 1540,
  34: 1500,
  33: 1460,
  32: 1430,
  31: 1400,
  30: 1370,
  29: 1340,
  28: 1310,
  27: 1280,
  26: 1240,
  25: 1210,
  24: 1180,
  23: 1140,
  22: 1110,
  21: 1080,
  20: 1040,
  19: 1010,
  18: 970,
  17: 930,
  16: 890,
  15: 850,
  14: 800,
  13: 760,
  12: 710,
  11: 670,
  10: 630,
  9: 590,
};

export function actToSat(act: number | null): number | null {
  if (act == null) return null;
  const clamped = Math.max(9, Math.min(36, Math.round(act)));
  return ACT_TO_SAT[clamped] ?? null;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

/** The student's single best test score expressed on the SAT scale. */
export function studentSat(profile: MatchProfile): number | null {
  const fromSat = profile.satScore ?? null;
  const fromAct = actToSat(profile.actScore);
  if (fromSat != null && fromAct != null) return Math.max(fromSat, fromAct);
  return fromSat ?? fromAct;
}

/** A college's SAT middle-50% (total), derived from section scores if needed. */
export function collegeSatRange(
  stats: CollegeStats,
): { p25: number; p75: number } | null {
  if (stats.satTotal25 != null && stats.satTotal75 != null) {
    return { p25: stats.satTotal25, p75: stats.satTotal75 };
  }
  if (
    stats.satEbrw25 != null &&
    stats.satMath25 != null &&
    stats.satEbrw75 != null &&
    stats.satMath75 != null
  ) {
    return {
      p25: stats.satEbrw25 + stats.satMath25,
      p75: stats.satEbrw75 + stats.satMath75,
    };
  }
  const a25 = actToSat(stats.actComposite25);
  const a75 = actToSat(stats.actComposite75);
  if (a25 != null && a75 != null) return { p25: a25, p75: a75 };
  return null;
}

/**
 * Estimate the student's personal admission chance (0..1) at a college, or null
 * when there isn't enough data to say anything honest.
 */
export function estimateChance(
  profile: MatchProfile,
  stats: CollegeStats | null,
): number | null {
  if (!stats) return null;
  const range = collegeSatRange(stats);
  const admitRate = stats.admitRate;
  if (admitRate == null && !range) return null;

  // z = how far above/below the admitted median the student sits (±1 at 25/75).
  let z = 0;
  const sat = studentSat(profile);
  if (sat != null && range && range.p75 > range.p25) {
    const mid = (range.p25 + range.p75) / 2;
    const half = (range.p75 - range.p25) / 2;
    z = clamp((sat - mid) / half, -2, 2);
  }
  if (profile.unweightedGpa != null && stats.gpaAvg != null) {
    z += clamp((profile.unweightedGpa - stats.gpaAvg) / 0.3, -1, 1) * 0.5;
  }

  const base = clamp(admitRate ?? 0.5, 0.01, 0.99);
  const logit = Math.log(base / (1 - base));
  const k = 0.9; // how strongly test position moves the odds
  const chance = 1 / (1 + Math.exp(-(logit + k * z)));
  return clamp(chance, 0.01, 0.99);
}

function categoryFor(
  chance: number | null,
  admitRate: number | null,
): MatchCategory {
  if (chance == null) return "unrated";
  let category: MatchCategory =
    chance >= 0.65 ? "safety" : chance >= 0.3 ? "target" : "reach";
  // Reality guard: a sub-12% school is never a "safety" regardless of scores.
  if (category === "safety" && admitRate != null && admitRate < 0.12) {
    category = "target";
  }
  return category;
}

function pct(n: number): string {
  return `${Math.round(n * 100)}%`;
}

/** Classify the ADMISSION dimension for a college. */
export function classifyAdmission(
  profile: MatchProfile,
  stats: CollegeStats | null,
): AdmissionFit {
  const chance = estimateChance(profile, stats);
  const admitRate = stats?.admitRate ?? null;
  const category = categoryFor(chance, admitRate);
  const lowConfidence = studentSat(profile) == null && category !== "unrated";

  let rationale: string;
  if (category === "unrated") {
    rationale = "Not enough admission data to classify yet.";
  } else {
    const chancePart = chance != null ? `~${pct(chance)} estimated chance` : "";
    const ratePart =
      admitRate != null ? `${pct(admitRate)} overall admit rate` : "";
    const parts = [chancePart, ratePart].filter(Boolean);
    rationale = lowConfidence
      ? `Based on selectivity only (add a test score for a sharper estimate) — ${parts.join(", ")}.`
      : `${parts.join(", ")}.`;
  }

  return { category, chance, rationale, lowConfidence };
}

/**
 * Build a balanced starter list of college IDs: 3 safeties, 6 targets, 4
 * reaches, drawn from the classified pool. Best-effort when a bucket is short
 * (a highly selective pool may not have 3 safeties) — never pads with unrated
 * colleges. `exclude` skips colleges already on the user's list.
 *
 * Admission-driven by design: the balanced spread is about admission odds.
 * Field fit refines the ORDER within categories once field data exists (higher
 * field fit wins ties), but never turns a reach into a safety.
 */
export function buildBalancedList(
  profile: MatchProfile,
  colleges: CollegeWithData[],
  exclude: Set<string> = new Set(),
): { safetyIds: string[]; targetIds: string[]; reachIds: string[] } {
  const rated = colleges
    .filter((c) => !exclude.has(c.id))
    .map((c) => ({ college: c, fit: classifyAdmission(profile, c.stats) }))
    .filter((r) => r.fit.category !== "unrated" && r.fit.chance != null);

  const chanceOf = (r: { fit: AdmissionFit }) => r.fit.chance ?? 0;
  const byChanceDesc = (a: (typeof rated)[number], b: (typeof rated)[number]) =>
    chanceOf(b) - chanceOf(a);

  const pick = (
    category: MatchCategory,
    n: number,
    sort: typeof byChanceDesc,
  ) =>
    rated
      .filter((r) => r.fit.category === category)
      .sort(sort)
      .slice(0, n)
      .map((r) => r.college.id);

  return {
    safetyIds: pick("safety", 3, byChanceDesc),
    targetIds: pick(
      "target",
      6,
      (a, b) => Math.abs(chanceOf(a) - 0.5) - Math.abs(chanceOf(b) - 0.5),
    ),
    reachIds: pick("reach", 4, byChanceDesc),
  };
}

export const CATEGORY_ORDER: MatchCategory[] = [
  "reach",
  "target",
  "safety",
  "unrated",
];

export function categoryLabel(category: MatchCategory): string {
  switch (category) {
    case "safety":
      return "Safety";
    case "target":
      return "Target";
    case "reach":
      return "Reach";
    default:
      return "Unrated";
  }
}
