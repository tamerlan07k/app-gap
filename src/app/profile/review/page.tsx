"use client";

import { AlertCircle, ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "~/components/ui/button";
import {
  loadStep1FromDb,
  loadStep2FromDb,
  loadStep3FromDb,
} from "~/lib/profile-db";
import {
  type CareerDirection,
  loadStep1,
  loadStep2,
  loadStep3,
  type Step1Data,
  type Step3Data,
} from "~/lib/profile-storage";

// ─── Label maps ───────────────────────────────────────────────────────────────

const GRADE_LABELS: Record<string, string> = {
  "9": "9th grade",
  "10": "10th grade",
  "11": "11th grade",
  "12": "12th grade (senior)",
  gap: "Graduated / gap year",
};

const MAJOR_LABELS: Record<string, string> = {
  cs: "Computer Science / Software / Data",
  engineering: "Engineering",
  "bio-premed": "Biology / Pre-Med / Health Sciences",
  business: "Business / Finance / Economics",
  "math-physics": "Math / Physics / Statistics",
  polisci: "Political Science / International Relations",
  psych: "Psychology / Neuroscience",
  humanities: "English / History / Humanities",
  design: "Architecture / Design / Arts",
  education: "Education / Social Work / Public Policy",
  law: "Pre-Law / Legal Studies",
  undecided: "Undecided",
  other: "Other",
};

const SELECTIVITY_LABELS: Record<string, string> = {
  "highly-selective": "Highly selective / reach schools",
  competitive: "Competitive target schools",
  balanced: "Balanced mix",
  safer: "Mostly safer / likely schools",
  unsure: "Not sure yet",
};

const CATEGORY_LABELS: Record<string, string> = {
  sports: "Sports / Athletics",
  clubs: "Clubs & Organizations",
  volunteering: "Community Service / Volunteering",
  research: "Research",
  internship: "Internship",
  work: "Work / Employment",
  "personal-project": "Personal Project",
  business: "Business / Startup",
  arts: "Arts & Performance",
  competitions: "Competitions & Olympiads",
  cultural: "Cultural / Religious",
  "student-gov": "Student Government",
  other: "Other",
};

const AWARD_LEVEL_LABELS: Record<string, string> = {
  school: "School level",
  regional: "Regional / District",
  "state-national": "State / National",
  international: "International",
};

const COURSE_TYPE_LABELS: Record<string, string> = {
  ap: "AP",
  honors: "Honors",
  ib: "IB",
  "dual-enrollment": "Dual Enrollment / College Course",
  other: "Other",
};

const COURSE_STATUS_LABELS: Record<string, string> = {
  current: "Current",
  completed: "Completed",
  planned: "Planned",
};

const AP_SCORE_LABELS: Record<string, string> = {
  "not-taken": "Not Taken",
  "not-reporting": "Not Reporting",
  "1": "1",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  editHref,
}: {
  title: string;
  editHref: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="font-semibold">{title}</h2>
      <Button variant="ghost" size="sm" asChild>
        <Link href={editHref}>Edit</Link>
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="w-36 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <span className="text-sm">{value || "—"}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const router = useRouter();
  const [step1, setStep1] = useState<Step1Data | null>(null);
  const [step2, setStep2] = useState<CareerDirection | null>(null);
  const [step3, setStep3] = useState<Step3Data | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    async function load() {
      const [dbStep1, dbStep2, dbStep3] = await Promise.all([
        loadStep1FromDb(),
        loadStep2FromDb(),
        loadStep3FromDb(),
      ]);
      setStep1(dbStep1 ?? loadStep1());
      setStep2(dbStep2 ?? loadStep2());
      setStep3(dbStep3 ?? loadStep3());
      setIsLoaded(true);
    }
    load();
  }, []);

  const step1Complete = !!step1?.info.gradeLevel && !!step1?.info.unweightedGpa;
  const step2Complete = !!step2?.majorCategory && !!step2?.selectivity;
  const allComplete = step1Complete && step2Complete;

  const missingItems: string[] = [];
  if (!step1Complete)
    missingItems.push("Academic Profile — grade level and GPA required");
  if (!step2Complete)
    missingItems.push(
      "Career Direction — intended major and college goals required",
    );

  async function handleGenerate() {
    if (!allComplete || isGenerating) return;
    setIsGenerating(true);
    router.push("/dashboard?saved=1");
  }

  if (!isLoaded) {
    return (
      <main className="px-6 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="flex justify-center py-20">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Page header */}
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 4 of 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Review &amp; generate
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            Review everything AppGap has collected. When you&apos;re ready,
            generate your personalized roadmap.
          </p>
        </div>

        {/* Completion status */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="space-y-3">
            {(
              [
                { label: "Academic Profile", done: step1Complete },
                { label: "Career Direction", done: step2Complete },
                { label: "Activities & Impact", done: true },
              ] as const
            ).map(({ label, done }) => (
              <div key={label} className="flex items-center gap-3">
                {done ? (
                  <CheckCircle2 className="size-4 shrink-0 text-green-600 dark:text-green-500" />
                ) : (
                  <AlertCircle className="size-4 shrink-0 text-amber-500" />
                )}
                <span className="text-sm">{label}</span>
              </div>
            ))}
          </div>
          <div className="mt-4 border-t border-border pt-4">
            {allComplete ? (
              <p className="text-sm font-medium">
                Your profile is complete and ready for analysis.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                  Complete the following before generating:
                </p>
                {missingItems.map((item) => (
                  <p key={item} className="text-sm text-muted-foreground">
                    · {item}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Section: Academic Profile */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader title="Academic Profile" editHref="/profile" />
          <div className="space-y-2.5">
            <Row
              label="Grade level"
              value={GRADE_LABELS[step1?.info.gradeLevel ?? ""] ?? ""}
            />
            <Row
              label="Unweighted GPA"
              value={
                step1?.info.unweightedGpa
                  ? `${step1.info.unweightedGpa} / 4.0`
                  : ""
              }
            />
            <Row label="SAT score" value={step1?.info.satScore ?? ""} />
            <Row label="ACT score" value={step1?.info.actScore ?? ""} />
          </div>

          {(step1?.courses?.length ?? 0) > 0 && (
            <div className="border-t border-border pt-4">
              <p className="mb-3 text-sm font-medium">
                Coursework ({step1?.courses.length})
              </p>
              <div className="space-y-2">
                {step1?.courses.map((course) => {
                  const typeStr =
                    COURSE_TYPE_LABELS[course.type] ?? course.type;
                  const statusStr =
                    COURSE_STATUS_LABELS[course.status] ?? course.status;
                  const gradeStr = course.gradeLevel
                    ? `Grade ${course.gradeLevel}`
                    : "";
                  const apScore =
                    course.type === "ap" &&
                    course.status === "completed" &&
                    course.apExamScore
                      ? ` · Score: ${AP_SCORE_LABELS[course.apExamScore] ?? course.apExamScore}`
                      : "";
                  const meta = [typeStr, gradeStr, statusStr]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div key={course.id} className="flex gap-3">
                      <span className="mt-0.5 text-muted-foreground">·</span>
                      <div>
                        <span className="text-sm">{course.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {" — "}
                          {meta}
                          {apScore}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section: Career Direction */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader
            title="Career Direction"
            editHref="/profile/career-direction"
          />
          <div className="space-y-2.5">
            <Row
              label="Intended major"
              value={MAJOR_LABELS[step2?.majorCategory ?? ""] ?? ""}
            />
            {step2?.specificMajor && (
              <Row label="Specific major" value={step2.specificMajor} />
            )}
            {step2?.careerInterest && (
              <Row label="Career goal" value={step2.careerInterest} />
            )}
            <Row
              label="College goals"
              value={SELECTIVITY_LABELS[step2?.selectivity ?? ""] ?? ""}
            />
          </div>
        </div>

        {/* Section: Activities & Impact */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <SectionHeader
            title="Activities & Impact"
            editHref="/profile/activities"
          />

          <div className="space-y-2">
            <p className="text-sm font-medium">
              Activities
              {(step3?.activities?.length ?? 0) > 0
                ? ` (${step3?.activities.length})`
                : ""}
            </p>
            {(step3?.activities?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No activities added.
              </p>
            ) : (
              <div className="space-y-2">
                {step3?.activities.map((activity) => {
                  const categoryStr =
                    CATEGORY_LABELS[activity.category] ?? activity.category;
                  const gradesStr =
                    activity.grades.length > 0
                      ? `Grade${activity.grades.length > 1 ? "s" : ""} ${activity.grades.join(", ")}`
                      : "";
                  const meta = [categoryStr, gradesStr]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <div key={activity.id} className="flex gap-3">
                      <span className="mt-0.5 text-muted-foreground">·</span>
                      <div>
                        <span className="text-sm font-medium">
                          {activity.name}
                        </span>
                        {activity.leadershipRole && (
                          <span className="text-sm text-muted-foreground">
                            {" "}
                            ({activity.leadershipRole})
                          </span>
                        )}
                        {meta && (
                          <p className="text-xs text-muted-foreground">
                            {meta}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t border-border pt-4">
            <p className="text-sm font-medium">
              Awards &amp; honors
              {(step3?.awards?.length ?? 0) > 0
                ? ` (${step3?.awards.length})`
                : ""}
            </p>
            {(step3?.awards?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">No awards added.</p>
            ) : (
              <div className="space-y-2">
                {step3?.awards.map((award) => {
                  const levelStr =
                    AWARD_LEVEL_LABELS[award.level] ?? award.level;
                  const gradeStr = award.grade ? `Grade ${award.grade}` : "";
                  const meta = [levelStr, gradeStr].filter(Boolean).join(" · ");
                  return (
                    <div key={award.id} className="flex gap-3">
                      <span className="mt-0.5 text-muted-foreground">·</span>
                      <div>
                        <span className="text-sm">{award.name}</span>
                        {meta && (
                          <span className="text-sm text-muted-foreground">
                            {" — "}
                            {meta}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Generate section */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-8 text-center shadow-sm">
          <div className="space-y-2">
            <h2 className="font-semibold">Ready to see where you stand?</h2>
            <p className="text-sm text-muted-foreground">
              AppGap will analyze your academic profile, activities, and goals
              to identify gaps and build your personalized roadmap.
            </p>
          </div>
          <Button
            size="lg"
            onClick={handleGenerate}
            disabled={!allComplete || isGenerating}
            className="w-full sm:w-auto"
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                Saving your profile...
              </>
            ) : (
              "Generate My AppGap Roadmap"
            )}
          </Button>
          {!allComplete && !isGenerating && (
            <p className="text-xs text-muted-foreground">
              Complete all required fields above to unlock analysis.
            </p>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile/activities">
              <ArrowLeft />
              Back
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
