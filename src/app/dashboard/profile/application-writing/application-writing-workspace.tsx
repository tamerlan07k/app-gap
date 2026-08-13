"use client";

import { Loader2, PenLine, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  ActivityWritingFeedback,
  WritingAnalysis,
} from "~/lib/ai/writing-schema";
import { ActivityWritingCard } from "./activity-writing-card";
import { AdditionalInfoCard } from "./additional-info-card";

export type WorkspaceActivity = {
  name: string;
  category: string;
  description: string;
};

// The Application Writing workspace: run the analysis, then review each activity
// description as a scored card and the Additional Information response against
// the Common App's own criteria. Mirrors the dashboard card styling exactly so
// it feels native to My Profile.
export function ApplicationWritingWorkspace({
  activities,
  additionalInfo,
  initialAnalysis,
  initialAnalyzedAt,
}: {
  activities: WorkspaceActivity[];
  additionalInfo: string;
  initialAnalysis: WritingAnalysis | null;
  initialAnalyzedAt: string | null;
}) {
  const [analysis, setAnalysis] = useState<WritingAnalysis | null>(
    initialAnalysis,
  );
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(
    initialAnalyzedAt,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Match AI feedback back to live activities by name.
  const feedbackByName = useMemo(() => {
    const map = new Map<string, ActivityWritingFeedback>();
    for (const f of analysis?.activities ?? []) {
      if (!map.has(f.activityName)) map.set(f.activityName, f);
    }
    return map;
  }, [analysis]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/application-writing", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to generate writing feedback.");
        return;
      }
      setAnalysis(data.analysis as WritingAnalysis);
      setAnalyzedAt(new Date().toISOString());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasContent = activities.length > 0 || additionalInfo.trim().length > 0;
  const analyzedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <section className="space-y-6">
      {/* Intro + action */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Application Writing
          </p>
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
              <PenLine className="size-5 text-brand-teal" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold tracking-tight">
                Score and sharpen how your application reads
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AppGap scores each activity description out of 10 on its action
                verb, specificity, and impact — then helps you communicate your
                real experiences more clearly. It never invents details.
              </p>
              {analyzedDate && (
                <p className="text-xs text-muted-foreground">
                  Last analyzed {analyzedDate}. Refresh after editing your
                  descriptions.
                </p>
              )}
            </div>
          </div>
          {hasContent && (
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
                <PenLine />
              )}
              {analysis ? "Refresh" : "Analyze my writing"}
            </Button>
          )}
        </div>
        {error && (
          <div className="border-t border-border px-6 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {!hasContent && (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-medium">Nothing to review yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add an activity description or an Additional Information response to
            get writing feedback.
          </p>
        </div>
      )}

      {/* Activities */}
      {activities.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Activities
            </p>
          </div>
          <div className="divide-y divide-border">
            {activities.map((a) => (
              <ActivityWritingCard
                key={a.name}
                name={a.name}
                category={a.category}
                description={a.description}
                feedback={feedbackByName.get(a.name) ?? null}
              />
            ))}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {additionalInfo.trim() && (
        <AdditionalInfoCard
          response={additionalInfo}
          feedback={analysis?.additionalInfo ?? null}
        />
      )}
    </section>
  );
}
