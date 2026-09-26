"use client";

import { Award, Plus, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import type { RecognitionAnalysis } from "~/lib/ai/awards-schema";
import { THEME_BLURBS, THEME_LABELS } from "~/lib/awards/themes";
import type {
  AwardRecord,
  RecognitionProfile,
  ThemeCoverage,
} from "~/lib/awards/types";
import { cn } from "~/lib/utils";
import { AwardForm } from "./award-form";
import { AwardItem } from "./award-item";

const STRENGTH_META: Record<
  ThemeCoverage["strength"],
  { label: string; badge: string }
> = {
  strong: { label: "Strong", badge: "bg-brand-teal/10 text-brand-teal" },
  present: {
    label: "Present",
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  emerging: {
    label: "Emerging",
    badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  },
  none: { label: "—", badge: "bg-muted text-muted-foreground" },
};

function BandCard({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {label}
        </p>
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

export function RecognitionMap({
  awards,
  recognition,
  analysis,
}: {
  awards: AwardRecord[];
  recognition: RecognitionProfile;
  analysis: RecognitionAnalysis | null;
}) {
  const [adding, setAdding] = useState(false);

  const noteById = useMemo(() => {
    const map = new Map<string, RecognitionAnalysis["awardNotes"][number]>();
    for (const n of analysis?.awardNotes ?? []) map.set(n.awardId, n);
    return map;
  }, [analysis]);

  const collective = analysis?.collective ?? null;
  // Prefer the AI's phrasing of gaps; fall back to the deterministic gaps so the
  // section is meaningful even before an analysis is run.
  const aiGaps = analysis?.recognitionGaps ?? [];

  return (
    <section className="space-y-6">
      {/* What your recognition currently demonstrates */}
      <BandCard label="What your recognition demonstrates">
        {collective ? (
          <>
            <p className="text-lg font-semibold leading-snug">
              {collective.headline}
            </p>
            <p className="text-sm leading-relaxed">{collective.summary}</p>
            {collective.demonstrates.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {collective.demonstrates.map((d) => (
                  <span
                    key={d}
                    className="inline-flex items-center gap-1.5 rounded-full bg-brand-teal/10 px-2.5 py-1 text-xs font-medium text-brand-teal"
                  >
                    {d}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Add your awards below, then run the analysis to see what your
            recognition demonstrates as a whole — the recurring themes and
            strengths an admissions reader would notice.
          </p>
        )}

        {/* Deterministic theme coverage (always available) */}
        {recognition.demonstrated.length > 0 && (
          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Recognized themes
            </p>
            <div className="flex flex-wrap gap-2">
              {recognition.demonstrated.map((d) => (
                <span
                  key={d.theme}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                    STRENGTH_META[d.strength].badge,
                  )}
                  title={THEME_BLURBS[d.theme]}
                >
                  {THEME_LABELS[d.theme]}
                  <span className="opacity-70">
                    {STRENGTH_META[d.strength].label}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </BandCard>

      {/* Recognition gaps */}
      {(aiGaps.length > 0 || recognition.gaps.length > 0) && (
        <BandCard label="Recognition gaps">
          <p className="text-sm text-muted-foreground">
            Themes your intended field typically values that your{" "}
            <span className="font-medium text-foreground">awards</span> don't
            cover yet. These are opportunities, not shortcomings — and where the
            Opportunity Finder focuses.
          </p>
          {aiGaps.length > 0 ? (
            <ul className="space-y-3">
              {aiGaps.map((g) => (
                <li key={g.area} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" />
                  <p className="text-sm leading-relaxed">
                    <span className="font-semibold">{g.area}. </span>
                    <span className="text-muted-foreground">{g.why}</span>
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-wrap gap-2">
              {recognition.gaps.map((g) => (
                <span
                  key={g.theme}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-600 dark:text-amber-400"
                >
                  {THEME_LABELS[g.theme]}
                  {g.isIntendedField && (
                    <span className="opacity-70">· your field</span>
                  )}
                </span>
              ))}
            </div>
          )}
        </BandCard>
      )}

      {/* My awards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            My awards
            <span className="ml-2 text-muted-foreground/70">
              {awards.length}
            </span>
          </h3>
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus />
              Add award
            </Button>
          )}
        </div>

        {adding && (
          <AwardForm
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}

        {awards.length > 0 ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {awards.map((a) => (
              <AwardItem
                key={a.id}
                award={a}
                note={noteById.get(a.id) ?? null}
              />
            ))}
          </div>
        ) : (
          !adding && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
                <Award className="size-7 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold">No awards yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Awards you entered in your profile appear here automatically.
                  If any are missing, add them — with the organization, scope,
                  and what you actually did — to sharpen your Recognition Map
                  and opportunity suggestions.
                </p>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus />
                Add your first award
              </Button>
            </div>
          )
        )}
      </div>

      {/* Bottom line */}
      {analysis?.bottomLine && (
        <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-5 py-4">
          <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-teal" />
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Bottom line: </span>
            {analysis.bottomLine}
          </p>
        </div>
      )}
    </section>
  );
}
