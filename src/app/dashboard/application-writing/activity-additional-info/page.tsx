import { writingAnalysisSchema } from "~/lib/ai/writing-schema";
import { createClient } from "~/lib/supabase/server";
import { ApplicationWritingWorkspace } from "./application-writing-workspace";

// Application Writing — a scored workspace inside My Profile. Shows each activity
// description with a 0–10 score (action verb / specificity / impact) plus a
// truthful rewrite, template, or polish note, and reviews the Common App
// Additional Information response against that section's actual purpose.
//
// This lives under the profile layout, so it inherits the profile sidebar, the
// "Back to dashboard" button, and the shared styling automatically.
export default async function ApplicationWritingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [activitiesRes, profileRes, writingRes] = await Promise.all([
    supabase
      .from("activities")
      .select("name, category, description")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("additional_context")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("writing_analyses")
      .select("analysis, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  // Live activity descriptions (only those with text to review).
  const activities = (
    (activitiesRes.data ?? []) as Array<{
      name: string;
      category: string;
      description: string | null;
    }>
  )
    .filter((a) => a.description?.trim())
    .map((a) => ({
      name: a.name,
      category: a.category,
      description: a.description ?? "",
    }));

  const additionalInfo =
    ((profileRes.data as { additional_context?: string | null } | null)
      ?.additional_context ??
      "") ||
    "";

  // Latest cached feedback, validated defensively. Rows written by an older
  // schema simply fail validation and are treated as "not analyzed yet".
  const writingRow = writingRes.data as {
    analysis: unknown;
    created_at: string;
    updated_at: string | null;
  } | null;
  const parsed = writingRow
    ? writingAnalysisSchema.safeParse(writingRow.analysis)
    : null;
  const initialAnalysis = parsed?.success ? parsed.data : null;
  const initialAnalyzedAt =
    parsed?.success && writingRow
      ? (writingRow.updated_at ?? writingRow.created_at)
      : null;

  return (
    <ApplicationWritingWorkspace
      activities={activities}
      additionalInfo={additionalInfo}
      initialAnalysis={initialAnalysis}
      initialAnalyzedAt={initialAnalyzedAt}
    />
  );
}
