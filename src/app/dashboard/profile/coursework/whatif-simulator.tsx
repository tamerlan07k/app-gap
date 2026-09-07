"use client";

import { ArrowRight, FlaskConical, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  COMMON_ADVANCED_COURSES,
  checklistBySubject,
  SUBJECT_AREA_LABELS,
} from "~/lib/coursework/catalog";
import {
  PREPARATION_BAND_META,
  WHATIF_EFFECT_META,
} from "~/lib/coursework/labels";
import type {
  BandDelta,
  CourseworkInput,
  WhatIfResult,
} from "~/lib/coursework/types";
import { simulateWhatIf } from "~/lib/coursework/whatif";
import { cn } from "~/lib/utils";

const selectClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30";

const CUSTOM = "__custom__";

// Level implied by a catalog key (AP items → AP; the post-AP item → college-level).
function levelForKey(key: string): string {
  return key.startsWith("ap-") ? "ap" : "dual-enrollment";
}

function DeltaRow({ label, delta }: { label: string; delta: BandDelta }) {
  if (!delta.improved) return null;
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          PREPARATION_BAND_META[delta.before].badge,
        )}
      >
        {PREPARATION_BAND_META[delta.before].label}
      </span>
      <ArrowRight className="size-3.5 text-muted-foreground" />
      <span
        className={cn(
          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
          PREPARATION_BAND_META[delta.after].badge,
        )}
      >
        {PREPARATION_BAND_META[delta.after].label}
      </span>
    </div>
  );
}

// What-If simulator. Fully deterministic and client-side: it recomputes the
// coursework profile with a hypothetical course added and shows the qualitative
// change. No API call, no cost, and — deliberately — no admission-point numbers.
export function WhatIfSimulator({ base }: { base: CourseworkInput }) {
  const [selected, setSelected] = useState("");
  const [customName, setCustomName] = useState("");
  const [result, setResult] = useState<WhatIfResult | null>(null);
  const groups = checklistBySubject();

  function run() {
    let hypothetical: { name: string; type?: string } | null = null;
    if (selected === CUSTOM) {
      if (!customName.trim()) return;
      hypothetical = { name: customName.trim() };
    } else if (selected) {
      const c = COMMON_ADVANCED_COURSES.find((x) => x.key === selected);
      if (c) hypothetical = { name: c.label, type: levelForKey(c.key) };
    }
    if (!hypothetical) return;
    setResult(simulateWhatIf(base, hypothetical));
  }

  function reset() {
    setSelected("");
    setCustomName("");
    setResult(null);
  }

  const anyRigorImproved =
    result != null &&
    (result.rigor.overall.improved ||
      result.rigor.quantitative.improved ||
      result.rigor.stem.improved ||
      result.rigor.humanities.improved);

  const effectMeta = result ? WHATIF_EFFECT_META[result.primaryEffect] : null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Curious how a course would change your academic profile? Pick one and
        AppGap will show the qualitative effect — no fake "admission points,"
        just what it would strengthen, deepen, broaden, or address.
      </p>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select
          value={selected}
          onChange={(e) => {
            setSelected(e.target.value);
            setResult(null);
          }}
          className={selectClass}
        >
          <option value="">Choose a course to explore…</option>
          {groups.map((g) => (
            <optgroup key={g.subjectArea} label={g.label}>
              {g.courses.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
          <option value={CUSTOM}>Something else…</option>
        </select>
        {selected === CUSTOM && (
          <Input
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="e.g. AP Microeconomics"
            maxLength={200}
            className="sm:w-64"
          />
        )}
        <Button onClick={run} disabled={!selected} className="shrink-0">
          <FlaskConical />
          Simulate
        </Button>
        {result && (
          <Button variant="ghost" onClick={reset} className="shrink-0">
            <RotateCcw />
            Reset
          </Button>
        )}
      </div>

      {result && effectMeta && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/20 p-4">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                effectMeta.badge,
              )}
            >
              {effectMeta.label}
            </span>
            <span className="text-sm font-medium">{result.course.name}</span>
          </div>

          <p className="text-sm leading-relaxed">{result.summary}</p>

          {anyRigorImproved && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Rigor
              </p>
              <DeltaRow label="Overall" delta={result.rigor.overall} />
              <DeltaRow
                label="Quantitative"
                delta={result.rigor.quantitative}
              />
              <DeltaRow label="STEM" delta={result.rigor.stem} />
              <DeltaRow label="Humanities" delta={result.rigor.humanities} />
            </div>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {result.addsBreadth && (
              <span>
                Adds a new subject:{" "}
                {SUBJECT_AREA_LABELS[result.subjectDepth.subjectArea]}
              </span>
            )}
            {result.subjectDepth.deepened && (
              <span>
                Deepens {SUBJECT_AREA_LABELS[result.subjectDepth.subjectArea]}
              </span>
            )}
            {result.majorAlignment.relevant &&
              result.majorAlignment.areaLabel && (
                <span>
                  Field-relevant: {result.majorAlignment.areaLabel} (
                  {result.majorAlignment.importance})
                </span>
              )}
          </div>

          {result.addressedFindings.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Would improve
              </p>
              <ul className="space-y-0.5">
                {result.addressedFindings.map((f) => (
                  <li key={f.key} className="text-sm">
                    <span className="font-medium">{f.title}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      — now better prepared
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.tradeoffs.length > 0 && (
            <div className="space-y-1 rounded-lg border border-amber-500/20 bg-amber-500/[0.05] p-3">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                Worth weighing
              </p>
              {result.tradeoffs.map((t) => (
                <p
                  key={t}
                  className="text-xs leading-relaxed text-muted-foreground"
                >
                  {t}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
