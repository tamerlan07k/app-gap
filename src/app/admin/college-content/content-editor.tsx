"use client";

import { useState, useTransition } from "react";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";
import { saveCollegeFit, saveCollegeHistory } from "./actions";

const textareaCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";
const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-1.5 text-xs shadow-sm focus:border-brand-teal focus:outline-none focus:ring-1 focus:ring-brand-teal";

function StatusPill({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
        published
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  );
}

export interface ContentEditorProps {
  collegeId: string;
  collegeName: string;
  initial: {
    history: string;
    historySourceUrl: string;
    historyPublished: boolean;
    fit: {
      campusLife: string;
      diversity: string;
      opportunities: string;
      vibe: string;
      careerFit: string;
    };
    fitSourceUrl: string;
    fitPublished: boolean;
  };
}

const FIT_FIELDS: {
  key: keyof ContentEditorProps["initial"]["fit"];
  label: string;
  hint: string;
}[] = [
  {
    key: "vibe",
    label: "Campus vibe",
    hint: "One sentence on the overall feel.",
  },
  {
    key: "campusLife",
    label: "Campus life",
    hint: "Residential life, clubs, athletics.",
  },
  { key: "diversity", label: "Diversity", hint: "Community make-up." },
  {
    key: "opportunities",
    label: "Opportunities",
    hint: "Research, internships, distinctive programs.",
  },
  {
    key: "careerFit",
    label: "Career fit",
    hint: "Outcomes / recruiting strengths.",
  },
];

export function ContentEditor({
  collegeId,
  collegeName,
  initial,
}: ContentEditorProps) {
  const [history, setHistory] = useState(initial.history);
  const [historyUrl, setHistoryUrl] = useState(initial.historySourceUrl);
  const [historyPublished, setHistoryPublished] = useState(
    initial.historyPublished,
  );
  const [fit, setFit] = useState(initial.fit);
  const [fitUrl, setFitUrl] = useState(initial.fitSourceUrl);
  const [fitPublished, setFitPublished] = useState(initial.fitPublished);

  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const saveHistory = () =>
    startTransition(async () => {
      setMsg(null);
      const r = await saveCollegeHistory(collegeId, {
        history,
        sourceUrl: historyUrl,
        published: historyPublished,
      });
      setMsg(r.ok ? "History saved." : `Error: ${r.error}`);
    });

  const saveFit = () =>
    startTransition(async () => {
      setMsg(null);
      const r = await saveCollegeFit(collegeId, {
        fit,
        sourceUrl: fitUrl,
        published: fitPublished,
      });
      setMsg(r.ok ? "Fit facets saved." : `Error: ${r.error}`);
    });

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-bold tracking-tight">{collegeName}</h2>
        <p className="text-xs text-muted-foreground">
          Content shows on the student-facing college page ONLY when published.
          Review AI drafts here and publish once accurate — never publish
          unverified claims.
        </p>
      </div>

      {msg && (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 text-sm",
            msg.startsWith("Error")
              ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400"
              : "border-brand-teal/30 bg-brand-teal/5 text-brand-teal",
          )}
        >
          {msg}
        </p>
      )}

      {/* School History */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">School History</h3>
          <StatusPill published={historyPublished} />
        </div>
        <textarea
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          rows={8}
          placeholder="A concise, prospective-student-facing history (founding, milestones, what it became known for). Separate paragraphs with a blank line."
          className={textareaCls}
        />
        <input
          type="url"
          value={historyUrl}
          onChange={(e) => setHistoryUrl(e.target.value)}
          placeholder="Source URL (optional, for your records)"
          className={inputCls}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={historyPublished}
              onChange={(e) => setHistoryPublished(e.target.checked)}
              className="size-4 accent-brand-teal"
            />
            Published (visible to students)
          </label>
          <Button size="sm" onClick={saveHistory} disabled={pending}>
            {pending ? "Saving…" : "Save history"}
          </Button>
        </div>
      </section>

      {/* Fit facets */}
      <section className="space-y-3 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold">
            “Why this school might fit you” facets
          </h3>
          <StatusPill published={fitPublished} />
        </div>
        <p className="text-xs text-muted-foreground">
          Each is one sentence, stated as a school fact. They’re woven together
          with the student’s own profile on the page.
        </p>
        {FIT_FIELDS.map((f) => (
          <label key={f.key} className="block space-y-1">
            <span className="text-xs font-medium text-foreground/80">
              {f.label}{" "}
              <span className="text-muted-foreground/70">— {f.hint}</span>
            </span>
            <textarea
              value={fit[f.key]}
              onChange={(e) => setFit({ ...fit, [f.key]: e.target.value })}
              rows={2}
              className={textareaCls}
            />
          </label>
        ))}
        <input
          type="url"
          value={fitUrl}
          onChange={(e) => setFitUrl(e.target.value)}
          placeholder="Source URL (optional)"
          className={inputCls}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={fitPublished}
              onChange={(e) => setFitPublished(e.target.checked)}
              className="size-4 accent-brand-teal"
            />
            Published (visible to students)
          </label>
          <Button size="sm" onClick={saveFit} disabled={pending}>
            {pending ? "Saving…" : "Save facets"}
          </Button>
        </div>
      </section>
    </div>
  );
}
