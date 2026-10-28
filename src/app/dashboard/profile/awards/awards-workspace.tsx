"use client";

import { Award, Compass, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useState } from "react";
import { ExploreOpportunitiesButton } from "~/components/explore-opportunities-button";
import { Button } from "~/components/ui/button";
import type { RecognitionAnalysis } from "~/lib/ai/awards-schema";
import type {
  AwardRecord,
  OpportunityFit,
  RecognitionProfile,
} from "~/lib/awards/types";
import { cn } from "~/lib/utils";
import { AwardsAnalysisLoader } from "./awards-analysis-loader";
import { OpportunityExperiment } from "./opportunity-experiment";
import { OpportunityFinder } from "./opportunity-finder";
import { RecognitionMap } from "./recognition-map";

type Tab = "recognition" | "finder";

export function AwardsWorkspace({
  awards,
  recognition,
  fits,
  initialAnalysis,
  initialAnalyzedAt,
  atlas,
}: {
  awards: AwardRecord[];
  recognition: RecognitionProfile;
  fits: OpportunityFit[];
  initialAnalysis: RecognitionAnalysis | null;
  initialAnalyzedAt: string | null;
  /** Pre-resolved Atlas of Opportunity deep-link inputs (grade/state/interests). */
  atlas: {
    grade: number | null;
    state: string | null;
    interests: string[];
  };
}) {
  const [tab, setTab] = useState<Tab>("recognition");
  const [analysis, setAnalysis] = useState<RecognitionAnalysis | null>(
    initialAnalysis,
  );
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(
    initialAnalyzedAt,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/awards/recognition", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze your recognition.");
        return;
      }
      setAnalysis(data.analysis as RecognitionAnalysis);
      setAnalyzedAt(new Date().toISOString());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const analyzedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const tabs: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
  }[] = [
    {
      key: "recognition",
      label: "Recognition Map",
      icon: <Award className="size-4" />,
    },
    {
      key: "finder",
      label: "Opportunity Finder",
      icon: <Compass className="size-4" />,
    },
  ];

  return (
    <div className="space-y-6">
      {loading && <AwardsAnalysisLoader />}

      {/* Hero */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Awards &amp; Recognition
          </p>
        </div>
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <Award className="size-5 text-brand-teal" />
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            See what your recognition says about your application — the themes
            it demonstrates and the gaps it doesn't — and discover real
            opportunities that could add something new. This is application
            strategy, not an admissions score.
          </p>
        </div>
      </div>

      {/* Test an Opportunity — prominent, always available */}
      <OpportunityExperiment />

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl border border-border bg-muted/40 p-1">
        {tabs.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "recognition" ? (
        <>
          {/* Analyze bar */}
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                What does your recognition add to your story?
              </p>
              <p className="text-xs text-muted-foreground">
                {analyzedDate
                  ? `Last analyzed ${analyzedDate}. Refresh after adding or editing awards.`
                  : "Run the analysis to interpret your awards as a whole and get a per-award read."}
              </p>
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
              {analysis ? "Refresh analysis" : "Analyze my recognition"}
            </Button>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}

          <RecognitionMap
            awards={awards}
            recognition={recognition}
            analysis={analysis}
          />
        </>
      ) : (
        <div className="space-y-4">
          {/* Atlas of Opportunity — explore a much larger external catalog,
              pre-filtered to the student's grade + interests. No sign-in needed. */}
          <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <p className="text-sm font-medium">
                Explore more on Atlas of Opportunity
              </p>
              <p className="text-xs text-muted-foreground">
                Open Atlas's public opportunity finder, pre-filtered to your
                grade and intended field. No sign-in or account needed.
              </p>
            </div>
            <ExploreOpportunitiesButton
              grade={atlas.grade}
              state={atlas.state}
              interests={atlas.interests}
            />
          </div>

          <OpportunityFinder fits={fits} />
        </div>
      )}
    </div>
  );
}
