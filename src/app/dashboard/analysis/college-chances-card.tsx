import { GraduationCap, Info } from "lucide-react";
import Link from "next/link";
import { ChanceReveal } from "~/components/chance-reveal";
import {
  fieldDataFor,
  loadApplicantStrength,
  loadCollegesWithData,
  loadFieldDataIndex,
  loadFieldKey,
  loadMatchProfile,
  loadSchoolLevelStats,
  loadUserColleges,
} from "~/lib/colleges/db";
import { evaluateCollege } from "~/lib/colleges/evaluate";
import type { CollegeMatch, MatchCategory } from "~/lib/colleges/types";
import { createClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";

const CATEGORY_STYLES: Record<MatchCategory, string> = {
  reach: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  target: "bg-brand-teal/10 text-brand-teal",
  safety: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unrated: "bg-muted text-muted-foreground",
};

/**
 * "Your College Chances" — a per-college AppGap estimate for each school on the
 * student's list, shown beneath the main analysis. Reuses the exact same
 * college-specific engine as My Colleges (loadMatchProfile + applicant strength
 * + assessAdmission via evaluateCollege), so estimates are consistent with the
 * Colleges page and never a renamed universal score. Each estimate is genuinely
 * college-specific: it comes from that college's own admit rate + academic band.
 *
 * Async server component — self-contained loading so the analysis page just
 * drops it in.
 */
export async function CollegeChancesCard({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [profile, strength, fieldKey, colleges, saved] = await Promise.all([
    loadMatchProfile(supabase, userId),
    loadApplicantStrength(supabase, userId),
    loadFieldKey(supabase, userId),
    loadCollegesWithData(supabase),
    loadUserColleges(supabase, userId),
  ]);
  const [fieldIndex, schoolStats] = await Promise.all([
    loadFieldDataIndex(supabase, fieldKey),
    loadSchoolLevelStats(
      supabase,
      saved
        .filter((s) => s.schoolId)
        .map((s) => ({
          collegeId: s.collegeId,
          schoolId: s.schoolId as string,
        })),
    ),
  ]);

  const { byId } = colleges;

  const matches: CollegeMatch[] = profile
    ? saved
        .map((s) => {
          const college = byId.get(s.collegeId);
          if (!college) return null;
          // B2: prefer a real school-level baseline when the student targeted a
          // specific school; otherwise the institution-level stats stand.
          const override = s.schoolId
            ? schoolStats.get(`${s.collegeId}:${s.schoolId}`)
            : undefined;
          const effectiveCollege = override
            ? { ...college, stats: override }
            : college;
          return evaluateCollege({
            profile,
            strength,
            fieldKey,
            college: effectiveCollege,
            fieldData: fieldDataFor(fieldIndex, s.collegeId, fieldKey),
            source: s.source,
            selectedRoundId: s.selectedRoundId,
            target: {
              schoolId: s.schoolId,
              programId: s.programId,
              degreeType: s.degreeType,
              intendedMajor: s.intendedMajor,
            },
          });
        })
        .filter((m): m is CollegeMatch => m !== null)
    : [];

  // Rated first (highest chance first), then unrated.
  const rated = matches
    .filter((m) => m.admission.chance != null)
    .sort((a, b) => (b.admission.chance ?? 0) - (a.admission.chance ?? 0));

  const hasScores = !!(profile?.satScore || profile?.actScore);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Your College Chances
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          AppGap&apos;s estimate for each college on your list, given your
          current profile — an estimate, not an official admission probability.
        </p>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-teal/10">
            <GraduationCap className="size-6 text-brand-teal" />
          </div>
          <div>
            <p className="font-semibold">No colleges yet</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Add the colleges you&apos;re considering to see your estimated
              chance at each.
            </p>
          </div>
          <Link
            href="/dashboard/colleges"
            className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-teal/90"
          >
            Add colleges
          </Link>
        </div>
      ) : (
        <div className="divide-y divide-border/60">
          {!hasScores && (
            <div className="flex items-start gap-2 bg-muted/40 px-6 py-3 text-xs text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" />
              <p>
                Add an SAT or ACT score to your profile for sharper, higher-
                confidence estimates.
              </p>
            </div>
          )}
          {rated.map((m) => (
            <ChanceRow key={m.college.id} match={m} />
          ))}
          {matches
            .filter((m) => m.admission.chance == null)
            .map((m) => (
              <UnratedRow key={m.college.id} match={m} />
            ))}
        </div>
      )}
    </div>
  );
}

function ChanceRow({ match }: { match: CollegeMatch }) {
  const { college, admission } = match;
  const topDrivers = admission.drivers.slice(0, 2);
  return (
    <Link
      href={`/dashboard/colleges/${college.slug}`}
      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-[3.5rem] shrink-0 text-center">
        <ChanceReveal chance={admission.chance} size="md" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{college.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
              CATEGORY_STYLES[admission.category],
            )}
          >
            {admission.displayCategory}
          </span>
          {admission.confidence && (
            <span className="text-muted-foreground">
              Confidence:{" "}
              <span className="capitalize">{admission.confidence}</span>
            </span>
          )}
          {admission.collegeAdmitRate != null && (
            <span className="text-muted-foreground">
              Overall admit rate: {Math.round(admission.collegeAdmitRate * 100)}
              %
            </span>
          )}
        </div>
        {topDrivers.length > 0 && (
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {topDrivers.map((d) => d.text).join(" · ")}
          </p>
        )}
      </div>
    </Link>
  );
}

function UnratedRow({ match }: { match: CollegeMatch }) {
  const { college } = match;
  return (
    <Link
      href={`/dashboard/colleges/${college.slug}`}
      className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-[3.5rem] shrink-0 text-center text-sm font-medium text-muted-foreground">
        —
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{college.name}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Not enough admission data to estimate a chance yet.
        </p>
      </div>
    </Link>
  );
}
