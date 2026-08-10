import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "~/components/ui/button";
import { type Analysis, analysisSchema } from "~/lib/ai/schema";
import { COMPONENT_WEIGHTS } from "~/lib/ai/score";
import {
  ACTIVITY_CATEGORY_LABELS,
  AWARD_LEVEL_LABELS,
  COURSE_TYPE_LABELS,
  GRADE_LABELS,
  labelFor,
  MAJOR_LABELS,
  SCHOOL_TYPE_LABELS,
  SELECTIVITY_LABELS,
} from "~/lib/profile-labels";
import { createClient } from "~/lib/supabase/server";

const SCORE_COMPONENTS: {
  key: "academics" | "activities" | "awards";
  label: string;
}[] = [
  { key: "academics", label: "Academics" },
  { key: "activities", label: "Activities" },
  { key: "awards", label: "Awards" },
];

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

// The AppGap Score as a small status element — the full diagnostic lives under
// My Analysis, so this only summarizes and links there (never regenerates).
function ScoreSummary({
  analysis,
  analysisId,
}: {
  analysis: Analysis;
  analysisId: string;
}) {
  const components = analysis.componentScores;
  return (
    <Link
      href={`/dashboard/roadmap/${analysisId}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-colors hover:border-brand-teal/30 hover:bg-brand-teal/[0.02]"
    >
      <div className="flex items-center justify-between border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          AppGap Score
        </p>
        <span className="flex items-center gap-1 text-xs font-medium text-brand-teal">
          View analysis
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
        <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-brand-teal/10">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-brand-teal">
              {analysis.gapScore}
            </p>
            <p className="text-[10px] text-muted-foreground">/ 100</p>
          </div>
        </div>
        {components ? (
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-3">
            {SCORE_COMPONENTS.map((component) => {
              const score = components[component.key].score;
              return (
                <div key={component.key} className="space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-medium">
                      {component.label}
                    </span>
                    <span className="text-sm font-bold tabular-nums">
                      {score}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-brand-teal"
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {COMPONENT_WEIGHTS[component.key]}% weight
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">
            Open your analysis to see the full breakdown.
          </p>
        )}
      </div>
    </Link>
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
        .select(
          "grade_level, unweighted_gpa, sat_score, act_score, school_type, major_category, specific_major, career_interest, selectivity",
        )
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
      supabase
        .from("ai_analyses")
        .select("id, analysis, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const profile = profileRes.data;
  const courses = coursesRes.data ?? [];
  const activities = activitiesRes.data ?? [];
  const awards = awardsRes.data ?? [];

  let analysis: Analysis | null = null;
  let analysisId: string | null = null;
  if (analysisRes.data) {
    const parsed = analysisSchema.safeParse(analysisRes.data.analysis);
    if (parsed.success) {
      analysis = parsed.data;
      analysisId = analysisRes.data.id as string;
    }
  }

  return (
    <div className="space-y-6">
      {analysis && analysisId ? (
        <ScoreSummary analysis={analysis} analysisId={analysisId} />
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
              value: labelFor(MAJOR_LABELS, profile?.major_category),
            },
            { label: "Specific major", value: profile?.specific_major || "—" },
            {
              label: "Career interest",
              value: profile?.career_interest || "—",
            },
            {
              label: "Target selectivity",
              value: labelFor(SELECTIVITY_LABELS, profile?.selectivity),
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
