"use client";

import { Loader2, PenLine, RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import type {
  ActivityWritingFeedback,
  WritingAnalysis,
} from "~/lib/ai/writing-schema";
import { ActivityWritingCard } from "./activity-writing-card";
import { AdditionalInfoCard } from "./additional-info-card";

export type WorkspaceActivity = {
  id: string;
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
  const router = useRouter();
  // Set once a revised description is applied to the shared profile so we can
  // offer a single "update your score" re-evaluation (rather than one per card).
  const [profileChanged, setProfileChanged] = useState(false);
  const [reassessing, setReassessing] = useState(false);
  const [reassessError, setReassessError] = useState<string | null>(null);

  async function updateScore() {
    setReassessing(true);
    setReassessError(null);
    try {
      const res = await fetch("/api/reassess-profile", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setReassessError(data.error ?? "Couldn't update your score.");
        return;
      }
      // Success — the Overview reveals the new score once.
      router.push("/dashboard/profile");
      router.refresh();
    } catch {
      setReassessError("Something went wrong updating your score.");
    } finally {
      setReassessing(false);
    }
  }

  // Match each AI feedback entry back to exactly one live activity, keeping every
  // activity's analysis under its own card. Primary match is by normalized name
  // (case/whitespace-insensitive) so a minor echo difference still lands; any
  // feedback that doesn't match a name is assigned, in order, to the next
  // still-unmatched activity as a positional fallback. This guarantees one
  // activity's recommendations never appear under another and none silently
  // vanish.
  const feedbackForActivity = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
    const result = new Map<string, ActivityWritingFeedback>();
    const entries = [...(analysis?.activities ?? [])];
    const used = new Set<number>();

    // Pass 1 — exact (normalized) name match.
    for (const a of activities) {
      const idx = entries.findIndex(
        (f, i) => !used.has(i) && norm(f.activityName) === norm(a.name),
      );
      if (idx !== -1) {
        used.add(idx);
        result.set(a.name, entries[idx]);
      }
    }
    // Pass 2 — positional fallback for activities still without feedback.
    for (const a of activities) {
      if (result.has(a.name)) continue;
      const idx = entries.findIndex((_, i) => !used.has(i));
      if (idx !== -1) {
        used.add(idx);
        result.set(a.name, entries[idx]);
      }
    }
    return result;
  }, [analysis, activities]);

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
            Activity &amp; Additional Info
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
                key={a.id}
                id={a.id}
                name={a.name}
                category={a.category}
                description={a.description}
                feedback={feedbackForActivity.get(a.name) ?? null}
                onApplied={() => setProfileChanged(true)}
              />
            ))}
          </div>
        </div>
      )}

      {/* After a revised description is applied to the profile, offer a single
          diagnostic re-evaluation. Changes are already saved to the profile; the
          score only moves once this succeeds, so a failure never shows a stale
          score as current. */}
      {profileChanged && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-0.5">
            <p className="text-sm font-medium">
              Updated description saved to your profile
            </p>
            <p className="text-xs text-muted-foreground">
              Re-evaluate your AppGap diagnostic so your score reflects the
              change.{" "}
              {reassessError && (
                <span className="text-destructive">{reassessError}</span>
              )}
            </p>
          </div>
          <Button
            onClick={updateScore}
            disabled={reassessing}
            className="shrink-0"
          >
            {reassessing ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Update my AppGap score
          </Button>
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
