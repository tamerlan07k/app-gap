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
export const ADMISSION_MODEL_VERSION = "admission-v2.1.0";

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

// ─── Academic-position calibration (v2.1) ────────────────────────────────────
// These are STARTING calibration values, recalibratable here in one place — not
// immutable constants. See the audit that motivated them: at ultra-selective
// schools the published SAT middle-50% is extremely narrow (~60–80 pts), so the
// old half-width unit over-amplified small differences (a near-miss floored to
// the same value as a far-miss) and a strong GPA was silently discarded because
// college gpa_avg is null across the whole dataset.
//
// MIN_HALF: floor on the SAT half-width so a pathologically narrow band can't
//   over-amplify position. A no-op for schools whose band is already this wide.
const MIN_HALF = 90; // SAT points
// POS_CLAMP: saturation bound for the standardized SAT distance (softer than the
//   old ±2, so a slightly-below score keeps resolution instead of flooring).
const POS_CLAMP = 2.5;
// GPA distance from the reference that maps to a full ±1 of academic position.
const GPA_SPAN = 0.4;
// When BOTH a test score and a GPA exist, the test leads; GPA fills the rest.
const SAT_WEIGHT = 0.7;
// GPA alone (test-optional/blind, or no score) is a weaker signal → damp it so it
//   positions but never dominates.
const GPA_ONLY_DAMP = 0.6;
// Selectivity-scaled GPA reference used ONLY when the college reports no gpa_avg
// (true for the entire dataset today). A strong GPA still counts, calibrated to
// the tier: ~3.9 where a 4.0 is the norm, ~3.4 at accessible schools so an
// average GPA there isn't wrongly penalized. Real college gpa_avg, when present,
// always takes precedence over this anchor.
const GPA_ANCHOR_SELECTIVE = 3.9; // admit <= 5%
const GPA_ANCHOR_ACCESSIBLE = 3.4; // admit >= 50%

/** Selectivity-scaled GPA reference, interpolated by admit rate. */
function gpaAnchor(admitRate: number): number {
  const t = clamp((0.5 - admitRate) / (0.5 - 0.05), 0, 1); // 1 at <=5%, 0 at >=50%
  return (
    GPA_ANCHOR_ACCESSIBLE + (GPA_ANCHOR_SELECTIVE - GPA_ANCHOR_ACCESSIBLE) * t
  );
}

// ─── Academics-component nudge (course rigor, beyond raw SAT+GPA) ─────────────
// The LLM's absolute "academics" component score (0..1) captures course rigor and
// overall academic quality — signals GPA alone misses. It gently pulls the
// college-relative academic position toward that quality read, deliberately SMALL
// so SAT/GPA still lead and it can never dominate (or rescue a far-below score).
const ACAD_COMP_WEIGHT = 0.15; // fraction of academic position it can pull
const ACAD_COMP_ANCHOR = 0.7; // a 70/100 academics score is the neutral point
const ACAD_COMP_SPAN = 0.3; // distance from the anchor mapping to a full ±1
const ACAD_COMP_ONLY_DAMP = 0.6; // damp when it's the ONLY academic signal we have

/** Convert the absolute LLM academics score (0..1) to a −1..1 position nudge. */
function academicsComponentPos(academics: number): number {
  return clamp((academics - ACAD_COMP_ANCHOR) / ACAD_COMP_SPAN, -1, 1);
}

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
  /** A GPA term contributed (real college data OR the selectivity-scaled anchor). */
  usedGpa: boolean;
  /** True only when the GPA term used REAL college gpa_avg (not the anchor). */
  usedRealGpa: boolean;
  /** Where the student's score sits vs the published SAT middle-50%, when a score
   * was actually used. Drives the honest range label (never the point math). */
  band: "below" | "in" | "above" | null;
}

function academicPosition(
  profile: MatchProfile,
  stats: CollegeStats,
  testPolicy: TestPolicy,
  admitRate: number,
): AcademicPosition {
  // ── SAT/ACT position, relative to the college's published middle-50% ──
  let satPos: number | null = null;
  let band: "below" | "in" | "above" | null = null;
  // Test-blind colleges do not consider scores at all — never use them.
  if (testPolicy !== "blind") {
    const range = collegeSatRange(stats);
    const sat = studentSat(profile);
    if (sat != null && range && range.p75 > range.p25) {
      const mid = (range.p25 + range.p75) / 2;
      // Floor the half-width so an artificially narrow band (ubiquitous at
      // ultra-selective schools) can't over-amplify small score differences.
      const half = Math.max((range.p75 - range.p25) / 2, MIN_HALF);
      satPos = clamp((sat - mid) / half, -POS_CLAMP, POS_CLAMP) / POS_CLAMP; // → −1..1
      // The label is honest to the PUBLISHED percentiles, independent of the
      // (softened, MIN_HALF-floored) scoring math: p25..p75 is "in range".
      band = sat < range.p25 ? "below" : sat > range.p75 ? "above" : "in";
    }
  }

  // ── GPA position ──
  // Prefer REAL college GPA data. When the college reports none (the entire
  // dataset today), fall back to a selectivity-scaled anchor so a strong GPA is
  // never silently discarded — but flag it as anchored (lowers completeness).
  // We never fabricate the STUDENT's GPA; a missing student GPA simply drops out.
  let gpaPos: number | null = null;
  let usedRealGpa = false;
  if (profile.unweightedGpa != null) {
    if (stats.gpaAvg != null) {
      gpaPos = clamp((profile.unweightedGpa - stats.gpaAvg) / GPA_SPAN, -1, 1);
      usedRealGpa = true;
    } else {
      gpaPos = clamp(
        (profile.unweightedGpa - gpaAnchor(admitRate)) / GPA_SPAN,
        -1,
        1,
      );
    }
  }

  // ── Blend: test leads when both exist; GPA alone is damped (weaker signal). ──
  let value: number | null;
  if (satPos != null && gpaPos != null) {
    value = SAT_WEIGHT * satPos + (1 - SAT_WEIGHT) * gpaPos;
  } else if (satPos != null) {
    value = satPos;
  } else if (gpaPos != null) {
    value = GPA_ONLY_DAMP * gpaPos;
  } else {
    value = null;
  }

  return {
    value,
    usedTest: satPos != null,
    usedGpa: gpaPos != null,
    usedRealGpa,
    band,
  };
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
  // Real college GPA data is full credit; a student GPA compared to the anchor
  // (no college benchmark) is partial; nothing is zero.
  const cGpa = acad.usedRealGpa ? 1 : acad.usedGpa ? 0.5 : 0;
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

  if (acad.usedTest) {
    // Label from the PUBLISHED percentiles, so a score at/above p25 is never
    // called "below range" (and p75+ is "above").
    if (acad.band === "above") {
      drivers.push({
        kind: "positive",
        text: "Academics above this college's typical range",
      });
    } else if (acad.band === "in") {
      drivers.push({
        kind: "info",
        text: "Academics in range (within the middle 50%)",
      });
    } else {
      drivers.push({
        kind: "caution",
        text: "Academics below this college's typical range",
      });
    }
  } else if (acad.usedGpa) {
    // No usable test score, but the student's GPA anchored the academic read.
    drivers.push({
      kind: "info",
      text: "Assessed on GPA (no test score used)",
    });
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

  const acad = academicPosition(profile, stats, testPolicy, admitRate);
  const gpaMissing = stats.gpaAvg == null;

  // Small course-rigor nudge: pull the college-relative academic position toward
  // the LLM's absolute academics-quality read (which reflects course rigor beyond
  // GPA). Bounded by ACAD_COMP_WEIGHT so SAT/GPA still lead; when it's the only
  // academic signal it's damped like a GPA-only read.
  let acadValue = acad.value;
  if (strength.academics != null) {
    const compPos = academicsComponentPos(strength.academics);
    acadValue =
      acadValue != null
        ? clamp(
            (1 - ACAD_COMP_WEIGHT) * acadValue + ACAD_COMP_WEIGHT * compPos,
            -1,
            1,
          )
        : ACAD_COMP_ONLY_DAMP * compPos;
  }

  // Blend academic position and holistic strength with selectivity-aware
  // weights. Missing signals use a NEUTRAL 0.5 for the point math (they neither
  // help nor hurt) while separately lowering confidence — never assumed average
  // in a way that flatters or penalizes.
  const aPosNorm = acadValue != null ? (acadValue + 1) / 2 : 0.5;
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
