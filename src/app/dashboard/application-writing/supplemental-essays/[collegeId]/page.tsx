import { notFound } from "next/navigation";
import { createClient } from "~/lib/supabase/server";
import { resolveSupplementalGate } from "~/lib/supplemental/access";
import {
  loadCollegeGroup,
  loadSupplementStatus,
  loadUserCollegeSchool,
  loadVerifiedPrompts,
} from "~/lib/supplemental/db";
import { ProUpsell } from "../pro-upsell";
import { CollegeWorkspace } from "./college-workspace";

// A single college's supplemental workspace — official prompts (pre-populated),
// add-a-prompt fallback, and per-prompt status. Pro-only.
export default async function CollegeSupplementalPage({
  params,
}: {
  params: Promise<{ collegeId: string }>;
}) {
  const { collegeId } = await params;
  const gate = await resolveSupplementalGate();
  if (!gate) return null;
  if (!gate.enabled) return <ProUpsell />;

  const supabase = await createClient();
  const [group, allPrompts, status, selectedSchoolId] = await Promise.all([
    loadCollegeGroup(supabase, gate.userId, collegeId),
    loadVerifiedPrompts(supabase, collegeId),
    loadSupplementStatus(supabase, collegeId),
    loadUserCollegeSchool(supabase, gate.userId, collegeId),
  ]);
  if (!group) notFound();

  // School-aware filtering: some universities (e.g. Cornell) publish prompts that
  // apply only to a specific undergraduate school. A prompt with school_id = null
  // is university-wide (always shown); a school-specific prompt is shown only when
  // it matches the student's My Colleges selection. Universal prompts are never
  // hidden. With no selection, everything is shown (nothing to filter by).
  const schoolSpecific = allPrompts.filter((p) => p.schoolId);
  let officialPrompts = allPrompts;
  let schoolNote: string | null = null;
  if (schoolSpecific.length > 0) {
    if (selectedSchoolId) {
      officialPrompts = allPrompts.filter(
        (p) => !p.schoolId || p.schoolId === selectedSchoolId,
      );
      const hidden = allPrompts.length - officialPrompts.length;
      if (hidden > 0) {
        const selectedName =
          allPrompts.find((p) => p.schoolId === selectedSchoolId)?.schoolName ??
          null;
        schoolNote = selectedName
          ? `Showing prompts for ${selectedName} plus any university-wide prompts. ${hidden} prompt${hidden === 1 ? "" : "s"} for other schools at this university ${hidden === 1 ? "is" : "are"} hidden based on your My Colleges selection.`
          : `Showing university-wide prompts. ${hidden} school-specific prompt${hidden === 1 ? "" : "s"} ${hidden === 1 ? "is" : "are"} hidden based on your My Colleges selection.`;
      }
    } else {
      schoolNote =
        "This university has school-specific prompts. Pick your school for this college in My Colleges to see only the prompts that apply to you.";
    }
  }

  return (
    <CollegeWorkspace
      group={group}
      officialPrompts={officialPrompts}
      status={status}
      schoolNote={schoolNote}
    />
  );
}
