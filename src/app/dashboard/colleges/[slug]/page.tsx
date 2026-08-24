import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatChanceRange } from "~/lib/colleges/assessment";
import {
  fieldDataFor,
  loadApplicantStrength,
  loadCollegeDetailBySlug,
  loadFieldDataIndex,
  loadFieldKey,
  loadMatchProfile,
  loadStudentFitContext,
} from "~/lib/colleges/db";
import { evaluateCollege } from "~/lib/colleges/evaluate";
import { fieldLabel } from "~/lib/colleges/field-fit";
import { buildFitNarrative } from "~/lib/colleges/fit-narrative";
import type { AdmissionFit, MatchCategory } from "~/lib/colleges/types";
import { createClient } from "~/lib/supabase/server";
import { cn } from "~/lib/utils";
import { CollegeLogo } from "../college-logo";

const CATEGORY_STYLES: Record<MatchCategory, string> = {
  reach: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  target: "bg-brand-teal/10 text-brand-teal",
  safety: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  unrated: "bg-muted text-muted-foreground",
};

function pctOf(n: number): string {
  const v = n * 100;
  if (v < 1) return "<1%";
  return `${Math.round(v)}%`;
}

/** Ensure a stored bare domain (e.g. "www.mit.edu/") resolves to the real site. */
function ensureHttps(url: string): string {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

// ─── Right-side AppGap assessment panel (the most prominent element) ──────────

function AssessmentPanel({
  admission,
  officialWebsite,
}: {
  admission: AdmissionFit;
  officialWebsite: string | null;
}) {
  const range = admission.chanceRange;
  return (
    <div className="rounded-2xl border border-brand-teal/30 bg-brand-teal/[0.05] p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-teal">
        Your AppGap Assessment
      </p>
      {range ? (
        <div className="mt-2 animate-fade-up">
          {/* The RANGE is the primary figure — never replaced by the point. */}
          <p className="text-3xl font-bold tracking-tight tabular-nums">
            {formatChanceRange(range)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide",
                CATEGORY_STYLES[admission.category],
              )}
            >
              {admission.displayCategory}
            </span>
            {admission.confidence && (
              <span className="text-xs text-muted-foreground">
                Confidence:{" "}
                <span className="capitalize">{admission.confidence}</span>
              </span>
            )}
          </div>
          {admission.chance != null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Representative estimate: ~{pctOf(admission.chance)}{" "}
              <span className="text-muted-foreground/70">
                (midpoint of the range — the range above is the reliable read)
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">
          {admission.rationale}
        </p>
      )}

      {officialWebsite && (
        <a
          href={ensureHttps(officialWebsite)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground underline decoration-dotted underline-offset-2 hover:text-foreground"
        >
          Visit official website
          <ExternalLink className="size-3" />
        </a>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{children}</h2>
  );
}

function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
      {children}
    </p>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function CollegeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [profile, strength, fieldKey, college, studentCtx] = await Promise.all([
    loadMatchProfile(supabase, user.id),
    loadApplicantStrength(supabase, user.id),
    loadFieldKey(supabase, user.id),
    loadCollegeDetailBySlug(supabase, slug),
    loadStudentFitContext(supabase, user.id),
  ]);
  if (!college) notFound();

  const fieldIndex = await loadFieldDataIndex(supabase, fieldKey);
  const fieldData = fieldDataFor(fieldIndex, college.id, fieldKey);

  // The assessment is only personalized once the profile exists; without it we
  // still render the college, just without a personal estimate.
  const match = profile
    ? evaluateCollege({
        profile,
        strength,
        fieldKey,
        college,
        fieldData,
        source: "detail",
        selectedRoundId: null,
      })
    : null;

  const cp = college.profile;
  const admitRate = college.stats?.admitRate ?? null;
  const hasSpecificMajor =
    !!fieldKey && fieldKey !== "undecided" && fieldKey !== "other";
  const majorHeading = hasSpecificMajor
    ? `${fieldLabel(fieldKey)} at ${college.name}`
    : `Programs at ${college.name}`;

  // Section 3: composed from the student's REAL profile + VERIFIED college facts.
  // Only `setting` is a verified fact today; the prose facets (campus life,
  // diversity, opportunities, vibe, career) arrive with the human-verified
  // content pipeline, so they're passed as null/unverified for now.
  const fitNarrative = buildFitNarrative({
    collegeName: college.name,
    fieldFit: match?.fieldFit ?? null,
    student: profile
      ? {
          majorLabel: hasSpecificMajor ? fieldLabel(fieldKey) : null,
          careerInterest: studentCtx?.careerInterest ?? null,
          activities: studentCtx?.activities ?? [],
        }
      : null,
    facets: {
      setting: cp?.factsVerified ? cp.setting : null,
      campusLife: cp?.fitVerified ? (cp.fit?.campusLife ?? null) : null,
      diversity: cp?.fitVerified ? (cp.fit?.diversity ?? null) : null,
      opportunities: cp?.fitVerified ? (cp.fit?.opportunities ?? null) : null,
      vibe: cp?.fitVerified ? (cp.fit?.vibe ?? null) : null,
      careerFit: cp?.fitVerified ? (cp.fit?.careerFit ?? null) : null,
      verified: !!cp?.fitVerified,
    },
  });

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/colleges"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        My Colleges
      </Link>

      {/* Header: logo placeholder (monogram until official assets land) + name. */}
      <div className="flex items-center gap-4">
        <CollegeLogo
          name={college.name}
          logoAssetPath={college.logoAssetPath}
          className="size-16 rounded-2xl text-xl"
        />
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {college.name}
          </h1>
          {(college.city || college.state) && (
            <p className="mt-0.5 text-sm text-muted-foreground">
              {[college.city, college.state].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-10 lg:col-span-2">
          {/* Section 1 — School History */}
          <section className="space-y-3">
            <SectionHeading>School History</SectionHeading>
            {cp?.history && cp.historyVerified ? (
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {cp.history.split(/\n{2,}/).map((para) => (
                  <p key={para.slice(0, 32)}>{para}</p>
                ))}
              </div>
            ) : (
              <Placeholder>
                A verified history of {college.name} is being added and will
                appear here once reviewed.
              </Placeholder>
            )}
          </section>

          {/* Section 2 — Major / Program (dynamic to the student's field) */}
          <section className="space-y-3">
            <SectionHeading>{majorHeading}</SectionHeading>
            {match && fieldData.strength ? (
              <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {match.fieldFit.rationale && <p>{match.fieldFit.rationale}</p>}
                {fieldData.strength.notes && <p>{fieldData.strength.notes}</p>}
                {fieldData.resources.length > 0 && (
                  <ul className="space-y-1.5">
                    {fieldData.resources.map((r) => (
                      <li key={r.title} className="text-sm">
                        {r.url ? (
                          <a
                            href={ensureHttps(r.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-teal underline underline-offset-2 hover:text-brand-teal/80"
                          >
                            {r.title}
                          </a>
                        ) : (
                          <span className="font-medium text-foreground">
                            {r.title}
                          </span>
                        )}
                        {r.description ? ` — ${r.description}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <Placeholder>
                {fieldKey && fieldKey !== "undecided" && fieldKey !== "other"
                  ? `Verified program details for ${fieldLabel(fieldKey)} at ${college.name} haven't been added yet — we only show program strengths backed by a real source.`
                  : "Set a specific intended field in your profile to see a program-level view here."}
              </Placeholder>
            )}
          </section>

          {/* Section 3 — Why this school might fit YOU */}
          <section className="space-y-3">
            <SectionHeading>
              Why This School Might Be the Right Fit For You
            </SectionHeading>
            <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {fitNarrative.map((para, i) => (
                <p
                  key={para.slice(0, 40)}
                  className={
                    // The trailing "…coming as we add verified detail" note is
                    // rendered smaller/lighter than the grounded content.
                    i === fitNarrative.length - 1 &&
                    /verified detail/.test(para)
                      ? "text-xs text-muted-foreground/80"
                      : undefined
                  }
                >
                  {para}
                </p>
              ))}
            </div>
          </section>
        </div>

        {/* Right-side info panel */}
        <aside className="space-y-6 lg:sticky lg:top-6 lg:self-start">
          {match && (
            <AssessmentPanel
              admission={match.admission}
              officialWebsite={college.officialWebsite}
            />
          )}

          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              School information
            </p>
            <div className="divide-y divide-border/60">
              {cp?.factsVerified && cp.foundedYear != null && (
                <InfoRow label="Founded" value={String(cp.foundedYear)} />
              )}
              {cp?.factsVerified && cp.studentFacultyRatio != null && (
                <InfoRow
                  label="Student–faculty ratio"
                  value={`${cp.studentFacultyRatio}:1`}
                />
              )}
              {admitRate != null && (
                <InfoRow
                  label="Overall admit rate"
                  value={`${Math.round(admitRate * 100)}%`}
                />
              )}
            </div>
            {!(cp?.factsVerified && cp.foundedYear != null) &&
              admitRate == null && (
                <p className="text-sm text-muted-foreground">
                  Institutional details are being added.
                </p>
              )}
          </div>
        </aside>
      </div>
    </div>
  );
}
