"use client";

import {
  BookOpen,
  ExternalLink,
  Layers,
  Loader2,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import type { AwardNote, RedundancyBand } from "~/lib/ai/awards-schema";
import type { AwardRecord } from "~/lib/awards/types";
import { AWARD_LEVEL_LABELS } from "~/lib/profile-labels";
import { cn } from "~/lib/utils";
import { deleteAward } from "./actions";
import { AwardForm } from "./award-form";

const REDUNDANCY_META: Record<
  RedundancyBand,
  { label: string; badge: string }
> = {
  adds_new: {
    label: "Adds a new dimension",
    badge: "bg-brand-teal/10 text-brand-teal",
  },
  mixed: {
    label: "Adds some new evidence",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  reinforces: {
    label: "Reinforces existing evidence",
    badge: "bg-muted text-muted-foreground",
  },
};

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
      <p className="text-xs leading-relaxed">
        <span className="font-semibold text-foreground">{label} </span>
        <span className="text-muted-foreground">{children}</span>
      </p>
    </div>
  );
}

export function AwardItem({
  award,
  note,
}: {
  award: AwardRecord;
  /** Matched AI note for this award, or null if not analyzed yet. */
  note: AwardNote | null;
}) {
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    setError(null);
    startTransition(async () => {
      const res = await deleteAward(award.id);
      if (!res.ok) {
        setError(res.error ?? "Couldn't delete.");
        setConfirmingDelete(false);
      }
    });
  }

  if (editing) {
    return (
      <div className="p-5">
        <AwardForm
          award={award}
          onSaved={() => setEditing(false)}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  const meta = note ? REDUNDANCY_META[note.redundancy] : null;
  const metaBits = [
    award.organization,
    award.level ? (AWARD_LEVEL_LABELS[award.level] ?? award.level) : "",
    award.placement,
    award.year,
  ].filter(Boolean);

  return (
    <div className="space-y-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium leading-snug">
            {award.name || "Untitled award"}
          </p>
          {metaBits.length > 0 && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {metaBits.join(" · ")}
            </p>
          )}
        </div>
        {meta && (
          <span
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium",
              meta.badge,
            )}
          >
            {meta.label}
          </span>
        )}
      </div>

      {award.description?.trim() && (
        <p className="text-sm leading-relaxed text-muted-foreground">
          {award.description.trim()}
        </p>
      )}

      {award.selectivityContext?.trim() && (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Context: </span>
          {award.selectivityContext.trim()}
        </p>
      )}

      {/* AI "Why this matters" */}
      {note ? (
        <div className="space-y-2.5 rounded-lg border border-border bg-muted/20 p-3">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="flex w-full items-center gap-1.5 text-left text-xs font-semibold text-brand-teal"
          >
            <Sparkles className="size-3.5" />
            Why this matters
            <span className="ml-auto text-muted-foreground">
              {expanded ? "Hide" : "Show"}
            </span>
          </button>
          <Row icon={<Sparkles className="size-3.5" />} label="Demonstrates:">
            {note.whatItDemonstrates}
          </Row>
          {expanded && (
            <>
              <Row
                icon={<Layers className="size-3.5" />}
                label="Doesn't prove:"
              >
                {note.whatItDoesnt}
              </Row>
              <Row
                icon={<Layers className="size-3.5" />}
                label="Connected evidence:"
              >
                {note.connectedEvidence}
              </Row>
              {note.redundancyNote && (
                <Row icon={<Layers className="size-3.5" />} label="Redundancy:">
                  {note.redundancyNote}
                </Row>
              )}
              {note.storyMaterial?.trim() && (
                <div className="flex items-start gap-2 rounded-md border border-brand-teal/20 bg-brand-teal/[0.05] p-2.5">
                  <BookOpen className="mt-0.5 size-3.5 shrink-0 text-brand-teal" />
                  <p className="text-xs leading-relaxed">
                    <span className="font-semibold text-brand-teal">
                      Possible story material:{" "}
                    </span>
                    {note.storyMaterial}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Run the Recognition Map analysis to see what this award adds to your
          application.
        </p>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          onClick={() => setEditing(true)}
          disabled={pending}
        >
          <Pencil />
          Edit
        </Button>
        {award.evidenceUrl && (
          <Button variant="ghost" size="xs" asChild>
            <a
              href={award.evidenceUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink />
              Evidence
            </a>
          </Button>
        )}
        {confirmingDelete ? (
          <>
            <Button
              variant="destructive"
              size="xs"
              onClick={handleDelete}
              disabled={pending}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Confirm delete
            </Button>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => setConfirmingDelete(false)}
              disabled={pending}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setConfirmingDelete(true)}
            disabled={pending}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 />
            Delete
          </Button>
        )}
      </div>
    </div>
  );
}
