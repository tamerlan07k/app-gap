"use client";

import { FlaskConical, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import type {
  OpportunityExperiment as Assessment,
  ExperimentVerdict,
} from "~/lib/ai/opportunity-experiment-schema";
import { cn } from "~/lib/utils";

const VERDICT_META: Record<
  ExperimentVerdict,
  { emoji: string; label: string; badge: string; border: string }
> = {
  worthwhile: {
    emoji: "🟢",
    label: "Potentially worthwhile",
    badge: "bg-brand-teal/10 text-brand-teal",
    border: "border-brand-teal/30",
  },
  limited: {
    emoji: "🟡",
    label: "Limited application value",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  low_value: {
    emoji: "🔴",
    label: "Low application value / high time cost",
    badge: "bg-red-500/10 text-red-600 dark:text-red-400",
    border: "border-red-500/30",
  },
};

function Line({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  if (!children || (typeof children === "string" && !children.trim()))
    return null;
  return (
    <p className="text-sm leading-relaxed">
      <span className="font-semibold text-foreground">{label} </span>
      <span className="text-muted-foreground">{children}</span>
    </p>
  );
}

// The prominent "🧪 Test an Opportunity" tool. Paste any competition/program and
// get a short, practical read on whether it's worth pursuing for your application.
export function OpportunityExperiment() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Assessment | null>(null);

  async function run() {
    if (!text.trim()) {
      setError("Paste an opportunity to test first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/awards/experiment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't assess that opportunity.");
        return;
      }
      setResult(data.assessment as Assessment);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const meta = result ? VERDICT_META[result.verdict] : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <FlaskConical className="size-4 text-brand-teal" />
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Test an Opportunity
        </p>
      </div>
      <div className="space-y-4 p-6">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Thinking about a specific competition, hackathon, conference, program,
          or fellowship? Paste its name or a short description and get a quick,
          practical read on whether it's worth pursuing for your application —
          right now.
        </p>
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Regeneron Science Talent Search — a senior-year research competition"
          rows={3}
          maxLength={1500}
        />
        <div className="flex items-center gap-3">
          <Button onClick={run} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <FlaskConical />}
            {result ? "Test another" : "Test it"}
          </Button>
          <p className="text-xs text-muted-foreground">
            A strategy read — never an admissions prediction.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && meta && (
          <div className={cn("space-y-3 rounded-xl border p-4", meta.border)}>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                  meta.badge,
                )}
              >
                <span aria-hidden>{meta.emoji}</span>
                {meta.label}
              </span>
              {result.addressesGap && (
                <span className="inline-flex items-center rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-medium text-brand-teal">
                  Addresses a gap
                </span>
              )}
            </div>
            {result.headline && (
              <p className="text-sm font-semibold leading-snug">
                {result.headline}
              </p>
            )}
            <Line label="What it could add:">{result.whatItCouldAdd}</Line>
            <Line label="Overlaps with:">{result.overlaps}</Line>
            <Line label="Gap:">{result.gapNote}</Line>
            <Line label="Effort:">{result.effortNote}</Line>
            <Line label="Timing:">{result.timingNote}</Line>
            <Line label="Why:">{result.rationale}</Line>
          </div>
        )}
      </div>
    </div>
  );
}
