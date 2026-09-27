// Composition layer: merges the two independent dimensions (admission + field)
// into a single CollegeMatch. Neither engine imports the other — this is the
// only place they meet.

import { scoreFieldFit } from "./field-fit";
import { classifyAdmission, normalizeTestPolicy } from "./matching";
import { neutralStrength } from "./strength";
import type {
  AdmissionFit,
  ApplicantStrength,
  CollegeMatch,
  CollegeTarget,
  CollegeWithData,
  FieldResource,
  FieldStrengthRecord,
  MatchProfile,
} from "./types";

// Upper cap for an essay-boosted chance. The nudge is applied AFTER the model's
// selectivity envelope so a finalized essay is always visible to the student
// (even at ultra-selective schools whose realism ceiling is low), but it can
// never imply a near-certain admit.
const ESSAY_BOOST_MAX = 0.99;
// Lower floor so a weak-essay nudge can't drive the estimate to zero.
const ESSAY_BOOST_MIN = 0.005;

/**
 * Apply the supplemental-essay chance nudge (in percentage points) to an already
 * computed admission fit. Applied post-envelope so it stays visible; chance and
 * its range shift together. Category/confidence are intentionally left as the
 * model computed them — this is a fine-grained nudge, not a re-classification.
 */
export function applyEssayChanceDelta(
  admission: AdmissionFit,
  deltaPp: number,
): AdmissionFit {
  if (admission.chance == null || !deltaPp) return admission;
  const delta = deltaPp / 100;
  const adjust = (v: number) =>
    Math.max(ESSAY_BOOST_MIN, Math.min(ESSAY_BOOST_MAX, v + delta));
  return {
    ...admission,
    chance: adjust(admission.chance),
    chanceRange: admission.chanceRange
      ? {
          low: adjust(admission.chanceRange.low),
          high: adjust(admission.chanceRange.high),
        }
      : admission.chanceRange,
  };
}

const NO_TARGET: CollegeTarget = {
  schoolId: null,
  programId: null,
  degreeType: null,
  intendedMajor: null,
};

// `normalizeTestPolicy` now lives in matching.ts so generation and display share
// one implementation; re-exported here for existing importers of this module.
export { normalizeTestPolicy };

export interface CollegeFieldData {
  strength: FieldStrengthRecord | null;
  resources: FieldResource[];
}

export function evaluateCollege(args: {
  profile: MatchProfile;
  /** The student's holistic applicant strength (Layer 2). Defaults to neutral
   * so callers that don't yet load it still work (with lower confidence). */
  strength?: ApplicantStrength;
  fieldKey: string | null;
  college: CollegeWithData;
  fieldData: CollegeFieldData;
  source: string;
  selectedRoundId: string | null;
  /** Optional per-college target; drives the school/program display + (with real
   * data) the school-level baseline the caller may have applied to college.stats. */
  target?: CollegeTarget;
  /** Optional chance nudge (percentage points) from the student's finalized
   * supplemental essays for THIS college. Defaults to 0 (no effect), so callers
   * that don't compute it — and every existing test — behave exactly as before. */
  essayChanceDeltaPp?: number;
}): CollegeMatch {
  const baseAdmission = classifyAdmission(
    args.profile,
    args.college.stats,
    args.strength ?? neutralStrength(),
    { testPolicy: normalizeTestPolicy(args.college.cycle?.testPolicy) },
  );
  const admission = applyEssayChanceDelta(
    baseAdmission,
    args.essayChanceDeltaPp ?? 0,
  );
  const fieldFit = scoreFieldFit(
    args.fieldKey,
    args.fieldData.strength,
    args.fieldData.resources,
  );
  return {
    college: args.college,
    admission,
    fieldFit,
    source: args.source,
    selectedRoundId: args.selectedRoundId,
    target: args.target ?? NO_TARGET,
  };
}
