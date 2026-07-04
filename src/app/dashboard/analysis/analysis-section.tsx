import { ArrowRight, MapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import { analysisSchema } from "~/lib/ai/schema";
import { createClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 65) return "Strong";
  if (score >= 50) return "Developing";
  if (score >= 35) return "Building";
  return "Early Stage";
}

function getScoreColor(score: number): string {
  if (score >= 75) return "text-brand-teal";
  if (score >= 50) return "text-amber-500";
  return "text-red-500 dark:text-red-400";
}

function CtaCard() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Get started
        </p>
      </div>
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <MapIcon className="size-5 text-brand-teal" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">
              Build My Roadmap
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              AppGap will analyze your academic profile, extracurriculars, and
              career direction to generate a personalized set of recommendations
              — so you know exactly where to focus before you apply.
            </p>
            <div className="mt-5">
              <Button size="default" asChild>
                <Link href="/profile">
                  Start My Roadmap
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export async function AnalysisSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("ai_analyses")
    .select("id, analysis, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return <CtaCard />;

  const result = analysisSchema.safeParse(data.analysis);
  if (!result.success) return <CtaCard />;

  const analysis = result.data;
  const analysisId = data.id as string;
  const label = getScoreLabel(analysis.gapScore);
  const scoreColor = getScoreColor(analysis.gapScore);

  const analyzedDate = new Date(data.created_at as string).toLocaleDateString(
    "en-US",
    { month: "long", day: "numeric", year: "numeric" },
  );

  return (
    <Link
      href={`/dashboard/roadmap/${analysisId}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
    >
      <div className="flex items-center justify-between border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Your Latest AppGap Report
        </p>
        <span className="flex items-center gap-1 text-xs font-medium text-brand-teal">
          View Report
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="flex items-center gap-6 p-6">
        <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-teal">
              {analysis.gapScore}
            </p>
            <p className="text-[10px] text-muted-foreground">/ 100</p>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("font-semibold", scoreColor)}>{label}</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Analyzed {analyzedDate}
          </p>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
            {analysis.gapScoreExplanation}
          </p>
        </div>
      </div>
    </Link>
  );
}
