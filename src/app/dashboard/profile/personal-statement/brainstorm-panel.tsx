"use client";

import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Loader2,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { BrainstormInsights } from "~/lib/ai/personal-statement/brainstorm";
import {
  type BrainstormInputs,
  FREEWRITING_QUESTIONS,
  hasBrainstormContent,
  MAX_OBJECTS,
  VALUE_SUGGESTIONS,
} from "~/lib/personal-statement/brainstorm";
import { cn } from "~/lib/utils";
import { saveBrainstormInputs } from "./brainstorm-actions";

const SAVE_DEBOUNCE_MS = 800;

function ExerciseCard({
  step,
  title,
  hint,
  children,
}: {
  step: string;
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {step} · {title}
        </p>
      </div>
      <div className="space-y-3 p-6">
        <p className="text-sm text-muted-foreground">{hint}</p>
        {children}
      </div>
    </div>
  );
}

function Chips({
  items,
  onRemove,
}: {
  items: string[];
  onRemove: (item: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <span
          key={item}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 text-sm text-foreground"
        >
          {item}
          <button
            type="button"
            onClick={() => onRemove(item)}
            className="text-muted-foreground transition-colors hover:text-foreground"
            title={`Remove ${item}`}
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
    </div>
  );
}

export function BrainstormPanel({
  inputs,
  insights,
  onInputsChange,
  onInsightsChange,
  onStartEssay,
}: {
  inputs: BrainstormInputs;
  insights: BrainstormInsights | null;
  onInputsChange: (next: BrainstormInputs) => void;
  onInsightsChange: (next: BrainstormInsights) => void;
  onStartEssay: (title: string) => void | Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectDraft, setObjectDraft] = useState("");
  const [valueDraft, setValueDraft] = useState("");
  // Returning users (a reflection already exists) start compact: both sections
  // collapsed so they don't face a long page. First-timers see the exercises.
  const [showExercises, setShowExercises] = useState(!insights);
  const [showReflection, setShowReflection] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(next: BrainstormInputs) {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveBrainstormInputs(next);
    }, SAVE_DEBOUNCE_MS);
  }

  function update(patch: Partial<BrainstormInputs>) {
    const next = { ...inputs, ...patch };
    onInputsChange(next);
    scheduleSave(next);
  }

  function addObject(value: string) {
    const t = value.trim();
    if (
      !t ||
      inputs.objects.length >= MAX_OBJECTS ||
      inputs.objects.includes(t)
    )
      return;
    update({ objects: [...inputs.objects, t] });
    setObjectDraft("");
  }

  function addValue(value: string) {
    const t = value.trim();
    if (!t || inputs.values.length >= 20 || inputs.values.includes(t)) return;
    update({ values: [...inputs.values, t] });
    setValueDraft("");
  }

  function removeValue(v: string) {
    update({
      values: inputs.values.filter((x) => x !== v),
      centralValue: inputs.centralValue === v ? "" : inputs.centralValue,
    });
  }

  async function reflect() {
    setLoading(true);
    setError(null);
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    await saveBrainstormInputs(inputs);
    try {
      const res = await fetch("/api/personal-statement/brainstorm", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't reflect on your brainstorming.");
        return;
      }
      onInsightsChange(data.insights as BrainstormInsights);
      setShowReflection(true); // reveal the fresh reflection
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const canReflect = hasBrainstormContent(inputs) && !loading;

  const answeredCount = FREEWRITING_QUESTIONS.filter((q) =>
    inputs.freewrites[q.id]?.trim(),
  ).length;
  const exerciseSummary =
    [
      inputs.studentWho.trim() ? "the student who…" : null,
      inputs.objects.length ? `${inputs.objects.length} objects` : null,
      inputs.values.length ? `${inputs.values.length} values` : null,
      answeredCount ? `${answeredCount} answers` : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Nothing yet";

  return (
    <div className="space-y-6">
      {!insights && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm">
          <Lightbulb className="mt-0.5 size-4 shrink-0 text-brand-teal" />
          <p className="text-muted-foreground">
            Don't try to pick a topic yet. Just fill in whatever comes to mind —
            the more honest and specific, the better. When you're ready, AppGap
            will reflect back patterns and possible directions.{" "}
            <span className="text-foreground">It won't choose for you.</span>
          </p>
        </div>
      )}

      {/* Saved reflection — a small card that expands on click. */}
      {insights && (
        <div className="overflow-hidden rounded-2xl border border-brand-teal/40 bg-brand-teal/[0.04] shadow-sm">
          <button
            type="button"
            onClick={() => setShowReflection((s) => !s)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 shrink-0 text-brand-teal" />
              <div>
                <p className="text-sm font-semibold">Your reflection</p>
                <p className="text-xs text-muted-foreground">
                  {insights.directions.length} possible direction
                  {insights.directions.length === 1 ? "" : "s"} ·{" "}
                  {insights.patterns.length} pattern
                  {insights.patterns.length === 1 ? "" : "s"} — tap to{" "}
                  {showReflection ? "hide" : "view"}
                </p>
              </div>
            </div>
            {showReflection ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {showReflection && (
            <div className="border-t border-brand-teal/20 p-6">
              <BrainstormInsightsView
                insights={insights}
                onStartEssay={onStartEssay}
              />
            </div>
          )}
        </div>
      )}

      {/* Exercises — collapsible so returning users don't see a long page. */}
      {insights ? (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <button
            type="button"
            onClick={() => setShowExercises((s) => !s)}
            className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left"
          >
            <div>
              <p className="text-sm font-semibold">
                Your brainstorming answers
              </p>
              <p className="text-xs text-muted-foreground">
                {exerciseSummary} — tap to {showExercises ? "hide" : "edit"}
              </p>
            </div>
            {showExercises ? (
              <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
            )}
          </button>
          {showExercises && (
            <div className="space-y-6 border-t border-border p-6">
              <Exercises
                inputs={inputs}
                update={update}
                objectDraft={objectDraft}
                setObjectDraft={setObjectDraft}
                valueDraft={valueDraft}
                setValueDraft={setValueDraft}
                addObject={addObject}
                addValue={addValue}
                removeValue={removeValue}
              />
            </div>
          )}
        </div>
      ) : (
        <Exercises
          inputs={inputs}
          update={update}
          objectDraft={objectDraft}
          setObjectDraft={setObjectDraft}
          valueDraft={valueDraft}
          setValueDraft={setValueDraft}
          addObject={addObject}
          addValue={addValue}
          removeValue={removeValue}
        />
      )}

      {/* Reflect action bar — always visible. */}
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-8 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          {insights
            ? "Revised your answers? Reflect again for a fresh read."
            : "When you've added enough to work with, let AppGap reflect back what it notices. You can revise and reflect again anytime."}
        </p>
        <Button onClick={reflect} disabled={!canReflect} size="lg">
          {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {insights ? "Reflect again" : "Reflect with AppGap"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

// The four brainstorming exercises, extracted so they can render either inline
// (first-timers) or inside the collapsible (returning users).
function Exercises({
  inputs,
  update,
  objectDraft,
  setObjectDraft,
  valueDraft,
  setValueDraft,
  addObject,
  addValue,
  removeValue,
}: {
  inputs: BrainstormInputs;
  update: (patch: Partial<BrainstormInputs>) => void;
  objectDraft: string;
  setObjectDraft: (v: string) => void;
  valueDraft: string;
  setValueDraft: (v: string) => void;
  addObject: (v: string) => void;
  addValue: (v: string) => void;
  removeValue: (v: string) => void;
}) {
  return (
    <>
      <ExerciseCard
        step="1"
        title="The student who…"
        hint="If an admissions officer had to describe you in one sentence beginning with 'The student who…', how would they finish it?"
      >
        <Input
          value={inputs.studentWho}
          onChange={(e) => update({ studentWho: e.target.value })}
          placeholder="The student who…"
          maxLength={500}
        />
      </ExerciseCard>

      <ExerciseCard
        step="2"
        title="Essence objects"
        hint="List ordinary objects that have some connection to your life — up to 20. Don't explain why yet; just get them down."
      >
        <div className="flex gap-2">
          <Input
            value={objectDraft}
            onChange={(e) => setObjectDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addObject(objectDraft);
              }
            }}
            placeholder="e.g. a worn library card, my grandmother's teapot…"
            maxLength={120}
            disabled={inputs.objects.length >= MAX_OBJECTS}
          />
          <Button
            variant="outline"
            onClick={() => addObject(objectDraft)}
            disabled={
              !objectDraft.trim() || inputs.objects.length >= MAX_OBJECTS
            }
          >
            <Plus />
            Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {inputs.objects.length} / {MAX_OBJECTS}
        </p>
        <Chips
          items={inputs.objects}
          onRemove={(o) =>
            update({ objects: inputs.objects.filter((x) => x !== o) })
          }
        />
      </ExerciseCard>

      <ExerciseCard
        step="3"
        title="Values"
        hint="What do you genuinely care about? Add a few, then pick the one that feels most non-negotiable."
      >
        <div className="flex gap-2">
          <Input
            value={valueDraft}
            onChange={(e) => setValueDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addValue(valueDraft);
              }
            }}
            placeholder="Add a value…"
            maxLength={60}
          />
          <Button
            variant="outline"
            onClick={() => addValue(valueDraft)}
            disabled={!valueDraft.trim()}
          >
            <Plus />
            Add
          </Button>
        </div>
        {inputs.values.length < 20 && (
          <div className="flex flex-wrap gap-1.5">
            {VALUE_SUGGESTIONS.filter((v) => !inputs.values.includes(v)).map(
              (v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => addValue(v)}
                  className="rounded-full border border-dashed border-border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-brand-teal/40 hover:text-brand-teal"
                >
                  + {v}
                </button>
              ),
            )}
          </div>
        )}
        <Chips items={inputs.values} onRemove={removeValue} />
        {inputs.values.length > 0 && (
          <div className="space-y-1.5 pt-1">
            <label
              htmlFor="central-value"
              className="text-sm font-medium text-foreground"
            >
              Most non-negotiable value
            </label>
            <select
              id="central-value"
              value={inputs.centralValue}
              onChange={(e) => update({ centralValue: e.target.value })}
              className={cn(
                "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none md:text-sm dark:bg-input/30",
                "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
              )}
            >
              <option value="">Choose one…</option>
              {inputs.values.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </ExerciseCard>

      <ExerciseCard
        step="4"
        title="Freewriting"
        hint="Answer any that spark something. A few honest sentences beat a polished paragraph — skip the ones that don't land."
      >
        <div className="space-y-4">
          {FREEWRITING_QUESTIONS.map((q) => (
            <div key={q.id} className="space-y-1.5">
              <label
                htmlFor={`fw-${q.id}`}
                className="text-sm font-medium text-foreground"
              >
                {q.question}
              </label>
              <Textarea
                id={`fw-${q.id}`}
                value={inputs.freewrites[q.id] ?? ""}
                onChange={(e) =>
                  update({
                    freewrites: {
                      ...inputs.freewrites,
                      [q.id]: e.target.value,
                    },
                  })
                }
                placeholder="Write freely…"
                rows={2}
                maxLength={2000}
              />
            </div>
          ))}
        </div>
      </ExerciseCard>
    </>
  );
}

function BrainstormInsightsView({
  insights,
  onStartEssay,
}: {
  insights: BrainstormInsights;
  onStartEssay: (title: string) => void | Promise<void>;
}) {
  return (
    <div className="space-y-6">
      {insights.patterns.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Patterns AppGap noticed
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {insights.patterns.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="font-semibold tracking-tight">{p.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {p.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.directions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Possible directions
          </h3>
          <p className="text-xs text-muted-foreground">
            These are options, not a decision. Pick whichever feels most true —
            or none of them, if they spark a better idea of your own.
          </p>
          <div className="space-y-4">
            {insights.directions.map((d) => (
              <div
                key={d.title}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="space-y-3 p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <p className="font-semibold tracking-tight">{d.title}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStartEssay(d.title)}
                    >
                      Start an essay from this
                      <ArrowRight />
                    </Button>
                  </div>
                  <p className="text-sm leading-relaxed">{d.angle}</p>
                  <div className="rounded-xl border border-brand-teal/20 bg-brand-teal/[0.04] px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-brand-teal">
                      Why it could reveal you
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {d.whyItRevealsYou}
                    </p>
                  </div>
                  {d.seedQuestions.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">
                        Questions to explore
                      </p>
                      <ul className="mt-1 space-y-1">
                        {d.seedQuestions.map((q) => (
                          <li
                            key={q}
                            className="text-sm leading-relaxed text-muted-foreground"
                          >
                            • {q}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Drawn from: {d.drawnFrom}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.tensions.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Interesting tensions
          </h3>
          <div className="space-y-3">
            {insights.tensions.map((t) => (
              <div
                key={t.tension}
                className="rounded-2xl border border-border bg-card p-5 shadow-sm"
              >
                <p className="font-medium">{t.tension}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {t.whyInteresting}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {(insights.overlapWithApplication.trim() ||
        insights.encouragement.trim()) && (
        <section className="space-y-3">
          {insights.overlapWithApplication.trim() && (
            <div className="rounded-2xl border border-border bg-muted/40 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fit with the rest of your application
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {insights.overlapWithApplication}
              </p>
            </div>
          )}
          {insights.encouragement.trim() && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {insights.encouragement}
            </p>
          )}
        </section>
      )}

      {insights.nextPrompts.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Keep digging
          </h3>
          <ul className="space-y-1.5">
            {insights.nextPrompts.map((q) => (
              <li key={q} className="flex items-start gap-2 text-sm">
                <Sparkles className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
                <span className="leading-relaxed text-muted-foreground">
                  {q}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
