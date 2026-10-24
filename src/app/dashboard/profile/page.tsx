import { ArrowRight, Pencil } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { majorLabel, specializationLabel } from "~/lib/academic-interests";
import { type Analysis, analysisSchema } from "~/lib/ai/schema";
import {
  ACTIVITY_CATEGORY_LABELS,
  AWARD_LEVEL_LABELS,
  COURSE_TYPE_LABELS,
  GRADE_LABELS,
  labelFor,
  MAJOR_LABELS,
  SCHOOL_TYPE_LABELS,
} from "~/lib/profile-labels";
import { describeScoreChange } from "~/lib/score-delta";
import { createClient } from "~/lib/supabase/server";
import { ScoreSummary } from "./score-summary";

// ─── Presentational helpers ──────────────────────────────────────────────────

function ProfileCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {title}
        </p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function InfoGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map((row) => (
        <div key={row.label}>
          <dt className="text-xs text-muted-foreground">{row.label}</dt>
          <dd className="mt-0.5 text-sm font-medium">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NoAnalysisCard() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-6 text-center">
      <p className="text-sm font-medium">No analysis yet</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Generate your AppGap Analysis to see your score here.
      </p>
      <Button size="sm" asChild className="mt-4">
        <Link href="/profile/review">
          Generate analysis
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function ProfileOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileRes, coursesRes, activitiesRes, awardsRes, analysisRes] =
    await Promise.all([
      supabase
        .from("profiles")
        // select("*") so the page tolerates envs where the newer academic-
        // direction columns aren't migrated yet (missing columns are simply
        // undefined rather than erroring the whole query).
        .select("*")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("courses")
        .select("id, name, type, grade_level")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("activities")
        .select("id, name, category, leadership_role")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("awards")
        .select("id, name, level, grade")
        .eq("user_id", user.id)
        .order("sort_order"),
      // Latest two analyses: the most recent drives the displayed score; the one
      // before it is the "previous score" used for the post-edit delta + reveal.
      supabase
        .from("ai_analyses")
        .select("id, analysis, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2),
    ]);

  const profile = profileRes.data;
  const courses = coursesRes.data ?? [];
  const activities = activitiesRes.data ?? [];
  const awards = awardsRes.data ?? [];

  const analysisRows = (analysisRes.data ?? []) as {
    id: string;
    analysis: unknown;
  }[];

  let analysis: Analysis | null = null;
  let analysisId: string | null = null;
  if (analysisRows[0]) {
    const parsed = analysisSchema.safeParse(analysisRows[0].analysis);
    if (parsed.success) {
      analysis = parsed.data;
      analysisId = analysisRows[0].id;
    }
  }

  // Previous analysis (for the score-change delta + "what changed" line). Parsed
  // defensively — a legacy/invalid prior row simply means "no previous score".
  let previousAnalysis: Analysis | null = null;
  if (analysisRows[1]) {
    const parsedPrev = analysisSchema.safeParse(analysisRows[1].analysis);
    if (parsedPrev.success) previousAnalysis = parsedPrev.data;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href="/dashboard/profile/edit">
            <Pencil />
            Edit Profile
          </Link>
        </Button>
      </div>

      {analysis && analysisId ? (
        <ScoreSummary
          analysis={analysis}
          analysisId={analysisId}
          previousScore={previousAnalysis?.gapScore ?? null}
          changeText={describeScoreChange(previousAnalysis, analysis)}
        />
      ) : (
        <NoAnalysisCard />
      )}

      <ProfileCard title="Academic Profile">
        <InfoGrid
          rows={[
            {
              label: "Grade level",
              value: labelFor(GRADE_LABELS, profile?.grade_level),
            },
            {
              label: "Unweighted GPA",
              value:
                profile?.unweighted_gpa != null
                  ? `${profile.unweighted_gpa} / 4.0`
                  : "—",
            },
            {
              label: "SAT",
              value:
                profile?.sat_score != null ? String(profile.sat_score) : "—",
            },
            {
              label: "ACT",
              value:
                profile?.act_score != null ? String(profile.act_score) : "—",
            },
            {
              label: "School type",
              value: labelFor(SCHOOL_TYPE_LABELS, profile?.school_type),
            },
          ]}
        />
      </ProfileCard>

      <ProfileCard title="Career Direction">
        <InfoGrid
          rows={[
            {
              label: "Intended major",
              value: profile?.academic_major
                ? majorLabel(profile.academic_major)
                : labelFor(MAJOR_LABELS, profile?.major_category),
            },
            ...(profile?.academic_interests &&
            (profile.academic_interests as string[]).length > 0
              ? [
                  {
                    label: "Specializations",
                    value: (profile.academic_interests as string[])
                      .map((k) =>
                        specializationLabel(profile.academic_major, k),
                      )
                      .join(", "),
                  },
                ]
              : []),
            { label: "Specific major", value: profile?.specific_major || "—" },
            {
              label: "Career interest",
              value: profile?.career_interest || "—",
            },
          ]}
        />
      </ProfileCard>

      <ProfileCard title={`Coursework · ${courses.length}`}>
        {courses.length > 0 ? (
          <ul className="space-y-2">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium">
                  {course.name || "Untitled course"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {labelFor(COURSE_TYPE_LABELS, course.type)}
                  {course.grade_level ? ` · Grade ${course.grade_level}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No courses added.</p>
        )}
      </ProfileCard>

      <ProfileCard title={`Activities · ${activities.length}`}>
        {activities.length > 0 ? (
          <ul className="space-y-3">
            {activities.map((activity) => (
              <li key={activity.id} className="text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">
                    {activity.name || "Untitled activity"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {labelFor(ACTIVITY_CATEGORY_LABELS, activity.category)}
                  </span>
                </div>
                {activity.leadership_role ? (
                  <p className="text-xs text-muted-foreground">
                    {activity.leadership_role}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activities added.</p>
        )}
      </ProfileCard>

      <ProfileCard title={`Awards · ${awards.length}`}>
        {awards.length > 0 ? (
          <ul className="space-y-2">
            {awards.map((award) => (
              <li
                key={award.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium">
                  {award.name || "Untitled award"}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {labelFor(AWARD_LEVEL_LABELS, award.level)}
                  {award.grade ? ` · Grade ${award.grade}` : ""}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No awards added.</p>
        )}
      </ProfileCard>
    </div>
  );
}
