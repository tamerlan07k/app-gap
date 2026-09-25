"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CollegeLogo } from "~/app/dashboard/colleges/college-logo";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import {
  ESSAY_STATUS_CLASSES,
  ESSAY_STATUS_LABELS,
} from "~/lib/supplemental/status";
import { extractWordLimit } from "~/lib/supplemental/text";
import type {
  CollegeEssayGroupDTO,
  SupplementalEssayDTO,
  SupplementStatus,
  VerifiedPromptDTO,
} from "~/lib/supplemental/types";
import { cn } from "~/lib/utils";
import { addEssay, addEssayFromPrompt, deleteEssay } from "../actions";

const BASE = "/dashboard/profile/supplemental-essays";

export function CollegeWorkspace({
  group,
  officialPrompts,
  status,
  schoolNote,
}: {
  group: CollegeEssayGroupDTO;
  officialPrompts: VerifiedPromptDTO[];
  status: SupplementStatus;
  /** School-filter context (e.g. "showing prompts for College of Engineering"). */
  schoolNote?: string | null;
}) {
  const router = useRouter();
  const [essays, setEssays] = useState<SupplementalEssayDTO[]>(group.essays);
  const [adding, setAdding] = useState(false);

  const openEssay = (essayId: string) =>
    router.push(`${BASE}/${group.collegeId}/${essayId}`);

  // Which official prompts the student has already started (by catalog id).
  const startedByCatalogId = new Map(
    essays
      .filter((e) => e.catalogPromptId)
      .map((e) => [e.catalogPromptId as string, e]),
  );
  const officialIds = new Set(officialPrompts.map((p) => p.id));
  // Custom prompts + any catalog essay whose prompt is no longer offered.
  const otherEssays = essays.filter(
    (e) => !e.catalogPromptId || !officialIds.has(e.catalogPromptId),
  );

  // Prompts always win; only treat as "verified none" when there are none to show.
  const verifiedNone =
    status === "none_required" && officialPrompts.length === 0;

  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href={BASE}>
          <ArrowLeft />
          All colleges
        </Link>
      </Button>

      <header className="mb-6 flex items-start gap-3">
        <CollegeLogo
          name={group.collegeName}
          logoAssetPath={group.logoAssetPath}
        />
        <div className="min-w-0">
          <h2 className="text-lg font-bold tracking-tight">
            {group.collegeName}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Supplemental Essays
          </p>
        </div>
      </header>

      {/* Verified: this college requires no supplemental essays this cycle. */}
      {verifiedNone && (
        <section className="mb-6 flex items-start gap-3 rounded-xl border border-brand-teal/30 bg-brand-teal/[0.05] px-4 py-3.5">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-teal" />
          <div>
            <p className="text-sm font-medium">
              No supplemental essays required for 2026–27
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Based on this college's official application, there are no
              supplemental prompts this cycle. You can still draft one below if
              you'd like feedback on optional writing.
            </p>
          </div>
        </section>
      )}

      {/* School-aware filtering context (e.g. "showing College of Engineering") */}
      {schoolNote && (
        <p className="mb-4 rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {schoolNote}
        </p>
      )}

      {/* Official prompts (pre-populated from verified data) */}
      {officialPrompts.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">
            Official prompts{" "}
            <span className="font-normal text-muted-foreground">(2026–27)</span>
          </h3>
          <ul className="flex flex-col gap-2">
            {officialPrompts.map((prompt) => (
              <li key={prompt.id}>
                <OfficialPromptRow
                  collegeId={group.collegeId}
                  prompt={prompt}
                  started={startedByCatalogId.get(prompt.id) ?? null}
                  onStarted={(essay) => {
                    setEssays((prev) => [...prev, essay]);
                    openEssay(essay.id);
                  }}
                  onOpen={openEssay}
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* The student's own essays (custom prompts + started-but-retired ones) */}
      {otherEssays.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold">
            {officialPrompts.length > 0 ? "Your other essays" : "Your essays"}
          </h3>
          <ul className="flex flex-col gap-2">
            {otherEssays.map((essay) => (
              <li key={essay.id}>
                <PromptRow
                  collegeId={group.collegeId}
                  essay={essay}
                  onDeleted={(id) =>
                    setEssays((prev) => prev.filter((e) => e.id !== id))
                  }
                />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Manual entry — the fallback for novel/custom or not-yet-verified prompts */}
      {adding ? (
        <AddPromptForm
          collegeId={group.collegeId}
          onCancel={() => setAdding(false)}
          onAdded={(essay) => {
            setAdding(false);
            openEssay(essay.id);
          }}
        />
      ) : (
        <div>
          <Button variant="outline" onClick={() => setAdding(true)}>
            <Plus />
            Add a custom prompt
          </Button>
          {officialPrompts.length === 0 && !verifiedNone && (
            <p className="mt-2 text-xs text-muted-foreground">
              We don't have verified prompts for this college yet — paste the
              exact wording from the college and AppGap will analyze it.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function OfficialPromptRow({
  collegeId,
  prompt,
  started,
  onStarted,
  onOpen,
}: {
  collegeId: string;
  prompt: VerifiedPromptDTO;
  started: SupplementalEssayDTO | null;
  onStarted: (essay: SupplementalEssayDTO) => void;
  onOpen: (essayId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStart() {
    if (started) {
      onOpen(started.id);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await addEssayFromPrompt(collegeId, prompt.id);
      if (res.ok) onStarted(res.essay);
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          {prompt.schoolName && (
            <p className="text-xs font-medium text-brand-teal">
              {prompt.schoolName}
            </p>
          )}
          <p className="text-sm">{prompt.promptText}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {prompt.wordLimit ? <span>{prompt.wordLimit} words</span> : null}
            <span>{prompt.isRequired ? "Required" : "Optional"}</span>
            {started && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 font-medium",
                  ESSAY_STATUS_CLASSES[started.status],
                )}
              >
                {ESSAY_STATUS_LABELS[started.status]}
              </span>
            )}
          </div>
          {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
        </div>
        <Button
          variant={started ? "outline" : "default"}
          size="sm"
          className="shrink-0"
          onClick={handleStart}
          disabled={pending}
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : started ? (
            <>
              Continue
              <ArrowRight />
            </>
          ) : (
            <>
              <Plus />
              Start writing
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function PromptRow({
  collegeId,
  essay,
  onDeleted,
}: {
  collegeId: string;
  essay: SupplementalEssayDTO;
  onDeleted: (id: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      const res = await deleteEssay(essay.id);
      if (res.ok) onDeleted(essay.id);
      else setConfirming(false);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <Link
        href={`${BASE}/${collegeId}/${essay.id}`}
        className="group min-w-0 flex-1"
      >
        <p className="line-clamp-2 text-sm font-medium">
          {essay.promptText || "(untitled prompt)"}
        </p>
        <div className="mt-1.5 flex items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-xs font-medium",
              ESSAY_STATUS_CLASSES[essay.status],
            )}
          >
            {ESSAY_STATUS_LABELS[essay.status]}
          </span>
          <span className="text-xs text-muted-foreground">
            {essay.wordCount} words
            {essay.wordLimit ? ` / ${essay.wordLimit}` : ""}
          </span>
        </div>
      </Link>

      {confirming ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : "Delete"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Delete prompt"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="text-muted-foreground" />
          </Button>
          <Link
            href={`${BASE}/${collegeId}/${essay.id}`}
            aria-label="Open essay"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <ArrowRight className="size-4" />
          </Link>
        </div>
      )}
    </div>
  );
}

function AddPromptForm({
  collegeId,
  onCancel,
  onAdded,
}: {
  collegeId: string;
  onCancel: () => void;
  onAdded: (essay: SupplementalEssayDTO) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [wordLimit, setWordLimit] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Suggest a word limit detected in the pasted prompt (editable).
  const detected = extractWordLimit(prompt);
  const effectiveLimit = wordLimit.trim()
    ? Number.parseInt(wordLimit, 10)
    : detected;

  function handleSubmit() {
    setError(null);
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Paste the prompt text first.");
      return;
    }
    const limit =
      effectiveLimit && Number.isFinite(effectiveLimit) ? effectiveLimit : null;
    startTransition(async () => {
      const res = await addEssay(collegeId, trimmed, limit);
      if (res.ok) onAdded(res.essay);
      else setError(res.error);
    });
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <label htmlFor="new-prompt" className="text-sm font-medium">
        Prompt text
      </label>
      <Textarea
        id="new-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Paste the exact supplemental prompt from this college…"
        rows={4}
        className="mt-1.5"
      />
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="new-limit" className="text-sm font-medium">
            Word limit{" "}
            <span className="font-normal text-muted-foreground">
              (optional)
            </span>
          </label>
          <input
            id="new-limit"
            type="number"
            inputMode="numeric"
            min={1}
            value={wordLimit}
            onChange={(e) => setWordLimit(e.target.value)}
            placeholder={detected ? String(detected) : "e.g. 250"}
            className="mt-1.5 h-9 w-28 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"
          />
        </div>
        {detected != null && !wordLimit.trim() && (
          <p className="pb-2 text-xs text-muted-foreground">
            Detected “{detected} words” in the prompt.
          </p>
        )}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex items-center gap-2">
        <Button onClick={handleSubmit} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />}
          Add prompt
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={pending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
