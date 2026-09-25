"use client";

import {
  ArrowLeft,
  Check,
  Loader2,
  Lock,
  Pencil,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CollegeLogo } from "~/app/dashboard/colleges/college-logo";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { resolveWeights } from "~/lib/supplemental/archetypes";
import { buildChecklist } from "~/lib/supplemental/checklist";
import { scoreEvaluation } from "~/lib/supplemental/evaluate";
import type {
  LineByLineAnalysis,
  PromptParse,
  RawEvaluation,
  RedundancyAnalysis,
} from "~/lib/supplemental/schemas";
import { scoreColor } from "~/lib/supplemental/scoring";
import {
  ESSAY_STATUS_CLASSES,
  ESSAY_STATUS_LABELS,
  type EssayStatus,
} from "~/lib/supplemental/status";
import { countWords, extractWordLimit } from "~/lib/supplemental/text";
import type { EssayWorkspaceData } from "~/lib/supplemental/types";
import { cn } from "~/lib/utils";
import {
  finalizeEssay,
  setEssayStatus,
  unfinalizeEssay,
  updateEssayContent,
  updateEssayPrompt,
} from "../../actions";
import { CollapsibleSection } from "./collapsible-section";
import { CoverageChecklist } from "./coverage-checklist";
import { EvaluationPanel } from "./evaluation-panel";
import { GapCoachChat } from "./gapcoach-chat";
import { LineByLineReview } from "./line-by-line-review";
import { PromptParsePanel } from "./prompt-parse-panel";
import { RedundancyPanel } from "./redundancy-panel";

const BASE = "/dashboard/profile/supplemental-essays";
const AUTOSAVE_MS = 800;

type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

export function EssayWorkspace({
  collegeId,
  data,
}: {
  collegeId: string;
  data: EssayWorkspaceData;
}) {
  const { essay } = data;

  const [content, setContent] = useState(essay.content);
  const [wordCount, setWordCount] = useState(essay.wordCount);
  const [status, setStatus] = useState<EssayStatus>(essay.status);
  const [promptText, setPromptText] = useState(essay.promptText);
  const [wordLimit, setWordLimit] = useState<number | null>(essay.wordLimit);
  const [finalizedAt, setFinalizedAt] = useState<string | null>(
    essay.finalizedAt,
  );

  const [parse, setParse] = useState<PromptParse | null>(data.parse);
  const [evaluation, setEvaluation] = useState<RawEvaluation | null>(
    data.evaluation,
  );
  const [lineByLine, setLineByLine] = useState<LineByLineAnalysis | null>(
    data.lineByLine,
  );
  const [redundancy, setRedundancy] = useState<RedundancyAnalysis | null>(
    data.redundancy,
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [editingPrompt, setEditingPrompt] = useState(false);

  // Per-action state.
  const [running, setRunning] = useState<
    null | "parse" | "evaluation" | "line_by_line" | "redundancy"
  >(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // ─── Collapsible sections + auto-scroll ───────────────────────────────────
  // Heavy analysis sections default collapsed (keeps the page short); freshly
  // generated results auto-expand and scroll into view.
  const [evalOpen, setEvalOpen] = useState(false);
  const [lblOpen, setLblOpen] = useState(false);
  const [redOpen, setRedOpen] = useState(false);

  const evalRef = useRef<HTMLElement | null>(null);
  const lblRef = useRef<HTMLElement | null>(null);
  const redRef = useRef<HTMLElement | null>(null);

  // Scroll request: set after a result renders + its section is expanded. The
  // nonce makes re-running the same analysis re-trigger the scroll.
  const [scrollTo, setScrollTo] = useState<{
    target: "evaluation" | "line_by_line" | "redundancy";
    nonce: number;
  } | null>(null);

  useEffect(() => {
    if (!scrollTo) return;
    const ref =
      scrollTo.target === "evaluation"
        ? evalRef
        : scrollTo.target === "line_by_line"
          ? lblRef
          : redRef;
    const el = ref.current;
    if (el) {
      // Wait a frame so the just-expanded body has laid out, then scroll.
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
    setScrollTo(null);
  }, [scrollTo]);

  // ─── Autosave ────────────────────────────────────────────────────────────
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const latest = useRef(content);
  latest.current = content;

  const flushSave = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (!dirty.current) return;
    dirty.current = false;
    setSaveStatus("saving");
    const res = await updateEssayContent(essay.id, latest.current);
    if (res.ok) {
      setWordCount(res.wordCount);
      setStatus(res.status);
      setSaveStatus("saved");
    } else {
      setSaveStatus("error");
    }
  }, [essay.id]);

  function onContentChange(next: string) {
    setContent(next);
    setWordCount(countWords(next));
    dirty.current = true;
    setSaveStatus("unsaved");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flushSave(), AUTOSAVE_MS);
  }

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  // ─── Derived: weighting, scored evaluation, checklist ─────────────────────
  const weighting = useMemo(
    () =>
      parse
        ? resolveWeights(
            parse.primaryArchetype,
            parse.secondaryArchetypes,
            wordLimit ?? parse.wordLimit,
          )
        : null,
    [parse, wordLimit],
  );

  const scored = useMemo(
    () =>
      evaluation && weighting
        ? scoreEvaluation(evaluation, weighting.weights, weighting.rationale)
        : null,
    [evaluation, weighting],
  );

  const checklist = useMemo(
    () =>
      buildChecklist({
        directives: scored?.directives ?? [],
        wordCount,
        wordLimit: wordLimit ?? parse?.wordLimit ?? null,
        collegeSpecificity: scored?.collegeSpecificity ?? null,
        repetition: redundancy?.repetition ?? null,
      }),
    [scored, wordCount, wordLimit, parse, redundancy],
  );

  // ─── AI actions ───────────────────────────────────────────────────────────
  const post = useCallback(
    async (path: string) => {
      const res = await fetch(`/api/supplemental-essays/${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ essayId: essay.id }),
      });
      const json = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        throw new Error(
          (json.error as string) ?? "Something went wrong. Please try again.",
        );
      }
      return json;
    },
    [essay.id],
  );

  async function runParse() {
    setActionError(null);
    setRunning("parse");
    try {
      const json = await post("parse");
      setParse(json.parse as PromptParse);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't analyze.");
    } finally {
      setRunning(null);
    }
  }

  async function runEvaluation() {
    setActionError(null);
    await flushSave();
    setRunning("evaluation");
    try {
      // Evaluation needs a parse; run it first if missing.
      if (!parse) {
        const p = await post("parse");
        setParse(p.parse as PromptParse);
      }
      const json = await post("evaluation");
      setEvaluation(json.evaluation as RawEvaluation);
      setEvalOpen(true);
      setScrollTo({ target: "evaluation", nonce: Date.now() });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't score.");
    } finally {
      setRunning(null);
    }
  }

  async function runLineByLine() {
    setActionError(null);
    await flushSave();
    setRunning("line_by_line");
    try {
      if (!parse) {
        const p = await post("parse");
        setParse(p.parse as PromptParse);
      }
      const json = await post("line-by-line");
      setLineByLine(json.analysis as LineByLineAnalysis);
      setLblOpen(true);
      setScrollTo({ target: "line_by_line", nonce: Date.now() });
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Couldn't run the pass.");
    } finally {
      setRunning(null);
    }
  }

  async function runRedundancy() {
    setActionError(null);
    await flushSave();
    setRunning("redundancy");
    try {
      const json = await post("redundancy");
      setRedundancy(json.analysis as RedundancyAnalysis);
      setRedOpen(true);
      setScrollTo({ target: "redundancy", nonce: Date.now() });
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Couldn't run the check.",
      );
    } finally {
      setRunning(null);
    }
  }

  // ─── Prompt editing ────────────────────────────────────────────────────────
  async function savePrompt(nextPrompt: string, nextLimit: number | null) {
    const res = await updateEssayPrompt(essay.id, nextPrompt, nextLimit);
    if (res.ok) {
      setPromptText(nextPrompt);
      setWordLimit(nextLimit);
      // Prompt changed → prior analyses are stale (server cleared them too).
      setParse(null);
      setEvaluation(null);
      setLineByLine(null);
      setRedundancy(null);
      setEditingPrompt(false);
    }
    return res;
  }

  // ─── Status / finalize ─────────────────────────────────────────────────────
  async function handleFinalize() {
    await flushSave();
    const res = await finalizeEssay(essay.id);
    if (res.ok) {
      setStatus(res.essay.status);
      setFinalizedAt(res.essay.finalizedAt);
    }
  }
  async function handleUnfinalize() {
    const res = await unfinalizeEssay(essay.id);
    if (res.ok) {
      setStatus(res.essay.status);
      setFinalizedAt(null);
    }
  }
  async function markNeedsRevision() {
    const res = await setEssayStatus(essay.id, "needs_revision");
    if (res.ok) setStatus("needs_revision");
  }

  const overLimit = wordLimit != null && wordLimit > 0 && wordCount > wordLimit;
  const isFinalized = finalizedAt != null;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href={`${BASE}/${collegeId}`}>
          <ArrowLeft />
          {data.collegeName || "Back"}
        </Link>
      </Button>

      <header className="mb-5">
        <div className="flex items-start gap-3">
          <CollegeLogo
            name={data.collegeName}
            logoAssetPath={data.logoAssetPath}
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{data.collegeName}</span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-medium",
                  ESSAY_STATUS_CLASSES[status],
                )}
              >
                {ESSAY_STATUS_LABELS[status]}
              </span>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
              Supplemental Essay
            </p>

            {editingPrompt ? (
              <PromptEditor
                promptText={promptText}
                wordLimit={wordLimit}
                onCancel={() => setEditingPrompt(false)}
                onSave={savePrompt}
              />
            ) : (
              <div className="mt-1.5 flex items-start justify-between gap-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {promptText}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setEditingPrompt(true)}
                >
                  <Pencil />
                  Edit
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <PromptParsePanel
        parse={parse}
        pending={running === "parse"}
        onAnalyze={runParse}
      />

      {/* Editor */}
      <section className="mt-4 rounded-xl border border-border bg-card p-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-semibold">Your essay</h3>
          <SaveIndicator status={saveStatus} />
        </div>
        <Textarea
          value={content}
          onChange={(e) => onContentChange(e.target.value)}
          onBlur={() => void flushSave()}
          placeholder="Write your response here…"
          rows={12}
          disabled={isFinalized}
          className="resize-y leading-relaxed"
        />
        <div className="mt-2 flex items-center justify-between text-xs">
          <span
            className={cn(
              "tabular-nums",
              overLimit ? "font-medium text-red-500" : "text-muted-foreground",
            )}
          >
            {wordCount} words
            {wordLimit ? ` / ${wordLimit}` : ""}
            {overLimit ? " — over the limit" : ""}
          </span>
        </div>

        {isFinalized && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-brand-teal">
            <Lock className="size-3" />
            Finalized — unlock to keep editing.
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            onClick={runEvaluation}
            disabled={running !== null || !content.trim() || isFinalized}
          >
            {running === "evaluation" ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Sparkles />
            )}
            Score my essay
          </Button>
          <Button
            variant="outline"
            onClick={runLineByLine}
            disabled={running !== null || !content.trim() || isFinalized}
          >
            {running === "line_by_line" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Line-by-line
          </Button>
          <Button
            variant="outline"
            onClick={runRedundancy}
            disabled={running !== null || !content.trim() || isFinalized}
          >
            {running === "redundancy" ? (
              <Loader2 className="animate-spin" />
            ) : null}
            Check across my application
          </Button>
        </div>
        {actionError && (
          <p className="mt-2 text-sm text-red-500">{actionError}</p>
        )}
      </section>

      {/* Checklist */}
      <div className="mt-4">
        <CoverageChecklist
          directives={checklist.directives}
          summary={checklist.summary}
        />
      </div>

      {/* Evaluation (Score analysis) */}
      {scored && (
        <div className="mt-4">
          <CollapsibleSection
            ref={evalRef}
            title="Score analysis"
            open={evalOpen}
            onOpenChange={setEvalOpen}
            accessory={
              <span className={cn("font-semibold", scoreColor(scored.overall))}>
                {scored.overall}/100
              </span>
            }
          >
            <EvaluationPanel evaluation={scored} />
          </CollapsibleSection>
        </div>
      )}

      {/* Line-by-line */}
      {lineByLine && (
        <div className="mt-4">
          <CollapsibleSection
            ref={lblRef}
            title="Line-by-line review"
            open={lblOpen}
            onOpenChange={setLblOpen}
            accessory={<span>{lineByLine.comments.length} notes</span>}
          >
            <LineByLineReview content={content} analysis={lineByLine} />
          </CollapsibleSection>
        </div>
      )}

      {/* Redundancy (Check across the whole application) */}
      {redundancy && (
        <div className="mt-4">
          <CollapsibleSection
            ref={redRef}
            title="Check across my whole application"
            open={redOpen}
            onOpenChange={setRedOpen}
          >
            <RedundancyPanel analysis={redundancy} />
          </CollapsibleSection>
        </div>
      )}

      {/* Finalize / status controls */}
      <section className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-5">
        {isFinalized ? (
          <Button variant="outline" onClick={handleUnfinalize}>
            <RotateCcw />
            Unlock / edit again
          </Button>
        ) : (
          <>
            <Button onClick={handleFinalize} disabled={!content.trim()}>
              <Check />
              Mark finalized
            </Button>
            {status !== "needs_revision" && (
              <Button variant="ghost" onClick={markNeedsRevision}>
                Mark needs revision
              </Button>
            )}
          </>
        )}
      </section>

      <GapCoachChat essayId={essay.id} initialMessages={data.chat} />
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === "saving")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" /> Saving…
      </span>
    );
  if (status === "saved")
    return (
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        <Check className="size-3 text-brand-teal" /> Saved
      </span>
    );
  if (status === "unsaved")
    return <span className="text-xs text-muted-foreground">Unsaved…</span>;
  if (status === "error")
    return <span className="text-xs text-red-500">Couldn't save</span>;
  return null;
}

function PromptEditor({
  promptText,
  wordLimit,
  onCancel,
  onSave,
}: {
  promptText: string;
  wordLimit: number | null;
  onCancel: () => void;
  onSave: (
    prompt: string,
    limit: number | null,
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [text, setText] = useState(promptText);
  const [limit, setLimit] = useState(wordLimit ? String(wordLimit) : "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const detected = extractWordLimit(text);

  async function handleSave() {
    setError(null);
    const trimmed = text.trim();
    if (!trimmed) {
      setError("Prompt can't be empty.");
      return;
    }
    const parsedLimit = limit.trim()
      ? Number.parseInt(limit, 10)
      : (detected ?? null);
    setSaving(true);
    const res = await onSave(
      trimmed,
      parsedLimit && Number.isFinite(parsedLimit) ? parsedLimit : null,
    );
    setSaving(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="mt-2 rounded-lg border border-border p-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
      />
      <div className="mt-2 flex items-center gap-2">
        <label htmlFor="edit-limit" className="text-sm">
          Word limit
        </label>
        <input
          id="edit-limit"
          type="number"
          min={1}
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
          placeholder={detected ? String(detected) : "—"}
          className="h-9 w-24 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
        />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Changing the prompt clears the current analysis, since it was about the
        old wording.
      </p>
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      <div className="mt-3 flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save prompt
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
