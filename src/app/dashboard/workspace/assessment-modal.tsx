"use client";

import { ArrowRight, Check, Compass, Loader2, X } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import {
  ASSESSMENT_QUESTIONS,
  type AssessmentAnswers,
  type AssessmentResult,
} from "~/lib/roadmap/assessment";
import { cn } from "~/lib/utils";

// Career Path Assessment — a short, deterministic questionnaire. Answers post to
// /api/roadmap/assessment (scored in code), then the suggested fields are shown
// for review. Confirming completes the career foundation step. A student who
// already has a clear major can confirm it instead of taking the assessment.

export function AssessmentModal({
  existingMajorLabel,
  initialResult,
  onClose,
  onDone,
}: {
  existingMajorLabel: string | null;
  initialResult: AssessmentResult | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [answers, setAnswers] = useState<AssessmentAnswers>({});
  const [result, setResult] = useState<AssessmentResult | null>(initialResult);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answeredCount = Object.values(answers).filter(
    (a) => a.length > 0,
  ).length;

  function toggle(qid: string, optKey: string, type: "single" | "multi") {
    setAnswers((prev) => {
      const cur = prev[qid] ?? [];
      if (type === "single") return { ...prev, [qid]: [optKey] };
      return {
        ...prev,
        [qid]: cur.includes(optKey)
          ? cur.filter((k) => k !== optKey)
          : [...cur, optKey],
      };
    });
  }

  async function submitAssessment() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      const body = await res.json();
      if (res.ok && body.result) {
        setResult(body.result as AssessmentResult);
      } else {
        setError(body.error ?? "Couldn't save your assessment.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmExisting() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/roadmap/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "confirm" }),
      });
      if (res.ok) {
        onDone();
      } else {
        const body = await res.json();
        setError(body.error ?? "Couldn't confirm your direction.");
      }
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Career Path Assessment"
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Compass className="size-5 text-brand-teal" aria-hidden />
            <h2 className="text-lg font-semibold">Career Path Assessment</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        {result ? (
          <ResultView
            result={result}
            onConfirm={onDone}
            onRetake={() => setResult(null)}
            saving={saving}
          />
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              A few quick questions to surface directions that fit you. This is
              a starting point you can review and change — not a verdict.
            </p>

            {existingMajorLabel && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-brand-teal/30 bg-brand-teal/[0.04] p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm">
                  Your profile already shows{" "}
                  <span className="font-semibold">{existingMajorLabel}</span>.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={confirmExisting}
                  disabled={saving}
                >
                  Confirm this direction
                </Button>
              </div>
            )}

            <div className="mt-5 space-y-6">
              {ASSESSMENT_QUESTIONS.map((q) => (
                <fieldset key={q.id}>
                  <legend className="text-sm font-semibold">{q.prompt}</legend>
                  {q.helper && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {q.helper}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {q.options.map((opt) => {
                      const active = (answers[q.id] ?? []).includes(opt.key);
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggle(q.id, opt.key, q.type)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-sm transition",
                            active
                              ? "border-brand-teal bg-brand-teal/10 font-medium text-brand-teal"
                              : "border-input text-muted-foreground hover:border-brand-teal/50 hover:text-foreground",
                          )}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>

            {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

            <div className="mt-6 flex items-center justify-end gap-2">
              <Button
                onClick={submitAssessment}
                disabled={saving || answeredCount < 3}
              >
                {saving && <Loader2 className="animate-spin" />}
                See my results
                <ArrowRight />
              </Button>
            </div>
            {answeredCount < 3 && (
              <p className="mt-2 text-right text-xs text-muted-foreground">
                Answer a few more to get a useful result.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResultView({
  result,
  onConfirm,
  onRetake,
  saving,
}: {
  result: AssessmentResult;
  onConfirm: () => void;
  onRetake: () => void;
  saving: boolean;
}) {
  return (
    <div className="mt-3">
      {result.undecided || result.topFields.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Your answers don't point strongly in one direction yet — and that's
          completely fine this early. You can keep exploring; this step is done
          either way.
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            Directions that fit your answers — a place to start, not a
            commitment:
          </p>
          <div className="mt-3 space-y-3">
            {result.topFields.map((f, i) => (
              <div
                key={f.fieldKey}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="flex items-center gap-2">
                  {i === 0 && (
                    <span className="rounded-full bg-brand-teal/10 px-2 py-0.5 text-xs font-semibold text-brand-teal">
                      Top fit
                    </span>
                  )}
                  <h3 className="font-semibold">{f.label}</h3>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {f.rationale}
                </p>
                {f.majors.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Example majors: {f.majors.join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="mt-6 flex items-center justify-between">
        <Button variant="ghost" onClick={onRetake} disabled={saving}>
          Retake
        </Button>
        <Button onClick={onConfirm} disabled={saving}>
          <Check />
          Looks good — continue
        </Button>
      </div>
    </div>
  );
}
