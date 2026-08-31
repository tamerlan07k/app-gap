import { CheckCircle2, GraduationCap, Info } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";
import {
  fieldDataFor,
  loadApplicantStrength,
  loadCollegesWithData,
  loadFieldDataIndex,
  loadFieldKey,
  loadFinalizedAt,
  loadMatchProfile,
  loadSchoolLevelStats,
  loadUserColleges,
} from "~/lib/colleges/db";
import { evaluateCollege } from "~/lib/colleges/evaluate";
import { CATEGORY_ORDER, categoryLabel } from "~/lib/colleges/matching";
import type { CollegeMatch, MatchCategory } from "~/lib/colleges/types";
import { createClient } from "~/lib/supabase/server";
import { type AddableCollege, AddCollege } from "./add-college";
import { ClearCollegesButton } from "./clear-colleges-button";
import { CollegeCard } from "./college-card";
import { FinalizeButton, ReopenButton } from "./finalize-controls";
import { GenerateListButton } from "./generate-list-button";

const GROUP_BLURB: Record<MatchCategory, string> = {
  reach: "Ambitious — a strong application still faces long odds here.",
  target: "A realistic match given your academic profile.",
  safety: "Very likely admits based on your profile.",
  unrated: "Not enough admission data to classify yet.",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function CollegesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, strength, fieldKey, colleges, saved, finalizedAt] =
    await Promise.all([
      loadMatchProfile(supabase, user.id),
      loadApplicantStrength(supabase, user.id),
      loadFieldKey(supabase, user.id),
      loadCollegesWithData(supabase),
      loadUserColleges(supabase, user.id),
      loadFinalizedAt(supabase, user.id),
    ]);
  const [fieldIndex, schoolStats] = await Promise.all([
    loadFieldDataIndex(supabase, fieldKey),
    // B2: real school-level baselines for saved colleges with a chosen school.
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

  const { all, byId } = colleges;
  const savedSet = new Set(saved.map((s) => s.collegeId));
  const hasScores = !!(profile?.satScore || profile?.actScore);
  const finalized = finalizedAt != null;

  // Evaluate each saved college on BOTH dimensions (recomputed every load, so it
  // always reflects the current profile/field — never a stale snapshot).
  const matches: CollegeMatch[] = profile
    ? saved
        .map((s) => {
          const college = byId.get(s.collegeId);
          if (!college) return null;
          // When the student targeted a specific school AND we have a real
          // school-level stats row, use it as the baseline (B2). No fabrication:
          // absent such data, the institution-level stats stand.
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

  const grouped = new Map<MatchCategory, CollegeMatch[]>();
  for (const cat of CATEGORY_ORDER) grouped.set(cat, []);
  for (const m of matches) grouped.get(m.admission.category)?.push(m);
  for (const list of grouped.values()) {
    list.sort(
      (a, b) => (b.admission.chance ?? -1) - (a.admission.chance ?? -1),
    );
  }

  const counts = {
    safety: grouped.get("safety")?.length ?? 0,
    target: grouped.get("target")?.length ?? 0,
    reach: grouped.get("reach")?.length ?? 0,
  };
  const plannedCount = matches.filter((m) => m.selectedRoundId).length;

  const addable: AddableCollege[] = all
    .filter((c) => !savedSet.has(c.id))
    .map((c) => ({ id: c.id, name: c.name, city: c.city, state: c.state }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Colleges</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {saved.length > 0
              ? `${counts.safety} ${counts.safety === 1 ? "safety" : "safeties"} · ${counts.target} ${counts.target === 1 ? "target" : "targets"} · ${counts.reach} ${counts.reach === 1 ? "reach" : "reaches"}`
              : "Build a balanced college list matched to your profile."}
          </p>
        </div>
        {profile && saved.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {finalized ? (
              <ReopenButton />
            ) : (
              <>
                <GenerateListButton size="sm" label="Add a balanced set" />
                <FinalizeButton />
              </>
            )}
            <ClearCollegesButton count={saved.length} />
          </div>
        )}
      </div>

      {!profile ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="font-semibold">Complete your profile first</p>
          <p className="mt-1 text-sm text-muted-foreground">
            We match colleges to your academics, so finish your profile to get
            started.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link href="/dashboard/profile">Go to My Profile</Link>
          </Button>
        </div>
      ) : (
        <>
          {finalized && (
            <div className="flex items-start gap-2 rounded-xl border border-brand-teal/30 bg-brand-teal/[0.05] px-4 py-3 text-sm">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-brand-teal" />
              <p className="text-muted-foreground">
                <span className="font-medium text-foreground">
                  Finalized list
                </span>{" "}
                — {formatDate(finalizedAt)}. Pick an application plan for each
                college below ({plannedCount}/{matches.length} planned). Still
                editable — use “Edit list” to keep exploring.
              </p>
            </div>
          )}

          {!hasScores && (
            <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0" />
              <p>
                Add an SAT or ACT score in your profile for sharper safety /
                target / reach estimates. For now, admission categories are
                based on each college’s selectivity.
              </p>
            </div>
          )}

          <AddCollege colleges={addable} />

          {saved.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border py-16 text-center">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-teal/10">
                <GraduationCap className="size-7 text-brand-teal" />
              </div>
              <div>
                <p className="font-semibold">No colleges yet</p>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  Generate a balanced starter list — 3 safeties, 6 targets, and
                  4 reaches picked for your profile — or search above to add
                  colleges yourself.
                </p>
              </div>
              <GenerateListButton />
            </div>
          ) : (
            <div className="space-y-8">
              {CATEGORY_ORDER.map((cat) => {
                const list = grouped.get(cat) ?? [];
                if (list.length === 0) return null;
                return (
                  <section key={cat} className="space-y-3">
                    <div>
                      <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {categoryLabel(cat)}
                        <span className="ml-2 text-muted-foreground/70">
                          {list.length}
                        </span>
                      </h2>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {GROUP_BLURB[cat]}
                      </p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {list.map((m) => (
                        <CollegeCard
                          key={m.college.id}
                          match={m}
                          finalized={finalized}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
