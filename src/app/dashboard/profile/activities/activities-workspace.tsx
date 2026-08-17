"use client";

import {
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import type { VerifiedOpportunity } from "~/lib/activities/db";
import type {
  ActivitiesAnalysis,
  ActivityAnalysis,
} from "~/lib/ai/activities-schema";
import { cn } from "~/lib/utils";
import { ActivityForm, type EditableActivity } from "./activity-form";
import { ActivityItem } from "./activity-item";
import { ProfileAnalysisCard } from "./profile-analysis-card";
import { RecommendationCard } from "./recommendation-card";
import { VerifiedOpportunityCard } from "./verified-opportunity-card";

export type WorkspaceTimeline = {
  stage: string;
  band: string;
  posture: string;
  timeRemaining: string;
};

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-brand-teal/10 text-brand-teal",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  low: "bg-muted text-muted-foreground",
};

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {title}
      {count != null && (
        <span className="ml-2 text-muted-foreground/70">{count}</span>
      )}
    </h2>
  );
}

export function ActivitiesWorkspace({
  activities,
  timeline,
  initialAnalysis,
  initialAnalyzedAt,
  verifiedOpportunities,
}: {
  activities: EditableActivity[];
  timeline: WorkspaceTimeline;
  initialAnalysis: ActivitiesAnalysis | null;
  initialAnalyzedAt: string | null;
  verifiedOpportunities: VerifiedOpportunity[];
}) {
  const [analysis, setAnalysis] = useState<ActivitiesAnalysis | null>(
    initialAnalysis,
  );
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(
    initialAnalyzedAt,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // Match per-activity analysis back to the live activity by name.
  const analysisByName = useMemo(() => {
    const map = new Map<string, ActivityAnalysis>();
    for (const a of analysis?.activityAnalyses ?? []) {
      if (!map.has(a.activityName)) map.set(a.activityName, a);
    }
    return map;
  }, [analysis]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-activities", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze your activities.");
        return;
      }
      setAnalysis(data.analysis as ActivitiesAnalysis);
      setAnalyzedAt(new Date().toISOString());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasActivities = activities.length > 0;
  const analyzedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const recommendations = analysis?.recommendations ?? [];

  return (
    <section className="space-y-6">
      {/* Intro + action */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Activities
          </p>
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
              <ListChecks className="size-5 text-brand-teal" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold tracking-tight">
                Manage and grow what you do outside class
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AppGap looks at each activity two ways — how strong it is and
                how well it fits your field — suggests whether to continue or
                deepen it, and recommends realistic things to explore next. It's
                guidance for meaningful choices, not an admissions score.
              </p>
              {analyzedDate && (
                <p className="text-xs text-muted-foreground">
                  Last analyzed {analyzedDate}. Refresh after editing your
                  activities.
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            variant={analysis ? "outline" : "default"}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : analysis ? (
              <RefreshCw />
            ) : (
              <Sparkles />
            )}
            {analysis ? "Refresh analysis" : "Analyze my activities"}
          </Button>
        </div>
        {error && (
          <div className="border-t border-border px-6 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Timeline posture */}
      <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
        <CalendarClock className="mt-0.5 size-4 shrink-0 text-brand-teal" />
        <p className="text-muted-foreground">
          <span className="font-medium text-foreground">{timeline.stage}</span>
          {" · "}
          {timeline.timeRemaining}. {timeline.posture}
        </p>
      </div>

      {/* My Activities */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader title="My activities" count={activities.length} />
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus />
              Add activity
            </Button>
          )}
        </div>

        {adding && (
          <ActivityForm
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}

        {hasActivities ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {activities.map((a) => (
              <ActivityItem
                key={a.id}
                activity={a}
                analysis={analysisByName.get(a.name) ?? null}
              />
            ))}
          </div>
        ) : (
          !adding && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
                <ListChecks className="size-7 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold">A great place to start</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  You don't have activities listed yet — that's completely fine,
                  especially early in high school. Add anything you already do,
                  or run the analysis for realistic ideas matched to your grade
                  and interests.
                </p>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus />
                Add your first activity
              </Button>
            </div>
          )
        )}
      </div>

      {/* Your Activity Profile (collective) */}
      {analysis?.profile && <ProfileAnalysisCard profile={analysis.profile} />}

      {/* Recommended Opportunities */}
      {(verifiedOpportunities.length > 0 || recommendations.length > 0) && (
        <div className="space-y-4">
          <SectionHeader title="Recommended opportunities" />

          {verifiedOpportunities.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Verified opportunities with real application pages.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {verifiedOpportunities.map((o) => (
                  <VerifiedOpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            </div>
          )}

          {recommendations.length > 0 && (
            <div className="space-y-2">
              {verifiedOpportunities.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Ideas matched to your profile. These are starting points, not
                  listings — always verify details yourself.
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-2">
                {recommendations.map((rec) => (
                  <RecommendationCard key={rec.title} rec={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* What Should I Do Next */}
      {analysis &&
        (analysis.nextStepsSummary || analysis.nextSteps.length > 0) && (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                What should I do next
              </p>
            </div>
            <div className="space-y-4 p-6">
              {analysis.nextStepsSummary && (
                <p className="text-sm leading-relaxed">
                  {analysis.nextStepsSummary}
                </p>
              )}
              {analysis.nextSteps.length > 0 && (
                <ul className="space-y-3">
                  {analysis.nextSteps.map((s) => (
                    <li key={s.step} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{s.step}</p>
                          <span
                            className={cn(
                              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                              PRIORITY_BADGE[s.priority] ??
                                "bg-muted text-muted-foreground",
                            )}
                          >
                            {s.priority}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {s.rationale}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
    </section>
  );
}
