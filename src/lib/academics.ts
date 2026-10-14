// Pure academics helpers — GPA scale normalization + class-rank score boost.
// No DB, no network. Used by the onboarding academics page (input shaping), the
// profile loaders (normalization into the canonical 4.0 column), and the gap
// analysis (deterministic rank boost on the overall score).

// ─── GPA scale ────────────────────────────────────────────────────────────────

/** Selectable GPA scales. Point scales 4..20, a 100-point scale, or none. */
export const GPA_SCALES: string[] = [
  ...Array.from({ length: 17 }, (_, i) => String(i + 4)), // "4".."20"
  "100",
  "none",
];

export function gpaScaleLabel(scale: string): string {
  if (scale === "none") return "No GPA / not applicable";
  if (scale === "100") return "100-point scale";
  return `${scale}.0 scale`;
}

// Standard percentage → 4.0 letter-grade conversion (College Board style),
// as descending [minPercent, gpa] breakpoints.
const PERCENT_TO_GPA: Array<[number, number]> = [
  [93, 4.0],
  [90, 3.7],
  [87, 3.3],
  [83, 3.0],
  [80, 2.7],
  [77, 2.3],
  [73, 2.0],
  [70, 1.7],
  [67, 1.3],
  [65, 1.0],
];

/**
 * Normalize a native-scale GPA to a 4.0-equivalent (0..4), rounded to 2 decimals.
 * Returns null when there's nothing meaningful to normalize (no value, or scale
 * "none"). The 100-scale uses the standard letter-grade table; point scales
 * (4..20) map proportionally against their max — approximate by necessity, since
 * a school's exact weighting isn't known, so the native value is also shown to
 * the AI as context. `weighted` does not change the mapping (the ratio already
 * accounts for the scale's ceiling); it's recorded for display + prompt context.
 */
export function normalizeGpaTo4(
  value: number | null | undefined,
  scale: string | null | undefined,
): number | null {
  if (value == null || Number.isNaN(value)) return null;
  if (!scale || scale === "none") return null;

  if (scale === "100") {
    const pct = Math.max(0, Math.min(100, value));
    for (const [min, gpa] of PERCENT_TO_GPA) {
      if (pct >= min) return gpa;
    }
    return 0;
  }

  const max = parseInt(scale, 10);
  if (!Number.isFinite(max) || max <= 0) return null;
  const ratio = Math.max(0, Math.min(1, value / max));
  return Math.round(ratio * 4 * 100) / 100;
}

// ─── Class rank ──────────────────────────────────────────────────────────────

export type ClassRankType =
  | "exact"
  | "decile"
  | "quintile"
  | "quartile"
  | "none";

export interface ClassRankInput {
  type: ClassRankType;
  /** Exact rank position (1 = valedictorian), when type === "exact". */
  rankValue?: number | null;
  /** Approximate graduating class size, when type === "exact". */
  classSize?: number | null;
  /** Selected band ("1" = top band) for decile/quintile/quartile. */
  band?: string | null;
}

/** Band option values per coarse rank type ("1" is always the top band). */
export const RANK_BANDS: Record<
  Exclude<ClassRankType, "exact" | "none">,
  Array<{ value: string; label: string }>
> = {
  decile: [
    { value: "1", label: "Top 10% (1st decile)" },
    { value: "2", label: "Top 20% (2nd decile)" },
    { value: "3", label: "Top 30% (3rd decile)" },
    { value: "lower", label: "Below the top 30%" },
  ],
  quintile: [
    { value: "1", label: "Top 20% (1st quintile)" },
    { value: "2", label: "Top 40% (2nd quintile)" },
    { value: "lower", label: "Below the top 40%" },
  ],
  quartile: [
    { value: "1", label: "Top 25% (1st quartile)" },
    { value: "2", label: "Top 50% (2nd quartile)" },
    { value: "lower", label: "Below the top 50%" },
  ],
};

/**
 * Deterministic boost (whole points) added to the overall AppGap score for a
 * strong class rank. Weighted and unweighted ranks earn the SAME points — rank
 * systems vary too much across schools to discount one fairly.
 *
 *   Valedictorian / 2nd (exact rank 1–2): +5
 *   Top 10%:                              +3
 *   Top 20%:                              +1
 *
 * Coarse buckets map to the best tier they can prove: 1st decile → top 10% (+3),
 * 2nd decile / 1st quintile / 1st quartile → top 20% (+1). A val/sal boost is
 * only reachable via an exact rank. Returns 0 when rank is absent/unknown.
 */
export function classRankBoost(
  rank: ClassRankInput | null | undefined,
): number {
  if (!rank || rank.type === "none") return 0;

  if (rank.type === "exact") {
    const r = rank.rankValue;
    const n = rank.classSize;
    if (r == null || !Number.isFinite(r) || r < 1) return 0;
    if (r <= 2) return 5; // valedictorian / salutatorian
    if (n == null || !Number.isFinite(n) || n <= 0 || r > n) return 0;
    const pct = r / n;
    if (pct <= 0.1) return 3;
    if (pct <= 0.2) return 1;
    return 0;
  }

  // Coarse bands.
  if (rank.type === "decile") {
    if (rank.band === "1") return 3;
    if (rank.band === "2") return 1;
    return 0;
  }
  if (rank.type === "quintile") {
    return rank.band === "1" ? 1 : 0;
  }
  if (rank.type === "quartile") {
    return rank.band === "1" ? 1 : 0;
  }
  return 0;
}

/** A short human label for the rank, for the AI prompt + display. Null when none. */
export function classRankLabel(
  rank: ClassRankInput | null | undefined,
): string | null {
  if (!rank || rank.type === "none") return null;

  if (rank.type === "exact") {
    const r = rank.rankValue;
    const n = rank.classSize;
    if (r == null || !Number.isFinite(r) || r < 1) return null;
    if (n != null && Number.isFinite(n) && n > 0) {
      const pct = Math.round((r / n) * 100);
      return `Rank ${r} of ~${n} (top ${Math.max(1, pct)}%)`;
    }
    return `Rank ${r}`;
  }

  const bandLabel = RANK_BANDS[rank.type]?.find(
    (b) => b.value === rank.band,
  )?.label;
  return bandLabel ?? null;
}
