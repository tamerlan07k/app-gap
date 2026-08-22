import {
  BadgeCheck,
  Check,
  CircleHelp,
  Info,
  TriangleAlert,
} from "lucide-react";
import { formatChanceRange } from "~/lib/colleges/assessment";
import { fieldRatingLabel } from "~/lib/colleges/field-fit";
import type {
  AdmissionDriver,
  ApplicationRound,
  CollegeMatch,
  Confidence,
  FieldRating,
  MatchCategory,
} from "~/lib/colleges/types";
import { cn } from "~/lib/utils";
import { CollegeLogo } from "./college-logo";
import { PlanSelector } from "./plan-selector";
import { RemoveButton } from "./remove-button";
import { formatDeadline, roundLabel } from "./round-format";

const CATEGORY_STYLES: Record<MatchCategory, string> = {
  reach: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  target: "bg-brand-teal/10 text-brand-teal",
  safety: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unrated: "bg-muted text-muted-foreground",
};

const FIELD_STYLES: Record<FieldRating, string> = {
  excellent: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  strong: "bg-brand-teal/10 text-brand-teal",
  moderate: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  limited: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  unknown: "bg-muted text-muted-foreground",
  not_applicable: "bg-muted text-muted-foreground",
};

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

function DriverRow({ driver }: { driver: AdmissionDriver }) {
  const Icon =
    driver.kind === "positive"
      ? Check
      : driver.kind === "caution"
        ? TriangleAlert
        : Info;
  const color =
    driver.kind === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : driver.kind === "caution"
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground";
  return (
    <li className="flex items-start gap-1.5 text-xs text-muted-foreground">
      <Icon className={cn("mt-0.5 size-3 shrink-0", color)} />
      <span>{driver.text}</span>
    </li>
  );
}

function RoundRow({ round }: { round: ApplicationRound }) {
  const deadline = formatDeadline(round.deadlineDate);
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border/70 px-3 py-2">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium">
            {roundLabel(round.roundType, round.name)}
          </span>
          {round.isBinding && (
            <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">
              Binding
            </span>
          )}
          {round.isRestrictive && (
            <span className="rounded bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-600 dark:text-violet-400">
              Restrictive
            </span>
          )}
          {round.isRolling && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Rolling
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {deadline ? `Deadline ${deadline}` : "Deadline pending"}
        </p>
      </div>
      {round.verified ? (
        <span
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400"
          title="Confirmed against the official admissions site"
        >
          <BadgeCheck className="size-3.5" />
          Verified
        </span>
      ) : (
        <span
          className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground"
          title="Not yet confirmed against the official source — treat as tentative"
        >
          <CircleHelp className="size-3.5" />
          Pending
        </span>
      )}
    </div>
  );
}

export function CollegeCard({
  match,
  finalized,
}: {
  match: CollegeMatch;
  finalized: boolean;
}) {
  const { college, admission, fieldFit, selectedRoundId } = match;
  const rounds = college.cycle?.rounds ?? [];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-start gap-4 p-5">
        <CollegeLogo
          name={college.name}
          logoAssetPath={college.logoAssetPath}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{college.name}</p>
              {(college.city || college.state) && (
                <p className="truncate text-xs text-muted-foreground">
                  {[college.city, college.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <RemoveButton collegeId={college.id} collegeName={college.name} />
          </div>

          {/* Two independent dimensions: admission fit + field fit. */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                CATEGORY_STYLES[admission.category],
              )}
            >
              {admission.displayCategory}
            </span>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                FIELD_STYLES[fieldFit.rating],
              )}
            >
              {fieldRatingLabel(fieldFit.rating)}
            </span>
          </div>

          {/* Admission: a bounded range + confidence + overall admit rate — never
              a lone precise percentage. */}
          {admission.chanceRange ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
                <span>
                  <span className="font-medium text-foreground/70">
                    Estimated range:
                  </span>{" "}
                  <span className="font-semibold text-foreground">
                    {formatChanceRange(admission.chanceRange)}
                  </span>
                </span>
                {admission.confidence && (
                  <span className="text-muted-foreground">
                    Confidence: {CONFIDENCE_LABEL[admission.confidence]}
                  </span>
                )}
                {admission.collegeAdmitRate != null && (
                  <span className="text-muted-foreground">
                    Overall admit rate:{" "}
                    {Math.round(admission.collegeAdmitRate * 100)}%
                  </span>
                )}
              </div>
              {admission.drivers.length > 0 && (
                <ul className="space-y-0.5">
                  {admission.drivers.map((d) => (
                    <DriverRow key={d.text} driver={d} />
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="mt-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">Admission:</span>{" "}
              {admission.rationale}
            </p>
          )}

          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/70">Field:</span>{" "}
            {fieldFit.rationale}
          </p>
        </div>
      </div>

      <div className="border-t border-border/60 bg-muted/30 px-5 py-4">
        {finalized ? (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Application plan
            </p>
            <PlanSelector
              collegeId={college.id}
              rounds={rounds}
              selectedRoundId={selectedRoundId}
            />
          </>
        ) : (
          <>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Application options ({college.cycle?.cycleYear ?? "current cycle"}
              )
            </p>
            {rounds.length > 0 ? (
              <div className="space-y-2">
                {rounds.map((r) => (
                  <RoundRow key={r.id} round={r} />
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Application rounds for this cycle aren’t available yet.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
