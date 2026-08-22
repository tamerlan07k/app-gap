// College-specific Admission Assessment (Layer 3) — PURE, no DB, no network.
//
// Answers "how does THIS student compare AT this college?" and returns a
// structured, uncertainty-aware verdict — never a lone precise percentage.
//
// Design principles (see the approved spec):
//   1. Selectivity owns the CEILING and the UNCERTAINTY. Applicant strength only
//      positions the student WITHIN a selectivity-bounded band; it can never buy
//      a high chance at a low-admit school. (No "70% profile → 70% at Harvard".)
//   2. SAT alone must not dominate. Academic position and holistic strength are
//      blended with selectivity-dependent weights: stats dominate at accessible
//      schools, holistic matters more where everyone is already qualified.
//   3. Missing data lowers confidence / widens the range — it is NEVER treated
//      as an average. We do not fabricate GPA or major-admission data.
//   4. Deterministic and versioned.

import { collegeSatRange, studentSat } from "./matching";
import type {
  AdmissionDriver,
  AdmissionFit,
  ApplicantStrength,
  CollegeStats,
  Confidence,
  MatchCategory,
  MatchProfile,
  TestPolicy,
} from "./types";

/** Bump on any change to the math so stored/derived results are auditable. */
export const ADMISSION_MODEL_VERSION = "admission-v2.0.0";

const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));
const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));

// ─── Tunable constants (documented so they can be recalibrated in one place) ──

// How strongly overall fit shifts the log-odds away from the base admit rate.
const SHIFT_SCALE = 2.4;

// Holistic weight as a function of selectivity: everyone at an ultra-selective
// school is academically qualified, so holistic signals matter more there; at an
// accessible school the numbers do most of the work.
const HOLISTIC_WEIGHT_SELECTIVE = 0.5; // admit <= 6%
const HOLISTIC_WEIGHT_ACCESSIBLE = 0.15; // admit >= 50%

// GPA distance that maps to a full ±1 of academic position.
const GPA_FULL_SCALE = 0.3;

// ─── Selectivity envelope ────────────────────────────────────────────────────

/** The maximum personal chance even a perfect-fit applicant can be shown, as a
 * function of the college's overall admit rate. This is the anti-absurdity cap. */
function selectivityCeiling(admitRate: number): number {
  if (admitRate <= 0.06) return clamp(admitRate * 6, 0.15, 0.3);
  if (admitRate <= 0.15) return 0.5;
  if (admitRate <= 0.35) return 0.8;
  if (admitRate <= 0.6) return 0.92;
  return 0.97;
}

/** The floor for a poor-fit applicant — small but never a misleading flat 1%. */
function selectivityFloor(admitRate: number): number {
  return Math.max(0.005, admitRate * 0.15);
}

/** Holistic weight (0..1), interpolated by selectivity. */
function holisticWeight(admitRate: number): number {
  if (admitRate <= 0.06) return HOLISTIC_WEIGHT_SELECTIVE;
  if (admitRate >= 0.5) return HOLISTIC_WEIGHT_ACCESSIBLE;
  const t = (0.5 - admitRate) / (0.5 - 0.06); // 0 at 50%, 1 at 6%
  return (
    HOLISTIC_WEIGHT_ACCESSIBLE +
    (HOLISTIC_WEIGHT_SELECTIVE - HOLISTIC_WEIGHT_ACCESSIBLE) * t
  );
}

/** Base uncertainty from selectivity — wider at the unpredictable top. */
function selectivityUncertainty(admitRate: number): number {
  return clamp(0.1 + (1 - admitRate) * 0.3, 0.1, 0.42);
}

// ─── Academic position (relative to THIS college) ────────────────────────────

interface AcademicPosition {
  /** −1..1, where 0 = at the college's median. Null when we can't compute it. */
  value: number | null;
  usedTest: boolean;
  usedGpa: boolean;
}

function academicPosition(
  profile: MatchProfile,
  stats: CollegeStats,
  testPolicy: TestPolicy,
): AcademicPosition {
  const parts: number[] = [];
  let usedTest = false;
  let usedGpa = false;

  // Test-blind colleges do not consider scores at all — never use them.
  if (testPolicy !== "blind") {
    const range = collegeSatRange(stats);
    const sat = studentSat(profile);
    if (sat != null && range && range.p75 > range.p25) {
      const mid = (range.p25 + range.p75) / 2;
      const half = (range.p75 - range.p25) / 2;
      parts.push(clamp((sat - mid) / half, -2, 2) / 2); // → −1..1
      usedTest = true;
    }
  }

  // GPA term only fires with REAL college GPA data — never fabricated, never a
  // silent zero/median. Missing GPA simply drops out and lowers completeness.
  if (profile.unweightedGpa != null && stats.gpaAvg != null) {
    parts.push(
      clamp((profile.unweightedGpa - stats.gpaAvg) / GPA_FULL_SCALE, -1, 1),
    );
    usedGpa = true;
  }

  if (parts.length === 0) return { value: null, usedTest, usedGpa };
  const avg = parts.reduce((a, b) => a + b, 0) / parts.length;
  return { value: avg, usedTest, usedGpa };
}

// ─── Data completeness & confidence ──────────────────────────────────────────

function dataCompleteness(
  acad: AcademicPosition,
  strength: ApplicantStrength,
  testPolicy: TestPolicy,
): number {
  // Weighted average of the signals we'd ideally have. Test-optional/blind with
  // no usable score counts as partial (the college doesn't require it) rather
  // than a full miss.
  const cTest = acad.usedTest
    ? 1
    : testPolicy === "blind" || testPolicy === "optional"
      ? 0.5
      : 0;
  const cGpa = acad.usedGpa ? 1 : 0;
  const cHolistic = strength.hasHolistic ? 1 : 0;
  return clamp(cTest * 0.35 + cGpa * 0.2 + cHolistic * 0.3 + 0.15, 0, 1);
  //                                                      ↑ admit rate (required to reach here)
}

function confidenceFrom(completeness: number, admitRate: number): Confidence {
  let c: Confidence =
    completeness >= 0.75 ? "high" : completeness >= 0.45 ? "medium" : "low";
  // Ultra-selective outcomes are inherently uncertain — never claim "high".
  if (admitRate <= 0.1 && c === "high") c = "medium";
  return c;
}

// ─── Category ────────────────────────────────────────────────────────────────

function categoryFrom(
  point: number,
  admitRate: number,
): { category: MatchCategory; displayCategory: string } {
  let category: MatchCategory =
    point >= 0.65 ? "safety" : point >= 0.3 ? "target" : "reach";

  // Selectivity reality guards.
  if (admitRate < 0.06) {
    category = "reach"; // ultra-selective is never a target/safety
  } else if (admitRate < 0.35 && category === "safety") {
    category = "target"; // nothing sub-35% admit is a true "safety"
  }

  let displayCategory: string;
  switch (category) {
    case "safety":
      displayCategory = "Safety";
      break;
    case "target":
      displayCategory = "Target";
      break;
    default:
      displayCategory =
        admitRate <= 0.06 || point < 0.08 ? "High Reach" : "Reach";
  }
  return { category, displayCategory };
}

// ─── Drivers ─────────────────────────────────────────────────────────────────

function buildDrivers(
  acad: AcademicPosition,
  strength: ApplicantStrength,
  admitRate: number,
  testPolicy: TestPolicy,
  gpaMissing: boolean,
): AdmissionDriver[] {
  const drivers: AdmissionDriver[] = [];

  if (acad.value != null) {
    if (acad.value > 0.35) {
      drivers.push({
        kind: "positive",
        text: "Academics above this college's typical range",
      });
    } else if (acad.value >= -0.35) {
      drivers.push({
        kind: "info",
        text: "Academics in range (near the middle 50%)",
      });
    } else {
      drivers.push({
        kind: "caution",
        text: "Academics below this college's typical range",
      });
    }
  } else if (testPolicy === "optional" || testPolicy === "blind") {
    drivers.push({
      kind: "info",
      text: "Test-optional here — assessed without a score",
    });
  } else {
    drivers.push({
      kind: "caution",
      text: "No test score yet — add one for a sharper estimate",
    });
  }

  if (strength.hasHolistic) {
    if (strength.holistic >= 0.7) {
      drivers.push({
        kind: "positive",
        text: "Strong activities & awards profile",
      });
    } else if (strength.holistic >= 0.45) {
      drivers.push({ kind: "info", text: "Solid activities & awards" });
    } else {
      drivers.push({
        kind: "caution",
        text: "Activities & awards are a development area",
      });
    }
  } else {
    drivers.push({
      kind: "info",
      text: "Run a profile analysis for a holistic read",
    });
  }

  if (admitRate <= 0.06) {
    drivers.push({
      kind: "caution",
      text: "Ultra-selective — outcomes are uncertain even for top applicants",
    });
  } else if (admitRate <= 0.15) {
    drivers.push({
      kind: "caution",
      text: "Highly selective — strong profiles are often turned away",
    });
  }

  if (gpaMissing) {
    drivers.push({
      kind: "info",
      text: "College GPA data unavailable — estimate is less precise",
    });
  }

  return drivers.slice(0, 4);
}

// ─── Formatting ──────────────────────────────────────────────────────────────

function pct(n: number): string {
  const v = n * 100;
  if (v < 1) return "<1%";
  return `${Math.round(v)}%`;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface AssessOptions {
  testPolicy?: TestPolicy;
}

const UNRATED: AdmissionFit = {
  category: "unrated",
  displayCategory: "Unrated",
  chance: null,
  chanceRange: null,
  confidence: null,
  drivers: [],
  collegeAdmitRate: null,
  dataCompleteness: 0,
  rationale: "Not enough admission data to classify yet.",
  lowConfidence: false,
  modelVersion: ADMISSION_MODEL_VERSION,
};

/**
 * Assess a student's admission fit at one college. Returns a structured,
 * uncertainty-aware verdict. Requires an overall admit rate to produce a
 * probability — without it the college is `unrated` (we do not fabricate a base
 * rate, unlike the legacy engine which assumed 50%).
 */
export function assessAdmission(
  profile: MatchProfile,
  stats: CollegeStats | null,
  strength: ApplicantStrength,
  options: AssessOptions = {},
): AdmissionFit {
  if (!stats || stats.admitRate == null) {
    return { ...UNRATED, collegeAdmitRate: stats?.admitRate ?? null };
  }

  const admitRate = clamp(stats.admitRate, 0.005, 0.99);
  const testPolicy = options.testPolicy ?? "unknown";

  const acad = academicPosition(profile, stats, testPolicy);
  const gpaMissing = stats.gpaAvg == null;

  // Blend academic position and holistic strength with selectivity-aware
  // weights. Missing signals use a NEUTRAL 0.5 for the point math (they neither
  // help nor hurt) while separately lowering confidence — never assumed average
  // in a way that flatters or penalizes.
  const aPosNorm = acad.value != null ? (acad.value + 1) / 2 : 0.5;
  const hNorm = strength.hasHolistic ? strength.holistic : 0.5;
  const wH = holisticWeight(admitRate);
  const fit = (1 - wH) * aPosNorm + wH * hNorm; // 0..1

  // Point estimate: shift the base log-odds by fit, then clamp into the
  // selectivity envelope so strength can never exceed the band ceiling.
  const shift = SHIFT_SCALE * (fit - 0.5) * 2; // (fit−0.5)*2 ∈ [−1,1]
  const raw = sigmoid(logit(admitRate) + shift);
  const ceiling = selectivityCeiling(admitRate);
  const floor = selectivityFloor(admitRate);
  const point = clamp(raw, floor, ceiling);

  // Range width from selectivity + missing data. Present a range, not a point.
  const completeness = dataCompleteness(acad, strength, testPolicy);
  const width = clamp(
    selectivityUncertainty(admitRate) + (1 - completeness) * 0.3,
    0.15,
    0.6,
  );
  const chanceRange = {
    low: clamp(point * (1 - width), floor, ceiling),
    high: clamp(point * (1 + width), floor, ceiling),
  };

  const confidence = confidenceFrom(completeness, admitRate);
  const { category, displayCategory } = categoryFrom(point, admitRate);
  const drivers = buildDrivers(
    acad,
    strength,
    admitRate,
    testPolicy,
    gpaMissing,
  );

  const rationale = `${displayCategory} — estimated ${pct(chanceRange.low)}–${pct(
    chanceRange.high,
  )} (${confidence} confidence); ${pct(admitRate)} overall admit rate.`;

  return {
    category,
    displayCategory,
    chance: point,
    chanceRange,
    confidence,
    drivers,
    collegeAdmitRate: stats.admitRate,
    dataCompleteness: completeness,
    rationale,
    lowConfidence: confidence === "low" || !acad.usedTest,
    modelVersion: ADMISSION_MODEL_VERSION,
  };
}

/** Format a range for display, e.g. "5–11%". Exposed for the UI. */
export function formatChanceRange(range: {
  low: number;
  high: number;
}): string {
  return `${pct(range.low)}–${pct(range.high)}`;
}
