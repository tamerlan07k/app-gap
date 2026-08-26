"use client";

import {
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { GapCoachAvatar } from "~/components/gapcoach-avatar";
import { Button } from "~/components/ui/button";
import type {
  LineByLineAnalysis,
  LineByLineCategory,
} from "~/lib/ai/personal-statement/line-by-line";
import { cn } from "~/lib/utils";

const CATEGORY: Record<
  LineByLineCategory,
  {
    label: string;
    dot: string;
    mark: string;
    border: string;
    text: string;
    chip: string;
  }
> = {
  remove: {
    label: "Remove",
    dot: "🔴",
    mark: "bg-red-500/15 hover:bg-red-500/30",
    border: "border-red-500/40",
    text: "text-red-600 dark:text-red-400",
    chip: "bg-red-500/10",
  },
  rewrite: {
    label: "Rewrite",
    dot: "🟠",
    mark: "bg-amber-500/20 hover:bg-amber-500/35",
    border: "border-amber-500/40",
    text: "text-amber-700 dark:text-amber-400",
    chip: "bg-amber-500/10",
  },
  strong: {
    label: "Strong",
    dot: "🟢",
    mark: "bg-brand-teal/15 hover:bg-brand-teal/30",
    border: "border-brand-teal/40",
    text: "text-brand-teal",
    chip: "bg-brand-teal/10",
  },
};

type Segment = { text: string; commentIndex: number | null };

// Locate each comment's verbatim quote in the essay and split the text into
// plain + highlighted segments. Duplicate quotes resolve to their first
// non-overlapping occurrence; a quote that can't be found is skipped (its
// comment still shows in the list, just without a highlight).
function buildSegments(
  content: string,
  comments: LineByLineAnalysis["comments"],
): { segments: Segment[]; located: Set<number> } {
  const ranges: { start: number; end: number; ci: number }[] = [];
  comments.forEach((c, ci) => {
    const q = c.quote?.trim();
    if (!q) return;
    let from = 0;
    while (from <= content.length) {
      const idx = content.indexOf(q, from);
      if (idx === -1) break;
      const end = idx + q.length;
      const overlaps = ranges.some((r) => idx < r.end && end > r.start);
      if (!overlaps) {
        ranges.push({ start: idx, end, ci });
        break;
      }
      from = idx + 1;
    }
  });
  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  const located = new Set<number>();
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      segments.push({
        text: content.slice(cursor, r.start),
        commentIndex: null,
      });
    }
    segments.push({ text: content.slice(r.start, r.end), commentIndex: r.ci });
    located.add(r.ci);
    cursor = r.end;
  }
  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor), commentIndex: null });
  }
  return { segments, located };
}

export function LineByLineReview({
  content,
  analysis,
  loading,
  error,
  onRun,
}: {
  content: string;
  analysis: LineByLineAnalysis | null;
  loading: boolean;
  error: string | null;
  onRun: () => void;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const markRefs = useRef<Record<number, HTMLElement | null>>({});
  const commentRefs = useRef<Record<number, HTMLElement | null>>({});

  const { segments, located } = useMemo(
    () => buildSegments(content, analysis?.comments ?? []),
    [content, analysis],
  );

  function focusComment(i: number) {
    setActive(i);
    commentRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  function focusMark(i: number) {
    setActive(i);
    markRefs.current[i]?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  const counts = { remove: 0, rewrite: 0, strong: 0 };
  for (const c of analysis?.comments ?? []) counts[c.category]++;

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
      <div className="flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Line-by-line
        </p>
        {analysis && (
          <span className="text-xs text-muted-foreground">
            🔴 {counts.remove} · 🟠 {counts.rewrite} · 🟢 {counts.strong}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {analysis && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setExpanded((e) => !e)}
            title={expanded ? "Collapse" : "Expand to full screen"}
          >
            {expanded ? <Minimize2 /> : <Maximize2 />}
          </Button>
        )}
        <Button
          variant={analysis ? "outline" : "default"}
          size="sm"
          onClick={onRun}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="animate-spin" />
          ) : analysis ? (
            <RefreshCw />
          ) : (
            <Sparkles />
          )}
          {analysis ? "Re-run" : "Get line-by-line feedback"}
        </Button>
      </div>
    </div>
  );

  const essayColumn = (
    <div
      className={cn(
        "min-w-0 overflow-y-auto whitespace-pre-wrap rounded-xl border border-border bg-background/50 px-5 py-4 text-base leading-relaxed",
        expanded ? "h-full" : "max-h-[75vh] self-start lg:sticky lg:top-2",
      )}
    >
      {segments.map((seg, i) => {
        if (seg.commentIndex === null) {
          // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
          return <span key={i}>{seg.text}</span>;
        }
        const ci = seg.commentIndex;
        const c = analysis?.comments[ci];
        if (!c) return null;
        const meta = CATEGORY[c.category];
        return (
          <button
            type="button"
            // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
            key={i}
            ref={(el) => {
              markRefs.current[ci] = el;
            }}
            onClick={() => focusComment(ci)}
            className={cn(
              "inline cursor-pointer rounded px-0.5 text-left align-baseline text-foreground transition-colors",
              meta.mark,
              active === ci && "ring-2 ring-brand-teal/50",
            )}
          >
            {seg.text}
          </button>
        );
      })}
    </div>
  );

  const commentsColumn = (
    <div className={cn("space-y-3", expanded && "h-full overflow-y-auto pr-1")}>
      {(analysis?.comments ?? []).map((c, ci) => {
        const meta = CATEGORY[c.category];
        const interactive = located.has(ci);
        return (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: comments are positional
            key={ci}
            ref={(el) => {
              commentRefs.current[ci] = el;
            }}
            className={cn(
              "rounded-xl border bg-card p-4",
              meta.border,
              active === ci && "ring-2 ring-brand-teal/50",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GapCoachAvatar />
                <span className="text-sm font-semibold">GapCoach</span>
                <span
                  className={cn(
                    "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    meta.chip,
                    meta.text,
                  )}
                >
                  {meta.dot} {meta.label}
                </span>
              </div>
              {interactive ? (
                <button
                  type="button"
                  onClick={() => focusMark(ci)}
                  className="shrink-0 text-[10px] font-medium text-brand-teal hover:underline"
                >
                  Jump to text
                </button>
              ) : (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  (couldn't locate)
                </span>
              )}
            </div>
            {interactive && (
              <p className="mt-2 line-clamp-2 border-l-2 border-border pl-2 text-xs italic text-muted-foreground">
                “{c.quote}”
              </p>
            )}
            <p className="mt-2 text-sm leading-relaxed">{c.what}</p>
            {c.why && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Why:</span>{" "}
                {c.why}
              </p>
            )}
            {c.suggestion && (
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                <span className="font-medium text-foreground">Try:</span>{" "}
                {c.suggestion}
              </p>
            )}
            {c.question && (
              <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-sm leading-relaxed">
                <span className="font-medium">Ask yourself:</span> {c.question}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );

  const body = !analysis ? (
    <p className="text-sm leading-relaxed text-muted-foreground">
      Get margin notes on your draft — the coach highlights specific passages as
      🔴 remove, 🟠 rewrite, or 🟢 strong, and explains each one. It won't
      rewrite your essay; click a highlight to read its note.
      {content.trim() ? "" : " Write some of your draft first."}
    </p>
  ) : (
    <div className={cn("flex flex-col", expanded && "h-full min-h-0")}>
      {analysis.overview.trim() && (
        <p className="mb-4 shrink-0 text-sm leading-relaxed">
          {analysis.overview}
        </p>
      )}
      <div
        className={cn(
          "grid gap-5 lg:grid-cols-[1fr_22rem]",
          expanded && "min-h-0 flex-1",
        )}
      >
        {essayColumn}
        {commentsColumn}
      </div>
      <p className="mt-4 shrink-0 text-xs text-muted-foreground">
        These are margin notes to guide your own edits — make changes back in
        the Write view. The coach never rewrites your essay for you.
      </p>
    </div>
  );

  if (expanded) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-background">
        {header}
        <div className="min-h-0 flex-1 overflow-hidden p-6">
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
          {body}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {header}
      <div className="p-6">
        {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
        {body}
      </div>
    </div>
  );
}
