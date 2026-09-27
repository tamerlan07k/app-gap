"use client";

import { useMemo } from "react";
import type {
  LineByLineAnalysis,
  LineByLineCategory,
  LineByLineComment,
} from "~/lib/supplemental/schemas";
import { cn } from "~/lib/utils";

// Line-by-line review — locates each comment's verbatim quote in the essay and
// highlights it (Google-Docs style), with the full comment list below. Comments
// whose quote can't be located, and "directive_missing" comments (no quote by
// design), are still listed. Adapts the Personal Statement reviewer's approach.

type Tone = "good" | "warn" | "bad";

const CATEGORY_META: Record<LineByLineCategory, { label: string; tone: Tone }> =
  {
    strong_evidence: { label: "Strong evidence", tone: "good" },
    strong_reflection: { label: "Strong reflection", tone: "good" },
    strong_college_connection: {
      label: "Strong college connection",
      tone: "good",
    },
    generic_telling: { label: "Generic / telling", tone: "warn" },
    missing_explanation: { label: "Missing explanation", tone: "warn" },
    unsupported_claim: { label: "Unsupported claim", tone: "warn" },
    repetitive: { label: "Repetitive", tone: "warn" },
    superficial_namedrop: { label: "Superficial name-drop", tone: "bad" },
    directive_missing: { label: "Prompt directive missing", tone: "bad" },
  };

const TONE_DOT: Record<Tone, string> = {
  good: "bg-brand-teal",
  warn: "bg-amber-500",
  bad: "bg-red-500 dark:bg-red-400",
};

const TONE_HL: Record<Tone, string> = {
  good: "bg-brand-teal/15",
  warn: "bg-amber-500/15",
  bad: "bg-red-500/15",
};

type Segment = { text: string; tone: Tone | null };

// Locate each comment's quote in the essay via non-overlapping first-match, and
// split the essay into plain + highlighted segments.
function buildSegments(
  content: string,
  comments: LineByLineComment[],
): { segments: Segment[]; locatedCount: number } {
  const ranges: { start: number; end: number; tone: Tone }[] = [];
  let located = 0;
  for (const c of comments) {
    if (!c.quote) continue;
    const from = 0;
    let idx = content.indexOf(c.quote, from);
    // Advance past any range already taken so two comments don't fight.
    while (idx !== -1) {
      const overlaps = ranges.some(
        (r) => idx < r.end && idx + c.quote.length > r.start,
      );
      if (!overlaps) break;
      idx = content.indexOf(c.quote, idx + 1);
    }
    if (idx !== -1) {
      ranges.push({
        start: idx,
        end: idx + c.quote.length,
        tone: CATEGORY_META[c.category].tone,
      });
      located += 1;
    }
  }
  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start > cursor) {
      segments.push({ text: content.slice(cursor, r.start), tone: null });
    }
    segments.push({ text: content.slice(r.start, r.end), tone: r.tone });
    cursor = r.end;
  }
  if (cursor < content.length) {
    segments.push({ text: content.slice(cursor), tone: null });
  }
  return { segments, locatedCount: located };
}

export function LineByLineReview({
  content,
  analysis,
}: {
  content: string;
  analysis: LineByLineAnalysis;
}) {
  const { segments } = useMemo(
    () => buildSegments(content, analysis.comments),
    [content, analysis.comments],
  );

  return (
    <div>
      {analysis.overview && (
        <p className="text-sm text-muted-foreground">{analysis.overview}</p>
      )}

      {/* The essay with highlights */}
      <div className="mt-4 whitespace-pre-wrap rounded-lg border border-border bg-background p-4 text-sm leading-relaxed">
        {segments.length === 0 ? (
          <span className="text-muted-foreground">(the essay is empty)</span>
        ) : (
          segments.map((s, i) =>
            s.tone ? (
              <mark
                // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
                key={i}
                className={cn(
                  "rounded px-0.5 text-foreground",
                  TONE_HL[s.tone],
                )}
              >
                {s.text}
              </mark>
            ) : (
              // biome-ignore lint/suspicious/noArrayIndexKey: segments are positional
              <span key={i}>{s.text}</span>
            ),
          )
        )}
      </div>

      {/* The comments */}
      <ul className="mt-4 space-y-2.5">
        {analysis.comments.map((c, i) => {
          const meta = CATEGORY_META[c.category];
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: comments are positional
            <li key={i} className="rounded-lg border border-border p-3">
              <div className="flex items-center gap-2">
                <span
                  className={cn("size-2 rounded-full", TONE_DOT[meta.tone])}
                />
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {meta.label}
                </span>
              </div>
              {c.quote && (
                <p className="mt-1.5 text-sm italic text-foreground">
                  “{c.quote}”
                </p>
              )}
              <p className="mt-1 text-sm">{c.what}</p>
              {c.why && (
                <p className="mt-0.5 text-sm text-muted-foreground">{c.why}</p>
              )}
              {c.suggestion && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Consider:{" "}
                  </span>
                  {c.suggestion}
                </p>
              )}
              {c.question && (
                <p className="mt-1 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    Ask yourself:{" "}
                  </span>
                  {c.question}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
