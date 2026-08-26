"use client";

import {
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Copy,
  Gauge,
  Highlighter,
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Pencil,
  PenLine,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Undo2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import type { DraftAnalysis } from "~/lib/ai/personal-statement/draft-analysis";
import type { Evaluation } from "~/lib/ai/personal-statement/evaluation";
import type { LineByLineAnalysis } from "~/lib/ai/personal-statement/line-by-line";
import type { Revision } from "~/lib/ai/personal-statement/revision";
import {
  countWords,
  ESSAY_PROMPTS,
  getPrompt,
  isCustomPrompt,
  WORD_LIMIT,
} from "~/lib/personal-statement/prompts";
import { cn } from "~/lib/utils";
import {
  createDraft,
  type DraftDTO,
  deleteDraft,
  type FinalVersionDTO,
  finalizeDraft,
  renameDraft,
  type StatementDTO,
  setCurrentDraft,
  unfinalizeStatement,
  updateDraftContent,
  updateStatement,
} from "./actions";
import { DraftAnalysisPanel } from "./draft-analysis-panel";
import { EvaluationPanel } from "./evaluation-panel";
import { LineByLineReview } from "./line-by-line-review";
import { RevisionPanel } from "./revision-panel";

// Save status. Autosave remains the single source of truth — this only reflects
// its state to the user. "idle" means the loaded draft is clean (nothing to
// save); "unsaved" means edits are pending the debounce; the rest are the save
// round-trip. There is no separate manual-save store — "Save now" just flushes.
type SaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

const SAVE_DEBOUNCE_MS = 800;
// Undo history: typing is coalesced into one step after this idle gap, and the
// stack is capped so long sessions don't grow unbounded.
const HISTORY_DEBOUNCE_MS = 500;
const HISTORY_MAX = 200;

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function SaveStatusLabel({
  status,
  savedAt,
}: {
  status: SaveStatus;
  savedAt: string | null;
}) {
  if (status === "saving") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Loader2 className="size-3 animate-spin" />
        Saving…
      </span>
    );
  }
  if (status === "unsaved") {
    return (
      <span className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
        <span className="size-1.5 rounded-full bg-amber-500" />
        Unsaved changes
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="text-xs text-destructive">Couldn't save — retry</span>
    );
  }
  // idle (clean on load) or saved (after a write)
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Check className="size-3 text-brand-teal" />
      {status === "saved" && savedAt
        ? `Saved · ${formatTime(savedAt)}`
        : "Saved"}
    </span>
  );
}

export function StatementEditor({
  statement,
  initialDraftAnalyses,
  initialLineByLine,
  initialEvaluations,
  initialRevisions,
  onTitleChange,
}: {
  statement: StatementDTO;
  /** Cached holistic draft feedback, keyed by draft id. */
  initialDraftAnalyses: Record<string, DraftAnalysis>;
  /** Cached line-by-line feedback, keyed by draft id. */
  initialLineByLine: Record<string, LineByLineAnalysis>;
  /** Cached graded evaluations, keyed by draft id. */
  initialEvaluations: Record<string, Evaluation>;
  /** Cached revision plans, keyed by draft id. */
  initialRevisions: Record<string, Revision>;
  /** Bubble the live title up so the workspace switcher stays in sync. */
  onTitleChange: (id: string, title: string) => void;
}) {
  // Local, authoritative copy for this statement (the workspace remounts the
  // editor on statement switch via `key`, so seeding from props is safe).
  const [title, setTitle] = useState(statement.title);
  const [promptId, setPromptId] = useState(statement.promptId);
  const [customPrompt, setCustomPrompt] = useState(statement.customPrompt);
  const [drafts, setDrafts] = useState<DraftDTO[]>(() =>
    [...statement.drafts].sort((a, b) => a.sortOrder - b.sortOrder),
  );
  const [activeDraftId, setActiveDraftId] = useState<string>(
    () =>
      statement.drafts.find((d) => d.isCurrent)?.id ??
      statement.drafts[0]?.id ??
      "",
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [final, setFinal] = useState<FinalVersionDTO | null>(statement.final);
  // When a final version exists we collapse the working editor to a clean
  // "done" view; `editing` reopens the drafts + editor. Start collapsed if the
  // statement already has a final version on load.
  const [editing, setEditing] = useState(() => !statement.final);
  const [focusMode, setFocusMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  // Holistic draft feedback (Gemini coach), cached per draft id.
  const [draftAnalyses, setDraftAnalyses] =
    useState<Record<string, DraftAnalysis>>(initialDraftAnalyses);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(true);
  // Line-by-line (Opus) — Write vs Review view + cached feedback per draft id.
  const [viewMode, setViewMode] = useState<"write" | "review">("write");
  const [lineByLine, setLineByLine] =
    useState<Record<string, LineByLineAnalysis>>(initialLineByLine);
  const [lblLoading, setLblLoading] = useState(false);
  const [lblError, setLblError] = useState<string | null>(null);
  // Graded evaluation (Opus deep coach) — cached per draft id.
  const [evaluations, setEvaluations] =
    useState<Record<string, Evaluation>>(initialEvaluations);
  const [evalLoading, setEvalLoading] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [showScore, setShowScore] = useState(true);
  // Revision guidance (Gemini coach) — cached per draft id.
  const [revisions, setRevisions] =
    useState<Record<string, Revision>>(initialRevisions);
  const [revLoading, setRevLoading] = useState(false);
  const [revError, setRevError] = useState<string | null>(null);
  const [showRevision, setShowRevision] = useState(true);

  const activeDraft = drafts.find((d) => d.id === activeDraftId) ?? drafts[0];

  // ─── Draft content autosave ────────────────────────────────────────────────
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContent = useRef<{ draftId: string; content: string } | null>(
    null,
  );

  // Persist a draft's content. Returns whether it saved, so callers that must
  // guarantee the DB is current before acting (e.g. finalize) can await it.
  const persistContent = useCallback(
    async (draftId: string, content: string): Promise<boolean> => {
      setSaveStatus("saving");
      const res = await updateDraftContent(draftId, content);
      if (res.ok) {
        setSaveStatus("saved");
        setSavedAt(new Date().toISOString());
        setDrafts((prev) =>
          prev.map((d) =>
            d.id === draftId ? { ...d, wordCount: res.wordCount } : d,
          ),
        );
        return true;
      }
      setSaveStatus("error");
      return false;
    },
    [],
  );

  const flushContent = useCallback(() => {
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    const p = pendingContent.current;
    if (!p) return;
    pendingContent.current = null;
    void persistContent(p.draftId, p.content);
  }, [persistContent]);

  const setDraftContent = useCallback((draftId: string, value: string) => {
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, content: value } : d)),
    );
  }, []);

  const scheduleContentSave = useCallback(
    (draftId: string, value: string) => {
      pendingContent.current = { draftId, content: value };
      setSaveStatus("unsaved");
      if (contentTimer.current) clearTimeout(contentTimer.current);
      contentTimer.current = setTimeout(flushContent, SAVE_DEBOUNCE_MS);
    },
    [flushContent],
  );

  // ─── Undo / redo history (per active draft, coalesced) ─────────────────────
  const history = useRef<{ stack: string[]; index: number }>({
    stack: [activeDraft?.content ?? ""],
    index: 0,
  });
  const latestContent = useRef<string>(activeDraft?.content ?? "");
  const historyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Re-render on history changes so the Undo/Redo buttons enable/disable.
  const [, bumpHistory] = useReducer((x: number) => x + 1, 0);

  const clearHistoryTimer = useCallback(() => {
    if (historyTimer.current) {
      clearTimeout(historyTimer.current);
      historyTimer.current = null;
    }
  }, []);

  // Fold any pending typing into a committed history entry.
  const commitHistory = useCallback(() => {
    const h = history.current;
    const v = latestContent.current;
    if (h.stack[h.index] === v) return;
    const base = h.stack.slice(0, h.index + 1);
    const stack = [...base, v].slice(-HISTORY_MAX);
    history.current = { stack, index: stack.length - 1 };
    bumpHistory();
  }, []);

  const resetHistory = useCallback(
    (content: string) => {
      clearHistoryTimer();
      history.current = { stack: [content], index: 0 };
      latestContent.current = content;
      bumpHistory();
    },
    [clearHistoryTimer],
  );

  const recordTyping = useCallback(
    (value: string) => {
      latestContent.current = value;
      if (historyTimer.current) clearTimeout(historyTimer.current);
      historyTimer.current = setTimeout(() => {
        commitHistory();
      }, HISTORY_DEBOUNCE_MS);
    },
    [commitHistory],
  );

  const applyHistoryContent = useCallback(
    (content: string) => {
      if (!activeDraft) return;
      setDraftContent(activeDraft.id, content);
      latestContent.current = content;
      scheduleContentSave(activeDraft.id, content);
    },
    [activeDraft, setDraftContent, scheduleContentSave],
  );

  function undo() {
    clearHistoryTimer();
    let { stack, index } = history.current;
    // Fold in-progress typing so it becomes a redoable step first.
    if (latestContent.current !== stack[index]) {
      const base = stack.slice(0, index + 1);
      stack = [...base, latestContent.current].slice(-HISTORY_MAX);
      index = stack.length - 1;
    }
    if (index <= 0) {
      history.current = { stack, index };
      bumpHistory();
      return;
    }
    const newIndex = index - 1;
    history.current = { stack, index: newIndex };
    applyHistoryContent(stack[newIndex]);
    bumpHistory();
  }

  function redo() {
    clearHistoryTimer();
    const h = history.current;
    if (h.index >= h.stack.length - 1) return;
    const newIndex = h.index + 1;
    history.current = { stack: h.stack, index: newIndex };
    applyHistoryContent(h.stack[newIndex]);
    bumpHistory();
  }

  const hasUncommitted =
    latestContent.current !== history.current.stack[history.current.index];
  const canUndo = history.current.index > 0 || hasUncommitted;
  const canRedo = history.current.index < history.current.stack.length - 1;

  // Flush pending saves + timers when the editor unmounts.
  useEffect(() => {
    return () => {
      flushContent();
      if (historyTimer.current) clearTimeout(historyTimer.current);
    };
  }, [flushContent]);

  function handleContentChange(value: string) {
    if (!activeDraft) return;
    setDraftContent(activeDraft.id, value);
    scheduleContentSave(activeDraft.id, value);
    recordTyping(value);
  }

  function handleEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const mod = e.ctrlKey || e.metaKey;
    if (!mod) return;
    const key = e.key.toLowerCase();
    if (key === "z" && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((key === "z" && e.shiftKey) || key === "y") {
      e.preventDefault();
      redo();
    }
  }

  // Explicit "Save now" — flush the pending edit immediately, or re-affirm the
  // save if nothing is pending. Never a second save system, just an early flush.
  function saveNow() {
    if (!activeDraft) return;
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    const p = pendingContent.current;
    pendingContent.current = null;
    void persistContent(activeDraft.id, p?.content ?? activeDraft.content);
  }

  function selectDraft(id: string) {
    if (id === activeDraftId) return;
    flushContent(); // don't lose the current draft's pending edits
    const target = drafts.find((d) => d.id === id);
    setActiveDraftId(id);
    setSaveStatus("idle");
    setSavedAt(null);
    setRenaming(false);
    resetHistory(target?.content ?? "");
  }

  // ─── Statement-field autosave (title / prompt) ─────────────────────────────
  const fieldsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleFieldsSave = useCallback(
    (next: { title: string; promptId: string; customPrompt: string }) => {
      if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
      fieldsTimer.current = setTimeout(() => {
        void updateStatement(statement.id, next);
      }, SAVE_DEBOUNCE_MS);
    },
    [statement.id],
  );

  function handleTitleChange(value: string) {
    setTitle(value);
    onTitleChange(statement.id, value);
    scheduleFieldsSave({ title: value, promptId, customPrompt });
  }

  function handlePromptChange(value: string) {
    setPromptId(value);
    // Prompt choice is worth persisting promptly, not on the long debounce.
    if (fieldsTimer.current) clearTimeout(fieldsTimer.current);
    void updateStatement(statement.id, {
      title,
      promptId: value,
      customPrompt,
    });
  }

  function handleCustomPromptChange(value: string) {
    setCustomPrompt(value);
    scheduleFieldsSave({ title, promptId, customPrompt: value });
  }

  // ─── Draft actions (structural — go straight to the server) ────────────────
  async function addDraft(fromDraftId?: string) {
    setBusy(true);
    setError(null);
    flushContent();
    const res = await createDraft(statement.id, { fromDraftId });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setDrafts((prev) =>
      [...prev.map((d) => ({ ...d, isCurrent: false })), res.draft].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      ),
    );
    setActiveDraftId(res.draft.id);
    setSaveStatus("idle");
    setSavedAt(null);
    resetHistory(res.draft.content);
  }

  async function markCurrent(draftId: string) {
    setDrafts((prev) =>
      prev.map((d) => ({ ...d, isCurrent: d.id === draftId })),
    );
    const res = await setCurrentDraft(statement.id, draftId);
    if (!res.ok) setError(res.error);
  }

  async function removeDraft(draftId: string) {
    setBusy(true);
    setError(null);
    const res = await deleteDraft(statement.id, draftId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    const remaining = drafts.filter((d) => d.id !== draftId);
    setDrafts(
      remaining.map((d) =>
        res.newCurrentId && d.id === res.newCurrentId
          ? { ...d, isCurrent: true }
          : d,
      ),
    );
    if (activeDraftId === draftId) {
      const nextId = res.newCurrentId ?? remaining[0]?.id ?? "";
      setActiveDraftId(nextId);
      resetHistory(remaining.find((d) => d.id === nextId)?.content ?? "");
    }
  }

  async function submitRename(draftId: string, label: string) {
    setRenaming(false);
    const trimmed = label.trim();
    if (!trimmed || trimmed === activeDraft?.label) return;
    setDrafts((prev) =>
      prev.map((d) => (d.id === draftId ? { ...d, label: trimmed } : d)),
    );
    const res = await renameDraft(draftId, trimmed);
    if (!res.ok) setError(res.error);
  }

  // ─── Finalize (frozen snapshot of a chosen draft) ──────────────────────────
  async function handleFinalize(draftId: string) {
    const d = drafts.find((x) => x.id === draftId);
    if (!d) return;
    const confirmed = window.confirm(
      final
        ? `Replace your final version with "${d.label}"? Your current final version will be overwritten. You can undo this later.`
        : `Make "${d.label}" your final version? It's saved as a frozen copy — later edits to this draft won't change it. You can replace or undo it anytime.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    // Guarantee the draft's latest text is in the DB before we snapshot it.
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    pendingContent.current = null;
    await persistContent(draftId, d.content);
    const res = await finalizeDraft(statement.id, draftId);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFinal(res.final);
    setEditing(false); // collapse to the clean "Final version" view
  }

  async function handleUnfinalize() {
    if (
      !window.confirm(
        "Remove your final version? Your drafts are kept — only the finalized copy is cleared.",
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await unfinalizeStatement(statement.id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setFinal(null);
    setEditing(true); // no final anymore — show the editor again
  }

  // Collapse the editor back to the clean "Final version" view (only offered
  // when a final exists, so there's something to collapse to).
  function closeEditor() {
    flushContent();
    setEditing(false);
  }

  // ─── Holistic draft feedback (Gemini coach) ────────────────────────────────
  async function analyzeDraft() {
    if (!activeDraft) return;
    setAnalyzing(true);
    setAnalyzeError(null);
    // Persist the latest text so the server analyzes what's on screen.
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    pendingContent.current = null;
    const draftId = activeDraft.id;
    await persistContent(draftId, activeDraft.content);
    try {
      const res = await fetch("/api/personal-statement/draft-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyzeError(data.error ?? "Couldn't analyze your draft.");
        return;
      }
      setDraftAnalyses((prev) => ({
        ...prev,
        [draftId]: data.analysis as DraftAnalysis,
      }));
      setShowFeedback(true);
    } catch {
      setAnalyzeError("Something went wrong. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  const activeAnalysis = activeDraft
    ? (draftAnalyses[activeDraft.id] ?? null)
    : null;

  // ─── Line-by-line (Opus deep coach) ────────────────────────────────────────
  async function runLineByLine() {
    if (!activeDraft) return;
    setLblLoading(true);
    setLblError(null);
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    pendingContent.current = null;
    const draftId = activeDraft.id;
    await persistContent(draftId, activeDraft.content);
    try {
      const res = await fetch("/api/personal-statement/line-by-line", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLblError(data.error ?? "Couldn't run line-by-line.");
        return;
      }
      setLineByLine((prev) => ({
        ...prev,
        [draftId]: data.analysis as LineByLineAnalysis,
      }));
    } catch {
      setLblError("Something went wrong. Please try again.");
    } finally {
      setLblLoading(false);
    }
  }

  const activeLineByLine = activeDraft
    ? (lineByLine[activeDraft.id] ?? null)
    : null;

  // ─── Graded evaluation (Opus deep coach) ───────────────────────────────────
  async function runEvaluation() {
    if (!activeDraft) return;
    setEvalLoading(true);
    setEvalError(null);
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    pendingContent.current = null;
    const draftId = activeDraft.id;
    await persistContent(draftId, activeDraft.content);
    try {
      const res = await fetch("/api/personal-statement/evaluation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEvalError(data.error ?? "Couldn't score your draft.");
        return;
      }
      setEvaluations((prev) => ({
        ...prev,
        [draftId]: data.evaluation as Evaluation,
      }));
      setShowScore(true);
    } catch {
      setEvalError("Something went wrong. Please try again.");
    } finally {
      setEvalLoading(false);
    }
  }

  const activeEvaluation = activeDraft
    ? (evaluations[activeDraft.id] ?? null)
    : null;

  // ─── Revision guidance (Gemini coach) ──────────────────────────────────────
  async function runRevision() {
    if (!activeDraft) return;
    setRevLoading(true);
    setRevError(null);
    if (contentTimer.current) {
      clearTimeout(contentTimer.current);
      contentTimer.current = null;
    }
    pendingContent.current = null;
    const draftId = activeDraft.id;
    await persistContent(draftId, activeDraft.content);
    try {
      const res = await fetch("/api/personal-statement/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draftId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRevError(data.error ?? "Couldn't build your revision plan.");
        return;
      }
      setRevisions((prev) => ({
        ...prev,
        [draftId]: data.revision as Revision,
      }));
      setShowRevision(true);
    } catch {
      setRevError("Something went wrong. Please try again.");
    } finally {
      setRevLoading(false);
    }
  }

  const activeRevision = activeDraft
    ? (revisions[activeDraft.id] ?? null)
    : null;

  const selectedPrompt = getPrompt(promptId);
  const showCustom = isCustomPrompt(promptId);
  const content = activeDraft?.content ?? "";
  const liveWords = countWords(content);
  const chars = content.length;
  const overLimit = liveWords > WORD_LIMIT;

  return (
    <div className="space-y-5">
      {/* Final version — a clear, separate section above the working drafts. */}
      {final && !focusMode && (
        <FinalVersionCard
          final={final}
          busy={busy}
          onUnfinalize={handleUnfinalize}
        />
      )}

      {/* Collapsed "done" state: only the final version shows; "Edit drafts"
          brings the working editor back. */}
      {final && !editing && !focusMode && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-10 text-center">
          <p className="max-w-md text-sm text-muted-foreground">
            Your final version is set. Your drafts are safe — reopen them
            anytime to keep revising.
          </p>
          <Button variant="outline" onClick={() => setEditing(true)}>
            <Pencil />
            Edit drafts
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {editing && (
        <>
          {/* Title + prompt (Write mode only; hidden in focus mode) */}
          {viewMode === "write" && !focusMode && (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-3">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                  Essay
                </p>
                {final && (
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={closeEditor}
                    title="Close the editor and go back to your final version"
                  >
                    <X />
                    Close
                  </Button>
                )}
              </div>
              <div className="space-y-5 p-6">
                <div className="space-y-1.5">
                  <label
                    htmlFor="ps-title"
                    className="text-sm font-medium text-foreground"
                  >
                    Title
                  </label>
                  <Input
                    id="ps-title"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Name this essay (just for you)"
                    maxLength={200}
                  />
                </div>

                <div className="space-y-1.5">
                  <label
                    htmlFor="ps-prompt"
                    className="text-sm font-medium text-foreground"
                  >
                    Prompt
                  </label>
                  <select
                    id="ps-prompt"
                    value={promptId}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    className={cn(
                      "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base outline-none md:text-sm dark:bg-input/30",
                      "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
                    )}
                  >
                    <option value="">Choose a prompt…</option>
                    {ESSAY_PROMPTS.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  {selectedPrompt && !showCustom && (
                    <p className="mt-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
                      {selectedPrompt.text}
                    </p>
                  )}

                  {showCustom && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-muted-foreground">
                        You've chosen to write your own prompt — enter it here.
                      </p>
                      <Textarea
                        value={customPrompt}
                        onChange={(e) =>
                          handleCustomPromptChange(e.target.value)
                        }
                        placeholder="Write the prompt you're responding to…"
                        rows={2}
                        maxLength={1000}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Draft tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {drafts.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => selectDraft(d.id)}
                className={cn(
                  "group flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  d.id === activeDraftId
                    ? "border-brand-teal/40 bg-brand-teal/10 text-brand-teal"
                    : "border-border bg-card text-muted-foreground hover:border-brand-teal/30",
                )}
              >
                <span className="font-medium">{d.label}</span>
                {d.isCurrent && (
                  <span className="rounded-full bg-brand-teal/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-teal">
                    Current
                  </span>
                )}
              </button>
            ))}

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => addDraft()}
                disabled={busy}
              >
                <Plus />
                New draft
              </Button>
              {activeDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addDraft(activeDraft.id)}
                  disabled={busy}
                  title={`Start a new draft from a copy of ${activeDraft.label}`}
                >
                  <Copy />
                  Duplicate
                </Button>
              )}
            </div>

            {/* Write vs Review (line-by-line) */}
            <div className="ml-auto inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setViewMode("write")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  viewMode === "write"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <PenLine className="size-3.5" />
                Write
              </button>
              <button
                type="button"
                onClick={() => setViewMode("review")}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors",
                  viewMode === "review"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Highlighter className="size-3.5" />
                Review
              </button>
            </div>
          </div>

          {viewMode === "write" && (
            <>
              {/* Editor */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {activeDraft && renaming ? (
                      <RenameField
                        initial={activeDraft.label}
                        onSubmit={(label) =>
                          submitRename(activeDraft.id, label)
                        }
                        onCancel={() => setRenaming(false)}
                      />
                    ) : (
                      <>
                        <span className="truncate text-sm font-medium">
                          {activeDraft?.label ?? "Draft"}
                        </span>
                        {activeDraft && (
                          <button
                            type="button"
                            onClick={() => setRenaming(true)}
                            className="text-muted-foreground transition-colors hover:text-foreground"
                            title="Rename draft"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={undo}
                      disabled={!canUndo}
                      title="Undo (Ctrl+Z)"
                    >
                      <Undo2 className="text-muted-foreground" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={redo}
                      disabled={!canRedo}
                      title="Redo (Ctrl+Shift+Z)"
                    >
                      <Redo2 className="text-muted-foreground" />
                    </Button>
                    {activeDraft && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleFinalize(activeDraft.id)}
                        disabled={busy}
                        title={
                          final
                            ? "Replace your final version with this draft"
                            : "Make this draft your final version"
                        }
                      >
                        <BadgeCheck />
                        {final ? "Replace final" : "Finalize"}
                      </Button>
                    )}
                    {activeDraft && !activeDraft.isCurrent && (
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => markCurrent(activeDraft.id)}
                      >
                        Set as current
                      </Button>
                    )}
                    {activeDraft && drafts.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => removeDraft(activeDraft.id)}
                        disabled={busy}
                        title="Delete draft"
                      >
                        <Trash2 className="text-muted-foreground" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setFocusMode((f) => !f)}
                      title={focusMode ? "Exit focus mode" : "Focus mode"}
                    >
                      {focusMode ? <Minimize2 /> : <Maximize2 />}
                    </Button>
                  </div>
                </div>

                <Textarea
                  value={content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  onKeyDown={handleEditorKeyDown}
                  onBlur={flushContent}
                  placeholder="Start writing your personal statement here. Don't worry about getting it perfect — just get the story and your thinking onto the page."
                  className={cn(
                    "resize-none rounded-none border-0 bg-transparent px-6 py-5 text-base leading-relaxed shadow-none focus-visible:ring-0 dark:bg-transparent",
                    focusMode ? "min-h-[70vh]" : "min-h-[420px]",
                  )}
                />

                {/* Bottom bar: save status + "Save now" on the left, counts right */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <SaveStatusLabel status={saveStatus} savedAt={savedAt} />
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={saveNow}
                      disabled={saveStatus === "saving"}
                    >
                      <Save />
                      Save now
                    </Button>
                  </div>
                  <span>
                    <span
                      className={cn(
                        "font-medium tabular-nums",
                        overLimit
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-foreground",
                      )}
                    >
                      {liveWords}
                    </span>{" "}
                    / {WORD_LIMIT} words
                    {overLimit && (
                      <span className="ml-1 text-amber-600 dark:text-amber-400">
                        (over the recommended limit)
                      </span>
                    )}
                    <span className="ml-3 tabular-nums">
                      {chars} characters
                    </span>
                  </span>
                </div>
              </div>

              {/* Coach feedback — holistic draft analysis (hidden in focus mode) */}
              {!focusMode && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <MessageSquareText className="size-4 text-brand-teal" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                        Coach feedback
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeAnalysis && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowFeedback((s) => !s)}
                        >
                          {showFeedback ? <ChevronDown /> : <ChevronRight />}
                          {showFeedback ? "Hide" : "Show"}
                        </Button>
                      )}
                      <Button
                        variant={activeAnalysis ? "outline" : "default"}
                        size="sm"
                        onClick={analyzeDraft}
                        disabled={analyzing}
                      >
                        {analyzing ? (
                          <Loader2 className="animate-spin" />
                        ) : activeAnalysis ? (
                          <RefreshCw />
                        ) : (
                          <Sparkles />
                        )}
                        {activeAnalysis ? "Re-analyze" : "Analyze this draft"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {analyzeError && (
                      <p className="mb-3 text-sm text-destructive">
                        {analyzeError}
                      </p>
                    )}
                    {activeAnalysis ? (
                      showFeedback ? (
                        <DraftAnalysisPanel analysis={activeAnalysis} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Feedback hidden. Tap “Show” to view it again.
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Get a holistic read of this draft — through-line, hook,
                        reflection, voice, specificity, and how it fits
                        alongside the rest of your application. AppGap coaches
                        with questions; it won't rewrite your essay.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Score — graded evaluation (Opus), hidden in focus mode */}
              {!focusMode && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Gauge className="size-4 text-brand-teal" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                        Score
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeEvaluation && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowScore((s) => !s)}
                        >
                          {showScore ? <ChevronDown /> : <ChevronRight />}
                          {showScore ? "Hide" : "Show"}
                        </Button>
                      )}
                      <Button
                        variant={activeEvaluation ? "outline" : "default"}
                        size="sm"
                        onClick={runEvaluation}
                        disabled={evalLoading}
                      >
                        {evalLoading ? (
                          <Loader2 className="animate-spin" />
                        ) : activeEvaluation ? (
                          <RefreshCw />
                        ) : (
                          <Sparkles />
                        )}
                        {activeEvaluation ? "Re-score" : "Score this draft"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {evalError && (
                      <p className="mb-3 text-sm text-destructive">
                        {evalError}
                      </p>
                    )}
                    {activeEvaluation ? (
                      showScore ? (
                        <EvaluationPanel evaluation={activeEvaluation} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Score hidden. Tap “Show” to view it again.
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Get an overall score out of 100, broken into four
                        equally-weighted categories — each scored with a short
                        explanation of why. It's a diagnostic to guide your
                        revision, not an admissions chance or official score.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Revision plan — stage-aware guidance (Gemini), write mode */}
              {!focusMode && (
                <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="size-4 text-brand-teal" />
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
                        Revision plan
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeRevision && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setShowRevision((s) => !s)}
                        >
                          {showRevision ? <ChevronDown /> : <ChevronRight />}
                          {showRevision ? "Hide" : "Show"}
                        </Button>
                      )}
                      <Button
                        variant={activeRevision ? "outline" : "default"}
                        size="sm"
                        onClick={runRevision}
                        disabled={revLoading}
                      >
                        {revLoading ? (
                          <Loader2 className="animate-spin" />
                        ) : activeRevision ? (
                          <RefreshCw />
                        ) : (
                          <Sparkles />
                        )}
                        {activeRevision ? "Re-plan" : "Plan my next revision"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-6">
                    {revError && (
                      <p className="mb-3 text-sm text-destructive">
                        {revError}
                      </p>
                    )}
                    {activeRevision ? (
                      showRevision ? (
                        <RevisionPanel revision={activeRevision} />
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Revision plan hidden. Tap “Show” to view it again.
                        </p>
                      )
                    ) : (
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        Get a stage-aware plan for your next revision — what to
                        work on and in what order, organized by the four scoring
                        categories. Guidance and questions, never a rewrite.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {viewMode === "review" && (
            <LineByLineReview
              content={activeDraft?.content ?? ""}
              analysis={activeLineByLine}
              loading={lblLoading}
              error={lblError}
              onRun={runLineByLine}
            />
          )}
        </>
      )}
    </div>
  );
}

function FinalVersionCard({
  final,
  busy,
  onUnfinalize,
}: {
  final: FinalVersionDTO;
  busy: boolean;
  onUnfinalize: () => void;
}) {
  const finalizedOn = new Date(final.finalizedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-brand-teal/40 bg-brand-teal/[0.04] shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/20 px-6 py-4">
        <div className="flex items-center gap-2">
          <BadgeCheck className="size-4 text-brand-teal" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Final version
          </p>
        </div>
        <Button
          variant="outline"
          size="xs"
          onClick={onUnfinalize}
          disabled={busy}
        >
          <RotateCcw />
          Unfinalize
        </Button>
      </div>
      <div className="space-y-3 p-6">
        <p className="text-xs text-muted-foreground">
          Finalized from{" "}
          <span className="font-medium text-foreground">
            {final.fromLabel || "a draft"}
          </span>{" "}
          on {finalizedOn} · {final.wordCount} words. This is a frozen copy —
          editing your drafts won't change it.
        </p>
        {final.content.trim() ? (
          <div className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed">
            {final.content}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
            This draft was empty when finalized.
          </p>
        )}
      </div>
    </div>
  );
}

function RenameField({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (label: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <input
      // biome-ignore lint/a11y/noAutofocus: intentional — inline rename should focus immediately
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onSubmit(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSubmit(value);
        if (e.key === "Escape") onCancel();
      }}
      maxLength={60}
      className={cn(
        "h-7 w-40 rounded-md border border-input bg-transparent px-2 text-sm outline-none",
        "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
      )}
    />
  );
}
