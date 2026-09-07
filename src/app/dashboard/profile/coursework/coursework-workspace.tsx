"use client";

import {
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import type { CourseworkAnalysis } from "~/lib/ai/coursework-schema";
import {
  FINDING_STATUS_META,
  PREPARATION_BAND_META,
  TRAJECTORY_META,
} from "~/lib/coursework/labels";
import type {
  AvailabilityMap,
  CourseworkInput,
  CourseworkProfile,
  Finding,
  FindingStatus,
} from "~/lib/coursework/types";
import { cn } from "~/lib/utils";
import { AvailabilityChecklist } from "./availability-checklist";
import { CourseForm, type EditableCourse } from "./course-form";
import { CourseItem } from "./course-item";
import { FindingCard } from "./finding-card";
import { TargetFitCard } from "./target-fit-card";
import { WhatIfSimulator } from "./whatif-simulator";

const STATUS_ORDER: FindingStatus[] = [
  "strength",
  "developing",
  "opportunity",
  "potential-gap",
  "unavailable",
  "unknown",
];
const IMPORTANCE_ORDER: Record<Finding["importance"], number> = {
  core: 0,
  recommended: 1,
  supporting: 2,
};

function SectionHeader({ title, count }: { title: string; count?: number }) {
  return (
    <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {title}
      {count != null && (
        <span className="ml-2 text-muted-foreground/70">{count}</span>
      )}
    </h2>
  );
}

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

function Chip({ label, tone }: { label: string; tone: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function CourseworkWorkspace({
  courses,
  cw,
  availability,
  fieldLabel,
  hasField,
  initialAnalysis,
  initialAnalyzedAt,
}: {
  courses: EditableCourse[];
  cw: CourseworkProfile;
  availability: AvailabilityMap;
  fieldLabel: string;
  hasField: boolean;
  initialAnalysis: CourseworkAnalysis | null;
  initialAnalyzedAt: string | null;
}) {
  const [analysis, setAnalysis] = useState<CourseworkAnalysis | null>(
    initialAnalysis,
  );
  const [analyzedAt, setAnalyzedAt] = useState<string | null>(
    initialAnalyzedAt,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const noteByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const n of analysis?.findingNotes ?? []) map.set(n.key, n.note);
    return map;
  }, [analysis]);

  const orderedFindings = useMemo(
    () =>
      [...cw.findings].sort(
        (a, b) =>
          STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
          IMPORTANCE_ORDER[a.importance] - IMPORTANCE_ORDER[b.importance],
      ),
    [cw.findings],
  );

  // Base input for the deterministic What-If simulator (runs fully client-side).
  const baseInput: CourseworkInput = useMemo(
    () => ({
      courses: courses.map((c) => ({
        name: c.name,
        type: c.type,
        status: c.status,
        gradeLevel: c.gradeLevel,
        apExamScore: c.apExamScore,
      })),
      gradeLevel: "",
      fieldKey: cw.fieldKey,
      academicMajor: "",
      academicInterests: [],
      availability,
      target: cw.target,
    }),
    [courses, cw.fieldKey, cw.target, availability],
  );

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze-coursework", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to analyze your coursework.");
        return;
      }
      setAnalysis(data.analysis as CourseworkAnalysis);
      setAnalyzedAt(new Date().toISOString());
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const hasCourses = courses.length > 0;
  const analyzedDate = analyzedAt
    ? new Date(analyzedAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const s = cw.summary;
  const summaryChips: Array<{ label: string; status: FindingStatus }> = [
    { label: `${s.strengths} strengths`, status: "strength" },
    { label: `${s.opportunities} opportunities`, status: "opportunity" },
    { label: `${s.developing} developing`, status: "developing" },
    { label: `${s.potentialGaps} potential gaps`, status: "potential-gap" },
    {
      label: `${s.unavailable + s.unknown} in context`,
      status: "unavailable",
    },
  ];
  const r = cw.rigor;
  const traj = TRAJECTORY_META[r.trajectory];

  return (
    <section className="space-y-6">
      {/* Intro + action */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Coursework
          </p>
        </div>
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
              <GraduationCap className="size-5 text-brand-teal" />
            </div>
            <div className="space-y-1">
              <h2 className="font-semibold tracking-tight">
                What does your academic path say about you?
              </h2>
              <p className="text-sm leading-relaxed text-muted-foreground">
                AppGap reads your coursework the way an admissions reader might
                — your rigor, your preparation for {fieldLabel}, and where your
                genuine opportunities are. It weighs what your school actually
                offers, so a course you couldn't take is never counted against
                you. This is academic analysis, not an admissions score.
              </p>
              {analyzedDate && (
                <p className="text-xs text-muted-foreground">
                  Last analyzed {analyzedDate}. Refresh after editing your
                  courses or school context.
                </p>
              )}
            </div>
          </div>
          <Button
            onClick={runAnalysis}
            disabled={loading}
            variant={analysis ? "outline" : "default"}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : analysis ? (
              <RefreshCw />
            ) : (
              <Sparkles />
            )}
            {analysis ? "Refresh analysis" : "Analyze my coursework"}
          </Button>
        </div>
        {error && (
          <div className="border-t border-border px-6 py-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </div>

      {/* Five-state summary strip */}
      {cw.findings.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3">
          {summaryChips.map((c) => (
            <span
              key={c.status}
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  FINDING_STATUS_META[c.status].dot,
                )}
              />
              {c.label}
            </span>
          ))}
        </div>
      )}

      {/* My Courses */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <SectionHeader title="My courses" count={courses.length} />
          {!adding && (
            <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
              <Plus />
              Add course
            </Button>
          )}
        </div>

        {adding && (
          <CourseForm
            onSaved={() => setAdding(false)}
            onCancel={() => setAdding(false)}
          />
        )}

        {hasCourses ? (
          <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            {courses.map((c) => (
              <CourseItem key={c.id} course={c} />
            ))}
          </div>
        ) : (
          !adding && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
                <GraduationCap className="size-7 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold">Add your courses to begin</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  List your current, completed, and planned courses — including
                  AP, IB, honors, and dual-enrollment. The more complete this
                  is, the more your analysis reflects your real academic path.
                </p>
              </div>
              <Button size="sm" onClick={() => setAdding(true)}>
                <Plus />
                Add your first course
              </Button>
            </div>
          )
        )}
      </div>

      {/* Academic Path (AI narrative) */}
      {analysis && (
        <BandCard label="What your academic path says">
          <p className="text-lg font-semibold leading-snug">
            {analysis.academicPath.headline}
          </p>
          <p className="text-sm leading-relaxed">
            {analysis.academicPath.summary}
          </p>
          {analysis.academicPath.communicates.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {analysis.academicPath.communicates.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  tone="bg-brand-teal/10 text-brand-teal"
                />
              ))}
            </div>
          )}
        </BandCard>
      )}

      {/* Rigor Analysis (deterministic + AI prose) */}
      <BandCard label="Academic rigor">
        <div className="flex flex-wrap gap-2">
          <Chip
            label={`Overall: ${PREPARATION_BAND_META[r.overallChallenge].label}`}
            tone={PREPARATION_BAND_META[r.overallChallenge].badge}
          />
          <Chip
            label={`Quantitative: ${PREPARATION_BAND_META[r.quantitativePrep].label}`}
            tone={PREPARATION_BAND_META[r.quantitativePrep].badge}
          />
          <Chip
            label={`STEM: ${PREPARATION_BAND_META[r.stemPrep].label}`}
            tone={PREPARATION_BAND_META[r.stemPrep].badge}
          />
          <Chip
            label={`Humanities: ${PREPARATION_BAND_META[r.humanitiesPrep].label}`}
            tone={PREPARATION_BAND_META[r.humanitiesPrep].badge}
          />
        </div>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <TrendingUp className="size-4 shrink-0 text-brand-teal" />
          <span>
            <span className="font-medium text-foreground">{traj.label}</span> ·{" "}
            {traj.blurb}
          </span>
        </p>
        {(r.advancedCount > 0 || r.honorsCount > 0) && (
          <p className="text-sm text-muted-foreground">
            {r.advancedCount} college-level course
            {r.advancedCount === 1 ? "" : "s"} (AP {r.apCount}, IB {r.ibCount},
            dual-enrollment {r.dualEnrollmentCount}) · {r.honorsCount} honors.
          </p>
        )}
        {analysis?.rigorInterpretation && (
          <p className="text-sm leading-relaxed">
            {analysis.rigorInterpretation}
          </p>
        )}
      </BandCard>

      {/* Major Preparation + findings (Why this matters lives on each card) */}
      <BandCard label={`Preparation for ${fieldLabel}`}>
        {analysis?.majorPreparationSummary && (
          <p className="text-sm leading-relaxed">
            {analysis.majorPreparationSummary}
          </p>
        )}
        {!hasField && (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            You haven't set an intended field yet, so this uses a broad,
            keep-your-options-open set of preparation areas. Set your academic
            direction in Career Direction for a field-specific read.
          </p>
        )}
        <div className="grid gap-3 md:grid-cols-2">
          {orderedFindings.map((f) => (
            <FindingCard key={f.key} finding={f} note={noteByKey.get(f.key)} />
          ))}
        </div>
      </BandCard>

      {/* School Opportunity Context */}
      <BandCard label="School opportunity context">
        <AvailabilityChecklist initial={availability} />
      </BandCard>

      {/* Target Program Fit — verified field strength + scoped requirements */}
      <BandCard label="Target program fit">
        <TargetFitCard target={cw.target} fieldLabel={fieldLabel} />
      </BandCard>

      {/* What-If simulator (deterministic, client-side) */}
      <BandCard label="What-if analysis">
        <WhatIfSimulator base={baseInput} />
      </BandCard>

      {/* Bottom line */}
      {analysis?.bottomLine && (
        <div className="rounded-xl border border-border bg-muted/30 px-5 py-4">
          <p className="text-sm leading-relaxed">
            <span className="font-semibold">Bottom line: </span>
            {analysis.bottomLine}
          </p>
        </div>
      )}
    </section>
  );
}
