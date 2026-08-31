// Composition layer: merges the two independent dimensions (admission + field)
// into a single CollegeMatch. Neither engine imports the other — this is the
// only place they meet.

import { scoreFieldFit } from "./field-fit";
import { classifyAdmission, normalizeTestPolicy } from "./matching";
import { neutralStrength } from "./strength";
import type {
  ApplicantStrength,
  CollegeMatch,
  CollegeTarget,
  CollegeWithData,
  FieldResource,
  FieldStrengthRecord,
  MatchProfile,
} from "./types";

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
}): CollegeMatch {
  const admission = classifyAdmission(
    args.profile,
    args.college.stats,
    args.strength ?? neutralStrength(),
    { testPolicy: normalizeTestPolicy(args.college.cycle?.testPolicy) },
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
