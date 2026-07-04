import { ArrowLeft, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "~/components/ui/button";
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

  const { data } = await supabase
    .from("ai_analyses")
    .select("analysis, created_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return notFound();

  const result = analysisSchema.safeParse(data.analysis);
  if (!result.success) return notFound();

  const analysis = result.data;

  const analyzedDate = new Date(data.created_at as string).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
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
        <Button size="sm" variant="outline" asChild>
          <Link href="/profile/review">Generate New</Link>
        </Button>
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
            <p className="text-xs text-muted-foreground">
              <Link
                href="/profile/review"
                className="font-medium text-brand-teal underline-offset-4 hover:underline"
              >
                Update profile & regenerate
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
