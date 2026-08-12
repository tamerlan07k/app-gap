import type { SupabaseClient } from "@supabase/supabase-js";
import { ArrowRight, MapIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import { type Analysis, analysisSchema } from "~/lib/ai/schema";
import { getNextDeadline } from "~/lib/deadlines";
import { getLatestEvent } from "~/lib/events";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";
import { GapScoreCard } from "./analysis/gap-score-card";
import {
  EssaysCard,
  JumpInCard,
  MyAnalysisCard,
  MyCollegesCard,
  NextDeadlineCard,
} from "./home/dashboard-cards";
import { SavedBanner } from "./saved-banner";

// Number of completed essay / application-writing items. Fail-soft: if the
// profile_documents table isn't present yet (migration not applied) this returns
// 0 rather than breaking the dashboard.
async function getEssaysCompletedCount(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("profile_documents")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "complete")
      .in("doc_type", [
        "personal_statement",
        "supplemental",
        "additional_info",
        "activity_description",
      ]);
    if (error) return 0;
    return count ?? 0;
  } catch {
    return 0;
  }
}

function GenerateCta() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Get started
        </p>
      </div>
      <div className="flex items-start gap-4 p-6">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
          <MapIcon className="size-5 text-brand-teal" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Generate your AppGap Analysis
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            AppGap analyzes your academics, activities, and awards to show
            exactly where your application stands — so you know where to focus.
          </p>
          <div className="mt-5">
            <Button asChild>
              <Link href="/profile/review">
                Generate analysis
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : "there";

  let analysis: Analysis | null = null;
  let analysisId: string | null = null;
  let analyzedDate = "";
  let gradeLevel: string | null = null;
  let essaysCount = 0;
  let collegesCount = 0;
  let latestEvent = null;

  if (user) {
    const [analysisRes, profileRes, essays, event, collegesRes] =
      await Promise.all([
        supabase
          .from("ai_analyses")
          .select("id, analysis, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("profiles")
          .select("grade_level")
          .eq("id", user.id)
          .maybeSingle(),
        getEssaysCompletedCount(supabase, user.id),
        getLatestEvent(supabase, user.id),
        supabase
          .from("user_colleges")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
      ]);

    gradeLevel = profileRes.data?.grade_level ?? null;
    essaysCount = essays;
    collegesCount = collegesRes.count ?? 0;
    latestEvent = event;

    if (analysisRes.data) {
      const parsed = analysisSchema.safeParse(analysisRes.data.analysis);
      if (parsed.success) {
        analysis = parsed.data;
        analysisId = analysisRes.data.id as string;
        analyzedDate = new Date(
          analysisRes.data.created_at as string,
        ).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  }

  const deadline = getNextDeadline(gradeLevel, new Date());

  return (
    <div className="space-y-8">
      <Suspense>
        <SavedBanner />
      </Suspense>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hi, {firstName}.</h1>
        <p className="mt-1 text-muted-foreground">
          Welcome to your AppGap workspace.
        </p>
      </div>

      {analysis && analysisId ? (
        <>
          {/* Hero AppGap Score card — clickable, routes to My Analysis (no regen). */}
          <Link
            href={`/dashboard/roadmap/${analysisId}`}
            className="group block rounded-2xl outline-none transition hover:ring-2 hover:ring-brand-teal/30 focus-visible:ring-2 focus-visible:ring-brand-teal/40"
          >
            <GapScoreCard analysis={analysis} compact />
          </Link>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  My Progress
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <EssaysCard count={essaysCount} />
                  <MyCollegesCard count={collegesCount} />
                </div>
              </section>

              <JumpInCard event={latestEvent} analysisId={analysisId} />
            </div>

            <div className="space-y-6">
              <NextDeadlineCard deadline={deadline} />
              <MyAnalysisCard
                analysisId={analysisId}
                date={analyzedDate}
                score={analysis.gapScore}
              />
            </div>
          </div>
        </>
      ) : (
        <GenerateCta />
      )}
    </div>
  );
}
