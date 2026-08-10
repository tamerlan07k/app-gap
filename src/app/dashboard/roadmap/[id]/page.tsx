import { ArrowLeft, ArrowRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { analysisSchema } from "~/lib/ai/schema";
import { type EntitlementProfile, resolveEntitlement } from "~/lib/entitlement";
import { checkFeatureAllowance } from "~/lib/feature-usage";
import { createClient } from "~/lib/supabase/server";
import { GapScoreCard } from "../../analysis/gap-score-card";
import { NarrativeCard } from "../../analysis/narrative-card";
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

  const [analysisRes, profileRes] = await Promise.all([
    supabase
      .from("ai_analyses")
      .select("analysis, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select(
        "subscription_tier, subscription_status, admin_override, admin_override_tier, admin_override_expires_at",
      )
      .eq("id", user.id)
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

  // Effective tier honors an active admin override; whether a new diagnostic is
  // available comes from the feature-based entitlement (append-only usage ledger),
  // so deleting an analysis never re-enables regeneration. Fail closed on error.
  const entitlement = resolveEntitlement(
    profileRes.data as EntitlementProfile | null,
  );
  const allowance = await checkFeatureAllowance(
    supabase,
    user.id,
    "profileAnalysis",
    entitlement.tier,
  ).catch(() => null);
  const canGenerate = allowance?.allowed ?? false;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <Link
          href="/dashboard/roadmaps"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          My Analysis
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

      {/* Transition to the Workplace — next steps live there, not in the diagnostic */}
      <Link
        href="/dashboard/workspace"
        className="group flex items-center justify-between gap-4 overflow-hidden rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] p-6 transition-colors hover:bg-brand-teal/[0.08]"
      >
        <div className="space-y-1">
          <p className="font-semibold">Your analysis shows where you stand.</p>
          <p className="text-sm text-muted-foreground">
            Your next steps are waiting in your Workplace.
          </p>
        </div>
        <ArrowRight className="size-5 shrink-0 text-brand-teal transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
