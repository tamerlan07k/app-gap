"use client";

import {
  FileText,
  Lightbulb,
  Loader2,
  PenLine,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import type { BrainstormInsights } from "~/lib/ai/personal-statement/brainstorm";
import type { DraftAnalysis } from "~/lib/ai/personal-statement/draft-analysis";
import type { Evaluation } from "~/lib/ai/personal-statement/evaluation";
import type { LineByLineAnalysis } from "~/lib/ai/personal-statement/line-by-line";
import type { Revision } from "~/lib/ai/personal-statement/revision";
import type { BrainstormInputs } from "~/lib/personal-statement/brainstorm";
import type { ChatMessage } from "~/lib/personal-statement/chat";
import { cn } from "~/lib/utils";
import { createStatement, deleteStatement, type StatementDTO } from "./actions";
import { BrainstormPanel } from "./brainstorm-panel";
import { GapCoachChat } from "./gapcoach-chat";
import { StatementEditor } from "./statement-editor";

type Mode = "brainstorm" | "write";

export function PersonalStatementWorkspace({
  initialStatements,
  initialBrainstormInputs,
  initialBrainstormInsights,
  initialDraftAnalyses,
  initialLineByLine,
  initialEvaluations,
  initialRevisions,
  initialChats,
}: {
  initialStatements: StatementDTO[];
  initialBrainstormInputs: BrainstormInputs;
  initialBrainstormInsights: BrainstormInsights | null;
  /** Cached holistic draft feedback keyed by draft id, across all statements. */
  initialDraftAnalyses: Record<string, DraftAnalysis>;
  /** Cached line-by-line feedback keyed by draft id, across all statements. */
  initialLineByLine: Record<string, LineByLineAnalysis>;
  /** Cached graded evaluations keyed by draft id, across all statements. */
  initialEvaluations: Record<string, Evaluation>;
  /** Cached revision plans keyed by draft id, across all statements. */
  initialRevisions: Record<string, Revision>;
  /** GapCoach chat threads keyed by statement id. */
  initialChats: Record<string, ChatMessage[]>;
}) {
  const [statements, setStatements] =
    useState<StatementDTO[]>(initialStatements);
  const [activeId, setActiveId] = useState<string>(
    initialStatements[0]?.id ?? "",
  );
  const [mode, setMode] = useState<Mode>(
    initialStatements.length > 0 ? "write" : "brainstorm",
  );
  // Brainstorm state lives here (not in the panel) so it survives the
  // Brainstorm/Write toggle — the panel unmounts on switch, this doesn't.
  const [brainstormInputs, setBrainstormInputs] = useState<BrainstormInputs>(
    initialBrainstormInputs,
  );
  const [brainstormInsights, setBrainstormInsights] =
    useState<BrainstormInsights | null>(initialBrainstormInsights);
  // GapCoach chat threads, keyed by statement id (persists across mode toggles).
  const [chats, setChats] =
    useState<Record<string, ChatMessage[]>>(initialChats);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = statements.find((s) => s.id === activeId) ?? null;

  async function handleCreate() {
    setBusy(true);
    setError(null);
    const res = await createStatement({});
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatements((prev) => [res.statement, ...prev]);
    setActiveId(res.statement.id);
    setMode("write");
  }

  // Start an essay from a brainstorming direction — seeds only the title (never
  // AI-written prose) and switches to the writing view.
  async function handleStartEssay(title: string) {
    setBusy(true);
    setError(null);
    const res = await createStatement({ title });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatements((prev) => [res.statement, ...prev]);
    setActiveId(res.statement.id);
    setMode("write");
  }

  async function handleDelete(id: string) {
    const target = statements.find((s) => s.id === id);
    const label = target?.title?.trim() || "this personal statement";
    if (
      !window.confirm(
        `Delete "${label}"? This permanently removes the entire essay — every draft AND any finalized version. This can't be undone.\n\n(To just close the editor, use "Close" instead — this button deletes everything.)`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    const res = await deleteStatement(id);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStatements((prev) => {
      const next = prev.filter((s) => s.id !== id);
      if (id === activeId) setActiveId(next[0]?.id ?? "");
      return next;
    });
  }

  function handleTitleChange(id: string, title: string) {
    setStatements((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title } : s)),
    );
  }

  return (
    <section className="space-y-6">
      {/* Intro */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Personal Statement
          </p>
        </div>
        <div className="flex gap-4 p-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
            <PenLine className="size-5 text-brand-teal" />
          </div>
          <div className="space-y-1">
            <h2 className="font-semibold tracking-tight">
              Your Common App personal statement
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Not sure what to write about? Start in Brainstorm and let AppGap
              help you find your story. Ready to write? Switch to Write — pick a
              prompt, draft freely, and keep as many versions as you need.
              Everything autosaves.
            </p>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
        <button
          type="button"
          onClick={() => setMode("brainstorm")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "brainstorm"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Lightbulb className="size-4" />
          Brainstorm
        </button>
        <button
          type="button"
          onClick={() => setMode("write")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors",
            mode === "write"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <PenLine className="size-4" />
          Write
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "brainstorm" ? (
        <BrainstormPanel
          inputs={brainstormInputs}
          insights={brainstormInsights}
          onInputsChange={setBrainstormInputs}
          onInsightsChange={setBrainstormInsights}
          onStartEssay={handleStartEssay}
        />
      ) : statements.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
            <FileText className="size-7 text-brand-teal" />
          </div>
          <div>
            <p className="font-semibold">Start your personal statement</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
              Create your essay to choose a prompt and begin drafting — or head
              to Brainstorm first if you're still finding your topic.
            </p>
          </div>
          <Button onClick={handleCreate} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            New personal statement
          </Button>
        </div>
      ) : (
        <>
          {/* Statement switcher (only meaningful with more than one essay) */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {statements.length > 1 &&
                statements.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveId(s.id)}
                    className={cn(
                      "max-w-[16rem] truncate rounded-full border px-3 py-1.5 text-sm transition-colors",
                      s.id === activeId
                        ? "border-brand-teal/40 bg-brand-teal/10 font-medium text-brand-teal"
                        : "border-border bg-card text-muted-foreground hover:border-brand-teal/30",
                    )}
                  >
                    {s.title || "Untitled essay"}
                  </button>
                ))}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreate}
                disabled={busy}
              >
                <Plus />
                New essay
              </Button>
              {active && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleDelete(active.id)}
                  disabled={busy}
                  title="Delete this personal statement"
                >
                  <Trash2 className="text-muted-foreground" />
                </Button>
              )}
            </div>
          </div>

          {active && (
            <StatementEditor
              key={active.id}
              statement={active}
              initialDraftAnalyses={initialDraftAnalyses}
              initialLineByLine={initialLineByLine}
              initialEvaluations={initialEvaluations}
              initialRevisions={initialRevisions}
              onTitleChange={handleTitleChange}
            />
          )}
        </>
      )}

      {/* GapCoach live chat — a right-side drawer available while writing. */}
      {mode === "write" && active && (
        <GapCoachChat
          key={active.id}
          statementId={active.id}
          messages={chats[active.id] ?? []}
          onMessagesChange={(next) =>
            setChats((prev) => ({ ...prev, [active.id]: next }))
          }
        />
      )}
    </section>
  );
}
