import type { FieldKey } from "~/lib/academic-interests";
import { courseworkAnalysisSchema } from "~/lib/ai/coursework-schema";
import { buildCourseworkProfile, emptyTarget } from "~/lib/coursework/engine";
import { resolveRequirements } from "~/lib/coursework/requirements";
import { loadTargetFit } from "~/lib/coursework/requirements-db";
import type {
  AvailabilityMap,
  AvailabilityState,
  TargetContext,
} from "~/lib/coursework/types";
import { MAJOR_LABELS } from "~/lib/profile-labels";
import { createClient } from "~/lib/supabase/server";
import type { EditableCourse } from "./course-form";
import { CourseworkWorkspace } from "./coursework-workspace";

// Coursework — the academic-path analysis workspace inside My Profile. Loads the
// student's live courses (editable in place), their intended field, their
// self-reported school-availability context, any saved college target (presence
// only in V1), and the latest cached AI interpretation; runs the DETERMINISTIC
// coursework engine server-side; and renders the analytical dashboard. This is a
// profile-analysis feature only — it never touches the AppGap Score or chancing.

const FIELD_KEYS = new Set<FieldKey>([
  "cs",
  "engineering",
  "bio-premed",
  "business",
  "math-physics",
  "polisci",
  "psych",
  "humanities",
  "design",
  "education",
  "law",
  "undecided",
  "other",
]);

function toFieldKey(value: string | null | undefined): FieldKey {
  return value && FIELD_KEYS.has(value as FieldKey)
    ? (value as FieldKey)
    : "undecided";
}

export default async function CourseworkPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [coursesRes, profileRes, availabilityRes, analysisRes, collegesRes] =
    await Promise.all([
      supabase
        .from("courses")
        .select("id, name, type, status, grade_level, ap_exam_score")
        .eq("user_id", user.id)
        .order("sort_order"),
      supabase
        .from("profiles")
        .select(
          "grade_level, major_category, academic_major, academic_interests",
        )
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("school_course_availability")
        .select("course_key, availability")
        .eq("user_id", user.id),
      supabase
        .from("coursework_analyses")
        .select("analysis, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("user_colleges")
        .select("college_id, school_id, program_id, track_id, intended_major")
        .eq("user_id", user.id)
        .limit(1),
    ]);

  const courseRows = (coursesRes.data ?? []) as Array<{
    id: string;
    name: string | null;
    type: string | null;
    status: string | null;
    grade_level: string | null;
    ap_exam_score: string | null;
  }>;

  const courses: EditableCourse[] = courseRows.map((c) => ({
    id: c.id,
    name: c.name ?? "",
    type: c.type ?? "",
    status: c.status ?? "",
    gradeLevel: c.grade_level ?? "",
    apExamScore: c.ap_exam_score ?? "",
  }));

  const profile = profileRes.data as {
    grade_level: string | null;
    major_category: string | null;
    academic_major: string | null;
    academic_interests: string[] | null;
  } | null;

  const rawFieldKey = profile?.major_category ?? "";
  const fieldKey = toFieldKey(rawFieldKey);
  const hasField = Boolean(rawFieldKey);
  const fieldLabel =
    fieldKey === "undecided"
      ? "your intended field"
      : (MAJOR_LABELS[fieldKey] ?? "your intended field");

  const availability: AvailabilityMap = {};
  for (const row of (availabilityRes.data ?? []) as Array<{
    course_key: string;
    availability: AvailabilityState;
  }>) {
    availability[row.course_key] = row.availability;
  }

  const targetRow = (collegesRes.data ?? [])[0] as
    | {
        college_id: string | null;
        school_id: string | null;
        program_id: string | null;
        track_id: string | null;
        intended_major: string | null;
      }
    | undefined;

  // Enrich the target with VERIFIED data: the college's field strength for the
  // student's field, and any verified scoped academic requirements resolved to
  // this exact target (empty until such data is ingested). Never fabricated.
  let target: TargetContext = emptyTarget();
  if (targetRow) {
    const fit = await loadTargetFit(supabase, targetRow.college_id, fieldKey);
    target = {
      hasTarget: true,
      collegeId: targetRow.college_id ?? null,
      schoolId: targetRow.school_id ?? null,
      programId: targetRow.program_id ?? null,
      trackId: targetRow.track_id ?? null,
      collegeName: fit.collegeName,
      programLabel: targetRow.intended_major ?? null,
      fieldStrength: fit.fieldStrength,
      verifiedExpectations: resolveRequirements(fit.requirements, {
        schoolId: targetRow.school_id ?? null,
        programId: targetRow.program_id ?? null,
        trackId: targetRow.track_id ?? null,
      }),
    };
  }

  const cw = buildCourseworkProfile({
    courses: courses.map((c) => ({
      name: c.name,
      type: c.type,
      status: c.status,
      gradeLevel: c.gradeLevel,
      apExamScore: c.apExamScore,
    })),
    gradeLevel: profile?.grade_level ?? "",
    fieldKey,
    academicMajor: profile?.academic_major ?? "",
    academicInterests: profile?.academic_interests ?? [],
    availability,
    target,
  });

  // Latest cached analysis, validated defensively — a row written by an older
  // schema simply fails validation and is treated as "not analyzed yet".
  const analysisRow = analysisRes.data as {
    analysis: unknown;
    created_at: string;
    updated_at: string | null;
  } | null;
  const parsed = analysisRow
    ? courseworkAnalysisSchema.safeParse(analysisRow.analysis)
    : null;
  const initialAnalysis = parsed?.success ? parsed.data : null;
  const initialAnalyzedAt =
    parsed?.success && analysisRow
      ? (analysisRow.updated_at ?? analysisRow.created_at)
      : null;

  return (
    <CourseworkWorkspace
      courses={courses}
      cw={cw}
      availability={availability}
      fieldLabel={fieldLabel}
      hasField={hasField}
      initialAnalysis={initialAnalysis}
      initialAnalyzedAt={initialAnalyzedAt}
    />
  );
}
