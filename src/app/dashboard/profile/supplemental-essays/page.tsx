import { createClient } from "~/lib/supabase/server";
import { resolveSupplementalGate } from "~/lib/supplemental/access";
import { loadCollegeCatalogInfo, loadEssayGroups } from "~/lib/supplemental/db";
import { CollegeList } from "./college-list";
import { ProUpsell } from "./pro-upsell";

// Supplemental Essays — section landing. Shows the student's colleges (from My
// Colleges) with per-college essay progress. Clicking a college opens its
// supplemental workspace. Pro-only.
export default async function SupplementalEssaysPage() {
  const gate = await resolveSupplementalGate();
  if (!gate) return null;
  if (!gate.enabled) return <ProUpsell />;

  const supabase = await createClient();
  const groups = await loadEssayGroups(supabase, gate.userId);
  const catalog = await loadCollegeCatalogInfo(
    supabase,
    groups.map((g) => g.collegeId),
  );

  return <CollegeList groups={groups} catalog={catalog} />;
}
