import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { analysisSchema } from "~/lib/ai/schema";
import { createClient } from "~/lib/supabase/server";
import { GapScoreCard } from "../../analysis/gap-score-card";
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

  const [analysisRes, profileRes, lastGenRes] = await Promise.all([
    supabase
      .from("ai_analyses")
      .select("analysis, created_at")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("ai_analyses")
      .select("created_at")
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

  const tier =
    (profileRes.data as { subscription_tier?: string } | null)
      ?.subscription_tier === "pro"
      ? "pro"
      : "free";

  let canGenerate = true;
  if (tier === "free" && lastGenRes.data) {
    const next = new Date(lastGenRes.data.created_at as string);
    next.setMonth(next.getMonth() + 1);
    if (new Date() < next) canGenerate = false;
  }

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
    </div>
  );
}
