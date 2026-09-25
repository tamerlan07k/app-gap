import { notFound } from "next/navigation";
import { createClient } from "~/lib/supabase/server";
import { resolveSupplementalGate } from "~/lib/supplemental/access";
import { loadEssayWorkspace } from "~/lib/supplemental/db";
import { ProUpsell } from "../../pro-upsell";
import { EssayWorkspace } from "./essay-workspace";

// One supplemental prompt's workspace: the prompt analysis, the editor, the
// evaluation, line-by-line, application check, coverage checklist, and GapCoach.
// Pro-only.
export default async function EssayPage({
  params,
}: {
  params: Promise<{ collegeId: string; essayId: string }>;
}) {
  const { collegeId, essayId } = await params;
  const gate = await resolveSupplementalGate();
  if (!gate) return null;
  if (!gate.enabled) return <ProUpsell />;

  const supabase = await createClient();
  const data = await loadEssayWorkspace(supabase, gate.userId, essayId);
  if (!data || data.essay.collegeId !== collegeId) notFound();

  return <EssayWorkspace collegeId={collegeId} data={data} />;
}
