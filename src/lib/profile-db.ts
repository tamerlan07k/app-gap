import type {
  AcademicInfo,
  Activity,
  Award,
  CareerDirection,
  Course,
  HighSchoolInfo,
  Step1Data,
  Step3Data,
} from "~/lib/profile-storage";
import { createClient } from "~/lib/supabase/client";

// ── Loaders ───────────────────────────────────────────────────────────────────
// Each loader returns null on any error or missing data, letting the caller
// fall back to localStorage. This keeps load failures transparent to the user.

export async function loadStep1FromDb(): Promise<Step1Data | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [profileRes, coursesRes] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, grade_level, unweighted_gpa, sat_score, act_score")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("courses")
        .select("*")
        .eq("user_id", user.id)
        .order("sort_order"),
    ]);

    if (!profileRes.data) return null;
    const p = profileRes.data;
    // No academic data saved yet — defer to localStorage
    if (!p.grade_level && p.unweighted_gpa == null) return null;

    const info: AcademicInfo = {
      gradeLevel: p.grade_level ?? "",
      unweightedGpa: p.unweighted_gpa != null ? String(p.unweighted_gpa) : "",
      satScore: p.sat_score != null ? String(p.sat_score) : "",
      actScore: p.act_score != null ? String(p.act_score) : "",
    };

    const courses: Course[] = (coursesRes.data ?? []).map(
      (c: {
        id: string;
        name: string;
        type: string;
        status: string;
        grade_level: string;
        ap_exam_score: string;
      }) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        status: c.status,
        gradeLevel: c.grade_level,
        apExamScore: c.ap_exam_score,
      }),
    );

    return { info, courses };
  } catch {
    return null;
  }
}

export async function loadStep2FromDb(): Promise<CareerDirection | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select(
        "id, major_category, specific_major, career_interest, selectivity",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!p) return null;
    // No career data saved yet — defer to localStorage
    if (!p.major_category && !p.selectivity) return null;

    return {
      majorCategory: p.major_category ?? "",
      specificMajor: p.specific_major ?? "",
      careerInterest: p.career_interest ?? "",
      selectivity: p.selectivity ?? "",
    };
  } catch {
    return null;
  }
}

export async function loadStep3FromDb(): Promise<Step3Data | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    // If no profile row exists, defer to localStorage (user hasn't completed step 1 yet)
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    const [activitiesRes, awardsRes] = await Promise.all([
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

    const activities: Activity[] = (activitiesRes.data ?? []).map(
      (a: {
        id: string;
        name: string;
        category: string;
        grades: string[];
        leadership_role: string;
        description: string;
        hours_per_week: number | null;
        weeks_per_year: number | null;
        meaningfulness: number | null;
      }) => ({
        id: a.id,
        name: a.name,
        category: a.category,
        grades: a.grades ?? [],
        leadershipRole: a.leadership_role,
        description: a.description,
        hoursPerWeek: a.hours_per_week != null ? String(a.hours_per_week) : "",
        weeksPerYear: a.weeks_per_year != null ? String(a.weeks_per_year) : "",
        meaningfulness: a.meaningfulness,
      }),
    );

    const awards: Award[] = (awardsRes.data ?? []).map(
      (a: { id: string; name: string; level: string; grade: string }) => ({
        id: a.id,
        name: a.name,
        level: a.level,
        grade: a.grade,
      }),
    );

    return { activities, awards };
  } catch {
    return null;
  }
}

export async function loadSchoolTypeFromDb(): Promise<HighSchoolInfo | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select("school_type")
      .eq("id", user.id)
      .maybeSingle();

    if (!p?.school_type) return null;
    return { schoolType: p.school_type as string };
  } catch {
    return null;
  }
}

// ── Savers ────────────────────────────────────────────────────────────────────
// Savers throw on any Supabase error so the calling page can surface a message.
// The upsert on profiles only touches the columns relevant to each step, so
// steps don't overwrite each other's data (e.g. saving step 1 leaves career
// fields untouched).

export async function saveStep1ToDb(
  info: AcademicInfo,
  courses: Course[],
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      grade_level: info.gradeLevel || null,
      unweighted_gpa: info.unweightedGpa
        ? parseFloat(info.unweightedGpa)
        : null,
      sat_score: info.satScore ? parseInt(info.satScore, 10) : null,
      act_score: info.actScore ? parseInt(info.actScore, 10) : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (profileError) throw new Error(profileError.message);

  const { error: deleteError } = await supabase
    .from("courses")
    .delete()
    .eq("user_id", user.id);
  if (deleteError) throw new Error(deleteError.message);

  if (courses.length > 0) {
    const { error: insertError } = await supabase.from("courses").insert(
      courses.map((c, i) => ({
        user_id: user.id,
        name: c.name,
        type: c.type,
        status: c.status,
        grade_level: c.gradeLevel,
        ap_exam_score: c.apExamScore,
        sort_order: i,
      })),
    );
    if (insertError) throw new Error(insertError.message);
  }
}

export async function saveSchoolTypeToDb(data: HighSchoolInfo): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      school_type: data.schoolType || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

export async function saveStep2ToDb(data: CareerDirection): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      major_category: data.majorCategory || null,
      specific_major: data.specificMajor || null,
      career_interest: data.careerInterest || null,
      selectivity: data.selectivity || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

export async function saveStep3ToDb(
  activities: Activity[],
  awards: Award[],
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // Ensure a profile row exists (FK requirement for child tables)
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) throw new Error(profileError.message);

  const { error: deleteActivitiesError } = await supabase
    .from("activities")
    .delete()
    .eq("user_id", user.id);
  if (deleteActivitiesError) throw new Error(deleteActivitiesError.message);

  if (activities.length > 0) {
    const { error: insertActivitiesError } = await supabase
      .from("activities")
      .insert(
        activities.map((a, i) => ({
          user_id: user.id,
          name: a.name,
          category: a.category,
          grades: a.grades,
          leadership_role: a.leadershipRole,
          description: a.description,
          hours_per_week: a.hoursPerWeek ? parseInt(a.hoursPerWeek, 10) : null,
          weeks_per_year: a.weeksPerYear ? parseInt(a.weeksPerYear, 10) : null,
          meaningfulness: a.meaningfulness,
          sort_order: i,
        })),
      );
    if (insertActivitiesError) throw new Error(insertActivitiesError.message);
  }

  const { error: deleteAwardsError } = await supabase
    .from("awards")
    .delete()
    .eq("user_id", user.id);
  if (deleteAwardsError) throw new Error(deleteAwardsError.message);

  if (awards.length > 0) {
    const { error: insertAwardsError } = await supabase.from("awards").insert(
      awards.map((a, i) => ({
        user_id: user.id,
        name: a.name,
        level: a.level,
        grade: a.grade,
        sort_order: i,
      })),
    );
    if (insertAwardsError) throw new Error(insertAwardsError.message);
  }
}
