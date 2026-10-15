"use client";

import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock,
  Compass,
  Flag,
  Gauge,
  Lock,
  RotateCcw,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "~/components/ui/button";
import type { AssessmentResult } from "~/lib/roadmap/assessment";
import type {
  FoundationState,
  FoundationStepId,
} from "~/lib/roadmap/foundation";
import { FOUNDATION_STEPS } from "~/lib/roadmap/foundation";
import type { RoadmapMilestone } from "~/lib/roadmap/types";
import { cn } from "~/lib/utils";
import { AssessmentModal } from "./assessment-modal";
import { CalendarBuildModal } from "./calendar-build-modal";
import { JourneyTree } from "./journey-tree";
import { BRANCH_META, stateLabel } from "./roadmap-graph";
import { RoadmapLoader } from "./roadmap-loader";

type Progress = { completed: number; total: number; percent: number };

type CalendarTaskLite = {
  id: string;
  title: string;
  branch: string | null;
  due_date: string;
  deadline_sensitive: boolean;
};

export type WorkspaceView = {
  entitled: boolean;
  foundation: FoundationState;
  existingMajorLabel: string | null;
  careerResult: AssessmentResult | null;
  calendarTasks: CalendarTaskLite[] | null;
  calendarConfirmed: boolean;
  calendarProvisional: boolean;
  calendarDeadlineLabel: string | null;
  diagnosticHref: string;
  diagnosticMissing: string[];
  journeyStatus: "none" | "generating" | "ready";
  milestones: RoadmapMilestone[];
  nextStepId: string | null;
  progress: Progress;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const STEP_ICON = {
  diagnostic: Gauge,
  career: Compass,
  calendar: CalendarDays,
  begin: Flag,
} as const;

export function RoadmapClient(initial: WorkspaceView) {
  const router = useRouter();
  const [view, setView] = useState<WorkspaceView>(initial);
  const [generating, setGenerating] = useState(
    initial.journeyStatus === "generating",
  );
  const [modal, setModal] = useState<null | "career" | "calendar">(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<RoadmapMilestone | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setModal(null);
    router.refresh();
  }, [router]);

  function onFoundationSelect(id: FoundationStepId) {
    setError(null);
    const status = view.foundation.steps[id];
    if (id === "diagnostic") {
      router.push(view.diagnosticHref);
    } else if (id === "career") {
      setModal("career");
    } else if (id === "calendar") {
      setModal("calendar");
    } else if (id === "begin" && status === "ready") {
      void beginJourney();
    }
  }

  async function beginJourney() {
    setGenerating(true);
    setError(null);
    try {
      let attempts = 0;
      while (attempts < 30) {
        attempts += 1;
        const res = await fetch("/api/roadmap/generate", { method: "POST" });
        const body = await res.json();
        if (res.ok && body.status === "ready") {
          router.refresh();
          return;
        }
        if (res.ok && body.status === "generating") {
          await sleep(2000);
          continue;
        }
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }
      setError("This is taking longer than expected. Please try again.");
    } catch {
      setError("Couldn't reach the server. Please check your connection.");
    } finally {
      setGenerating(false);
    }
  }

  const updateMilestone = useCallback(
    async (id: string, action: "complete" | "reopen") => {
      setSavingId(id);
      try {
        const res = await fetch("/api/roadmap/milestone", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        });
        const body = await res.json();
        if (res.ok && body.milestones) {
          setView((v) => ({
            ...v,
            milestones: body.milestones,
            nextStepId: body.nextStepId ?? null,
            progress: body.progress ?? v.progress,
          }));
          setSelected((s) =>
            s
              ? (body.milestones.find((m: RoadmapMilestone) => m.id === s.id) ??
                null)
              : null,
          );
        }
      } finally {
        setSavingId(null);
      }
    },
    [],
  );

  if (generating) return <RoadmapLoader />;

  const journeyReady = view.journeyStatus === "ready";
  const nextStep = journeyReady
    ? view.milestones.find((m) => m.id === view.nextStepId)
    : undefined;
  const allDone = journeyReady && view.progress.total > 0 && nextStep == null;

  // The current foundation action (first actionable step).
  const currentFoundationId = FOUNDATION_STEPS.find(
    (s) =>
      view.foundation.steps[s.id] === "ready" ||
      view.foundation.steps[s.id] === "attention",
  )?.id;

  return (
    <div className="space-y-6">
      <Header view={view} />

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Hero: once the journey is generated, the next milestone. Otherwise, as
          soon as the diagnostic is done the primary action is "Generate roadmap";
          before that, the current foundation step (the diagnostic). */}
      {journeyReady ? (
        allDone ? (
          <AllDoneCard />
        ) : nextStep ? (
          <NextStepCard
            milestone={nextStep}
            onOpenDetail={() => setSelected(nextStep)}
          />
        ) : null
      ) : view.foundation.readyToBegin ? (
        <FoundationHero
          stepId="begin"
          view={view}
          onAction={() => onFoundationSelect("begin")}
        />
      ) : currentFoundationId ? (
        <FoundationHero
          stepId={currentFoundationId}
          view={view}
          onAction={() => onFoundationSelect(currentFoundationId)}
        />
      ) : null}

      {/* Optional refinements, shown ONLY before generation (and only once the
          diagnostic is done). Career direction and calendar sharpen the roadmap
          but never block it — they're plain secondary actions here, not a
          roadmap graphic. */}
      {!journeyReady && view.foundation.readyToBegin && (
        <OptionalRefinements
          foundation={view.foundation}
          onSelect={onFoundationSelect}
        />
      )}

      {/* The roadmap graphic is the PRODUCT of generation — never shown before.
          Until "Generate roadmap" is clicked there is no roadmap to draw, so the
          page stays on the hero (and its optional refinements). The branching
          journey tree appears only once the roadmap is ready. */}
      {journeyReady && (
        <JourneyTree
          foundation={view.foundation}
          journeyStarted
          milestones={view.milestones}
          onFoundationSelect={onFoundationSelect}
          onMilestoneSelect={setSelected}
        />
      )}

      {modal === "career" && (
        <AssessmentModal
          existingMajorLabel={
            view.foundation.careerCanConfirmExisting
              ? view.existingMajorLabel
              : null
          }
          initialResult={view.careerResult}
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}
      {modal === "calendar" && (
        <CalendarBuildModal
          initialTasks={view.calendarTasks}
          initialConfirmed={view.calendarConfirmed}
          initialProvisional={view.calendarProvisional}
          initialDeadlineLabel={view.calendarDeadlineLabel}
          onClose={() => setModal(null)}
          onDone={refresh}
        />
      )}

      {selected && journeyReady && (
        <MilestoneDetail
          milestone={selected}
          saving={savingId === selected.id}
          onClose={() => setSelected(null)}
          onComplete={() => updateMilestone(selected.id, "complete")}
          onReopen={() => updateMilestone(selected.id, "reopen")}
        />
      )}
    </div>
  );
}

function Header({ view }: { view: WorkspaceView }) {
  const showProgress =
    view.journeyStatus === "ready" && view.progress.total > 0;
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One connected journey — set your foundation, then work through your
          personalized application plan.
        </p>
      </div>
      {showProgress && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {view.progress.completed} of {view.progress.total} milestones
              complete
            </span>
            <span className="font-medium tabular-nums">
              {view.progress.percent}%
            </span>
          </div>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={view.progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Roadmap progress"
          >
            <div
              className="h-full rounded-full bg-brand-teal transition-all"
              style={{ width: `${view.progress.percent}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function FoundationHero({
  stepId,
  view,
  onAction,
}: {
  stepId: FoundationStepId;
  view: WorkspaceView;
  onAction: () => void;
}) {
  const step = FOUNDATION_STEPS.find((s) => s.id === stepId);
  if (!step) return null;
  const Icon = STEP_ICON[stepId];
  const status = view.foundation.steps[stepId];
  const attention = status === "attention";

  return (
    <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] p-5 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-teal">
        <Icon className="size-4" aria-hidden />
        {stepId === "begin" ? "Ready to begin" : "Next: foundation"}
      </div>
      <h2 className="mt-2 text-lg font-semibold">{step.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>

      {attention && view.diagnosticMissing.length > 0 && (
        <div className="mt-3 rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          Before running your diagnostic, add:{" "}
          {view.diagnosticMissing.join(", ")}.
        </div>
      )}

      <div className="mt-4">
        <Button onClick={onAction}>
          {step.actionLabel}
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

function OptionalRefinements({
  foundation,
  onSelect,
}: {
  foundation: FoundationState;
  onSelect: (id: FoundationStepId) => void;
}) {
  const optional: FoundationStepId[] = ["career", "calendar"];
  const pending = optional.filter((id) => foundation.steps[id] !== "complete");
  if (pending.length === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">
        Optional — sharpen your roadmap before generating:
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {pending.map((id) => {
          const step = FOUNDATION_STEPS.find((s) => s.id === id);
          if (!step) return null;
          const Icon = STEP_ICON[id];
          return (
            <Button
              key={id}
              variant="outline"
              size="sm"
              onClick={() => onSelect(id)}
            >
              <Icon />
              {step.actionLabel}
            </Button>
          );
        })}
      </div>
    </div>
  );
}

function NextStepCard({
  milestone,
  onOpenDetail,
}: {
  milestone: RoadmapMilestone;
  onOpenDetail: () => void;
}) {
  const { cssVar, label } = BRANCH_META[milestone.branch];
  return (
    <div
      className="rounded-2xl border bg-card p-5 shadow-sm"
      style={{ borderColor: cssVar }}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <span
          className="rounded-full px-2 py-0.5 text-white"
          style={{ backgroundColor: cssVar }}
        >
          Next step
        </span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <h2 className="mt-2 text-lg font-semibold">{milestone.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {milestone.note || milestone.why}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild>
          <Link href={milestone.href}>
            {milestone.actionLabel}
            <ArrowRight />
          </Link>
        </Button>
        <Button variant="outline" onClick={onOpenDetail}>
          View details
        </Button>
      </div>
    </div>
  );
}

function AllDoneCard() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.04] px-6 py-10 text-center">
      <CheckCircle2 className="size-8 text-brand-teal" />
      <div>
        <p className="text-base font-semibold">You've completed your roadmap</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Every milestone is done. Revisit any step below — your roadmap stays
          saved and keeps adapting as your profile changes.
        </p>
      </div>
    </div>
  );
}

function MilestoneDetail({
  milestone,
  saving,
  onClose,
  onComplete,
  onReopen,
}: {
  milestone: RoadmapMilestone;
  saving: boolean;
  onClose: () => void;
  onComplete: () => void;
  onReopen: () => void;
}) {
  const { cssVar, label, Icon } = BRANCH_META[milestone.branch];
  const isComplete = milestone.state === "complete";
  const isLocked = milestone.state === "locked";

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={milestone.title}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-card p-6 shadow-xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Icon className="size-4" style={{ color: cssVar }} aria-hidden />
            <span
              className="text-xs font-semibold uppercase tracking-wide"
              style={{ color: cssVar }}
            >
              {label}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <h2 className="mt-2 text-xl font-semibold">{milestone.title}</h2>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium",
              isComplete
                ? "bg-brand-teal/10 text-brand-teal"
                : "bg-muted text-muted-foreground",
            )}
          >
            {isComplete && <CheckCircle2 className="size-3" />}
            {isLocked && <Lock className="size-3" />}
            {stateLabel(milestone.state)}
          </span>
          {milestone.deadlineSensitive && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
              <Clock className="size-3" />
              Time-sensitive
            </span>
          )}
          <span className="rounded-full bg-muted px-2 py-0.5 font-medium capitalize text-muted-foreground">
            {milestone.importance}
          </span>
        </div>

        <p className="mt-4 text-sm text-foreground">{milestone.description}</p>

        <div className="mt-4 space-y-3 text-sm">
          <div>
            <p className="font-semibold">Why this matters</p>
            <p className="mt-0.5 text-muted-foreground">{milestone.why}</p>
          </div>
          {milestone.note && (
            <div>
              <p className="font-semibold">For you</p>
              <p className="mt-0.5 text-muted-foreground">{milestone.note}</p>
            </div>
          )}
          <div>
            <p className="font-semibold">Completion</p>
            <p className="mt-0.5 text-muted-foreground">
              {milestone.completionCriteria}
            </p>
          </div>
        </div>

        {isLocked && (
          <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
            Finish the earlier step in this branch to unlock this milestone.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-2">
          <Button asChild>
            <Link href={milestone.href}>
              {milestone.actionLabel}
              <ArrowRight />
            </Link>
          </Button>
          {isComplete ? (
            <Button variant="outline" onClick={onReopen} disabled={saving}>
              <RotateCcw />
              Mark as not done
            </Button>
          ) : (
            <Button variant="outline" onClick={onComplete} disabled={saving}>
              <CheckCircle2 />
              Mark complete
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
