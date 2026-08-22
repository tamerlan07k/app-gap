// Composition layer: merges the two independent dimensions (admission + field)
// into a single CollegeMatch. Neither engine imports the other — this is the
// only place they meet.

import { scoreFieldFit } from "./field-fit";
import { classifyAdmission } from "./matching";
import { neutralStrength } from "./strength";
import type {
  ApplicantStrength,
  CollegeMatch,
  CollegeWithData,
  FieldResource,
  FieldStrengthRecord,
  MatchProfile,
  TestPolicy,
} from "./types";

/** Map the raw cycle test_policy string to our normalized TestPolicy. */
export function normalizeTestPolicy(
  raw: string | null | undefined,
): TestPolicy {
  switch ((raw ?? "").toLowerCase()) {
    case "required":
    case "test_required":
      return "required";
    case "optional":
    case "test_optional":
      return "optional";
    case "blind":
    case "test_blind":
      return "blind";
    case "considered":
    case "test_considered":
      return "considered";
    default:
      return "unknown";
  }
}

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
  };
}
