import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SUBSCRIPTION_TIERS } from "~/lib/ai/config";
import { analysisSchema } from "~/lib/ai/schema";
import { writingAnalysisSchema } from "~/lib/ai/writing-schema";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { countGenerationsThisMonth } from "~/lib/roadmap-usage";
import { createClient } from "~/lib/supabase/server";
import { ApplicationWritingSection } from "../../analysis/application-writing/application-writing-section";
import { GapScoreCard } from "../../analysis/gap-score-card";
import { NarrativeCard } from "../../analysis/narrative-card";
import { NextStepsCard } from "../../analysis/next-steps-card";
import { RoadmapPreviewCard } from "../../analysis/roadmap-preview-card";
import { StrongestAreasCard } from "../../analysis/strongest-areas-card";
import { TopGapsCard } from "../../analysis/top-gaps-card";

export default async function RoadmapResultPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return notFound();

  const [analysisRes, profileRes, generationsUsed, activitiesRes, writingRes] =
    await Promise.all([
      supabase
        .from("ai_analyses")
        .select("analysis, created_at")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("profiles")
        .select(
          "subscription_tier, subscription_status, admin_override, admin_override_tier, admin_override_expires_at, additional_context",
        )
        .eq("id", user.id)
        .maybeSingle(),
      countGenerationsThisMonth(supabase, user.id).catch((error) => {
        // Fail closed: on error, treat as limit reached rather than unlimited.
        console.error("[roadmap] failed to count generations:", error);
        return Number.POSITIVE_INFINITY;
      }),
      // Live activity descriptions and the latest cached Application Writing
      // feedback — both read under the user's own RLS.
      supabase
        .from("activities")
        .select("name, category, description")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("writing_analyses")
        .select("analysis, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const data = analysisRes.data;

  if (!data) return notFound();

  const result = analysisSchema.safeParse(data.analysis);
  if (!result.success) return notFound();

  const analysis = result.data;

  const analyzedDate = new Date(data.created_at as string).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  // Effective tier honors an active admin override; remaining generations come
  // from the usage ledger, so deleting roadmaps never re-enables regeneration.
  const entitlement = resolveEntitlement(
    profileRes.data as EntitlementProfile | null,
  );
  const limit = SUBSCRIPTION_TIERS[entitlement.tier].generationsPerMonth;
  const canGenerate = generationsUsed < limit;

  // Application Writing inputs — live activity descriptions + Additional
  // Information, plus any cached writing feedback (validated defensively).
  const writingActivities = (
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

  const writingRow = writingRes.data as {
    analysis: unknown;
    created_at: string;
  } | null;
  const writingParsed = writingRow
    ? writingAnalysisSchema.safeParse(writingRow.analysis)
    : null;
  const initialWritingAnalysis = writingParsed?.success
    ? writingParsed.data
    : null;
  const initialWritingAnalyzedAt =
    writingParsed?.success && writingRow ? writingRow.created_at : null;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Link
          href="/dashboard/roadmaps"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          My Roadmaps
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">AppGap Analysis</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analyzed {analyzedDate}
        </p>
      </div>

      <GapScoreCard analysis={analysis} />

      <div className="grid gap-6 lg:grid-cols-2">
        <StrongestAreasCard areas={analysis.strongestAreas} />
        <TopGapsCard gaps={analysis.topGaps} />
      </div>

      {analysis.applicationNarrative && (
        <NarrativeCard narrative={analysis.applicationNarrative} />
      )}

      <NextStepsCard steps={analysis.nextSteps} />

      {/* Full roadmap — show every item */}
      <RoadmapPreviewCard roadmap={analysis.roadmap} showAll />

      {/* Advisor note */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Advisor Note
          </p>
        </div>
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <MessageSquare className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-2">
            <p className="text-sm leading-relaxed text-muted-foreground">
              {analysis.advisorNote}
            </p>
            {canGenerate && (
              <p className="text-xs text-muted-foreground">
                <Link
                  href="/profile/review"
                  className="font-medium text-brand-teal underline-offset-4 hover:underline"
                >
                  Update profile & regenerate
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Application Writing — communication feedback on the student's real
          activity descriptions and Additional Information. Independent of the
          gap score above. */}
      <ApplicationWritingSection
        activities={writingActivities}
        additionalInfo={additionalInfo}
        initialAnalysis={initialWritingAnalysis}
        initialAnalyzedAt={initialWritingAnalyzedAt}
      />
    </div>
  );
}
