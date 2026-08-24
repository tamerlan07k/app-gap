"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import {
  publishAllFitDrafts,
  publishAllHistoryDrafts,
  publishAllProgramDrafts,
  unpublishAllFit,
  unpublishAllHistory,
  unpublishAllProgram,
} from "./actions";

type BulkResult = { ok: boolean; count?: number; error?: string };
type TypeKey = "history" | "fit" | "program";
type Counts = Record<TypeKey, { draft: number; live: number }>;

const CONFIG: {
  key: TypeKey;
  label: string;
  publish: () => Promise<BulkResult>;
  unpublish: () => Promise<BulkResult>;
  /** Extra caution copy for content with higher invention risk. */
  caution?: string;
}[] = [
  {
    key: "history",
    label: "History",
    publish: publishAllHistoryDrafts,
    unpublish: unpublishAllHistory,
  },
  {
    key: "fit",
    label: "Fit facets",
    publish: publishAllFitDrafts,
    unpublish: unpublishAllFit,
    caution:
      "Fit drafts can contain AI-invented specifics (esp. lesser-known schools). Spot-check several first.",
  },
  {
    key: "program",
    label: "Program blurbs",
    publish: publishAllProgramDrafts,
    unpublish: unpublishAllProgram,
    caution:
      "Program ratings/blurbs are AI-drafted and can be wrong. Spot-check several first.",
  },
];

function Row({
  label,
  draft,
  live,
  caution,
  onPublish,
  onUnpublish,
  pending,
}: {
  label: string;
  draft: number;
  live: number;
  caution?: string;
  onPublish: () => void;
  onUnpublish: () => void;
  pending: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <span className="text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {" "}
          — {draft} draft{draft === 1 ? "" : "s"} · {live} live
        </span>
      </span>
      <div className="ml-auto flex items-center gap-2">
        {live > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onUnpublish}
            disabled={pending}
          >
            Unpublish all
          </Button>
        )}
        <Button size="sm" onClick={onPublish} disabled={pending || draft === 0}>
          {`Publish all ${draft}`}
        </Button>
      </div>
      {caution && (
        <p className="w-full text-xs text-amber-600 dark:text-amber-400">
          {caution}
        </p>
      )}
    </div>
  );
}

export function BulkPublishControls({ counts }: { counts: Counts }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const run = (
    kind: "publish" | "unpublish",
    label: string,
    n: number,
    fn: () => Promise<BulkResult>,
    caution?: string,
  ) => {
    const verb = kind === "publish" ? "Publish" : "Unpublish";
    const warn = kind === "publish" && caution ? `\n\n${caution}` : "";
    const tail =
      kind === "publish"
        ? "They become visible to students."
        : "Text is kept as drafts; nothing is deleted.";
    if (!window.confirm(`${verb} all ${n} ${label} item(s)? ${tail}${warn}`))
      return;
    startTransition(async () => {
      setMsg(null);
      const r = await fn();
      setMsg(
        r.ok
          ? `${verb}ed ${r.count ?? 0} ${label} item(s).`
          : `Error: ${r.error}`,
      );
      if (r.ok) router.refresh();
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card px-4 py-2">
      <p className="pb-1 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Bulk publish
      </p>
      <div className="divide-y divide-border/60">
        {CONFIG.map((c) => (
          <Row
            key={c.key}
            label={c.label}
            draft={counts[c.key].draft}
            live={counts[c.key].live}
            caution={c.caution}
            pending={pending}
            onPublish={() =>
              run("publish", c.label, counts[c.key].draft, c.publish, c.caution)
            }
            onUnpublish={() =>
              run("unpublish", c.label, counts[c.key].live, c.unpublish)
            }
          />
        ))}
      </div>
      {msg && (
        <p
          className={cn(
            "pb-1 pt-2 text-xs",
            msg.startsWith("Error")
              ? "text-red-600 dark:text-red-400"
              : "text-brand-teal",
          )}
        >
          {msg}
        </p>
      )}
    </div>
  );
}
