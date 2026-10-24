import { redirect } from "next/navigation";
import { areaForMajor } from "~/lib/academic-interests";
import type {
  AcademicInfo,
  Activity,
  Award,
  CareerDirection,
  Course,
} from "~/lib/profile-storage";
import { createClient } from "~/lib/supabase/server";
import { ProfileEditWorkspace } from "./profile-edit-workspace";

// Edit Profile — a consolidated editor for the student's existing application
// profile. It prepopulates every field from the saved profile, lets the student
// correct/add/remove information, and on Save persists via the SAME writers the
// onboarding flow uses (saveStep1/2/3ToDb + saveSchoolTypeToDb) before kicking off
// a diagnostic re-evaluation. It never creates a duplicate profile and never
// forces the student back through onboarding.
export default async function ProfileEditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [profileRes, coursesRes, activitiesRes, awardsRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase
      .from("courses")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("activities")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
    supabase
      .from("awards")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order"),
  ]);

  // No profile row at all → the student hasn't started onboarding; send them there
  // rather than showing an empty editor.
  if (!profileRes.data) redirect("/profile");

  const p = profileRes.data as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" ? v : null);
  const str = (v: unknown) => (typeof v === "string" ? v : null);

  // Academic info — prefer the native-scale GPA entry, falling back to the legacy
  // 4.0 `unweighted_gpa` column (mirrors loadStep1FromDb) so pre-migration
  // profiles still prefill correctly.
  const hasNativeGpa = p.gpa_scale != null && p.gpa_value != null;
  const info: AcademicInfo = {
    gradeLevel: str(p.grade_level) ?? "",
    gpaValue: hasNativeGpa
      ? String(p.gpa_value)
      : num(p.unweighted_gpa) != null
        ? String(p.unweighted_gpa)
        : "",
    gpaScale: hasNativeGpa ? String(p.gpa_scale) : "4",
    gpaWeighted: hasNativeGpa ? Boolean(p.gpa_weighted) : false,
    satScore: num(p.sat_score) != null ? String(p.sat_score) : "",
    actScore: num(p.act_score) != null ? String(p.act_score) : "",
    classRankType: str(p.class_rank_type) ?? "none",
    classRankValue:
      num(p.class_rank_value) != null ? String(p.class_rank_value) : "",
    classSize: num(p.class_size) != null ? String(p.class_size) : "",
    classRankBand: str(p.class_rank_band) ?? "",
    classRankWeighted: Boolean(p.class_rank_weighted),
  };

  const direction: CareerDirection = {
    academicArea: areaForMajor(str(p.academic_major) ?? "") ?? "",
    academicMajor: str(p.academic_major) ?? "",
    academicInterests: Array.isArray(p.academic_interests)
      ? (p.academic_interests as string[])
      : [],
    majorCategory: str(p.major_category) ?? "",
    specificMajor: str(p.specific_major) ?? "",
    careerInterest: str(p.career_interest) ?? "",
  };

  const courses: Course[] = (coursesRes.data ?? []).map(
    (c: Record<string, unknown>) => ({
      id: String(c.id),
      name: str(c.name) ?? "",
      type: str(c.type) ?? "",
      status: str(c.status) ?? "",
      gradeLevel: str(c.grade_level) ?? "",
      apExamScore: str(c.ap_exam_score) ?? "",
    }),
  );

  const activities: Activity[] = (activitiesRes.data ?? []).map(
    (a: Record<string, unknown>) => ({
      id: String(a.id),
      name: str(a.name) ?? "",
      category: str(a.category) ?? "",
      grades: Array.isArray(a.grades) ? (a.grades as string[]) : [],
      leadershipRole: str(a.leadership_role) ?? "",
      description: str(a.description) ?? "",
      hoursPerWeek:
        num(a.hours_per_week) != null ? String(a.hours_per_week) : "",
      weeksPerYear:
        num(a.weeks_per_year) != null ? String(a.weeks_per_year) : "",
      meaningfulness: num(a.meaningfulness),
    }),
  );

  const awards: Award[] = (awardsRes.data ?? []).map(
    (a: Record<string, unknown>) => ({
      id: String(a.id),
      name: str(a.name) ?? "",
      level: str(a.level) ?? "",
      grade: str(a.grade) ?? "",
    }),
  );

  return (
    <ProfileEditWorkspace
      initialInfo={info}
      initialSchoolType={str(p.school_type) ?? ""}
      initialCourses={courses}
      initialDirection={direction}
      initialActivities={activities}
      initialAwards={awards}
    />
  );
}
