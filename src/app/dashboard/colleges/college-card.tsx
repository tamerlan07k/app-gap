import {
  BadgeCheck,
  Check,
  CircleHelp,
  ExternalLink,
  Info,
  TriangleAlert,
} from "lucide-react";
import Link from "next/link";
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

/** Scorecard sometimes stores a bare domain (e.g. "www.columbia.edu"); ensure a
 * protocol so the link resolves to the official site, not a relative path. */
function ensureHttps(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

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
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-brand-teal/40 hover:shadow-md">
      {/* Stretched link makes the whole card navigate to the college page, while
          interactive children below (remove, website, plan) sit above it via
          `relative z-10` so their own clicks still work. */}
      <Link
        href={`/dashboard/colleges/${college.slug}`}
        aria-label={`View ${college.name}`}
        className="absolute inset-0"
      />
      <div className="flex items-start gap-4 p-5">
        <CollegeLogo
          name={college.name}
          logoAssetPath={college.logoAssetPath}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-semibold">{college.name}</p>
              {/* The student's OWN AppGap estimate — placed directly under the
                  name and made deliberately more prominent than the school's
                  overall admit rate below. The subtle fade-up is AppGap's
                  existing score-reveal motion (respects reduced-motion). */}
              {admission.chanceRange && (
                <p className="mt-0.5 animate-fade-up text-sm font-medium">
                  <span className="text-muted-foreground">
                    Estimated chance:{" "}
                  </span>
                  <span className="font-semibold text-brand-teal">
                    {formatChanceRange(admission.chanceRange)}
                  </span>
                </p>
              )}
              {(college.city || college.state) && (
                <p className="truncate text-xs text-muted-foreground">
                  {[college.city, college.state].filter(Boolean).join(", ")}
                </p>
              )}
            </div>
            <div className="relative z-10">
              <RemoveButton collegeId={college.id} collegeName={college.name} />
            </div>
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

          {/* The AppGap estimate itself is shown prominently under the name
              above. Here we keep the supporting context: confidence (how sure
              AppGap is) and the school's OWN overall admit rate — kept distinct
              from, and less prominent than, the student's estimate. */}
          {admission.chanceRange ? (
            <div className="mt-2 space-y-1.5">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-xs">
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

          {/* Small, unobtrusive transparency link to the school's official site
              (reuses the stored, verified colleges.official_website). */}
          {college.officialWebsite && (
            <a
              href={ensureHttps(college.officialWebsite)}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
            >
              Visit official website
              <ExternalLink className="size-3" />
            </a>
          )}
        </div>
      </div>

      <div className="relative z-10 border-t border-border/60 bg-muted/30 px-5 py-4">
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
