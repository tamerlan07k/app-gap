// Composition layer: merges the two independent dimensions (admission + field)
// into a single CollegeMatch. Neither engine imports the other — this is the
// only place they meet.

import { scoreFieldFit } from "./field-fit";
import { classifyAdmission } from "./matching";
import type {
  CollegeMatch,
  CollegeWithData,
  FieldResource,
  FieldStrengthRecord,
  MatchProfile,
} from "./types";

export interface CollegeFieldData {
  strength: FieldStrengthRecord | null;
  resources: FieldResource[];
}

export function evaluateCollege(args: {
  profile: MatchProfile;
  fieldKey: string | null;
  college: CollegeWithData;
  fieldData: CollegeFieldData;
  source: string;
  selectedRoundId: string | null;
}): CollegeMatch {
  const admission = classifyAdmission(args.profile, args.college.stats);
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
