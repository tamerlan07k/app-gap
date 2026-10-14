import { areaForMajor, fieldKeyForMajor } from "~/lib/academic-interests";
import { normalizeGpaTo4 } from "~/lib/academics";
import { detectState } from "~/lib/colleges/geography";
import type {
  AcademicInfo,
  Activity,
  Award,
  CareerDirection,
  Course,
  HighSchoolInfo,
  Step1Data,
  Step3Data,
  WelcomeInfo,
} from "~/lib/profile-storage";
import { createClient } from "~/lib/supabase/client";

// ── Loaders ───────────────────────────────────────────────────────────────────
// Each loader returns null on any error or missing data, letting the caller
// fall back to localStorage. This keeps load failures transparent to the user.

export async function loadWelcomeFromDb(): Promise<WelcomeInfo | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select("location")
      .eq("id", user.id)
      .maybeSingle();

    const meta = user.user_metadata ?? {};
    const name =
      (meta.first_name as string | undefined) ??
      (meta.given_name as string | undefined) ??
      (meta.full_name as string | undefined) ??
      "";
    const location = (p?.location as string | null) ?? "";

    if (!name && !location) return null;
    return { name, location };
  } catch {
    return null;
  }
}

export async function loadStep1FromDb(): Promise<Step1Data | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const [profileRes, coursesRes] = await Promise.all([
      // select("*") tolerates envs where the native-GPA / rank columns aren't
      // migrated yet — they come back undefined rather than erroring.
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
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

    // Prefer the student's native-scale entry; fall back to the legacy 4.0
    // `unweighted_gpa` column (scale "4", unweighted) for pre-migration profiles.
    const hasNativeGpa = p.gpa_scale != null && p.gpa_value != null;
    const info: AcademicInfo = {
      gradeLevel: p.grade_level ?? "",
      gpaValue: hasNativeGpa
        ? String(p.gpa_value)
        : p.unweighted_gpa != null
          ? String(p.unweighted_gpa)
          : "",
      gpaScale: hasNativeGpa ? String(p.gpa_scale) : "4",
      gpaWeighted: hasNativeGpa ? Boolean(p.gpa_weighted) : false,
      satScore: p.sat_score != null ? String(p.sat_score) : "",
      actScore: p.act_score != null ? String(p.act_score) : "",
      classRankType: (p.class_rank_type as string | null) ?? "none",
      classRankValue:
        p.class_rank_value != null ? String(p.class_rank_value) : "",
      classSize: p.class_size != null ? String(p.class_size) : "",
      classRankBand: (p.class_rank_band as string | null) ?? "",
      classRankWeighted: Boolean(p.class_rank_weighted),
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
        "id, major_category, academic_major, academic_interests, specific_major, career_interest",
      )
      .eq("id", user.id)
      .maybeSingle();

    if (!p) return null;
    // No career data saved yet — defer to localStorage
    if (!p.major_category && !p.academic_major) return null;

    return {
      academicArea: areaForMajor(p.academic_major) ?? "",
      academicMajor: (p.academic_major as string | null) ?? "",
      academicInterests: (p.academic_interests as string[] | null) ?? [],
      majorCategory: p.major_category ?? "",
      specificMajor: p.specific_major ?? "",
      careerInterest: p.career_interest ?? "",
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

    // No activities/awards persisted to the DB yet — defer to localStorage so
    // in-progress entries (saved locally on every change but only flushed to the
    // DB on "Continue") aren't clobbered by an empty DB result when the user
    // navigates back to this step via the stepper. Mirrors the "no data → null"
    // guard in loadStep1FromDb / loadStep2FromDb.
    if (activities.length === 0 && awards.length === 0) {
      return null;
    }

    return { activities, awards };
  } catch {
    return null;
  }
}

export async function loadAdditionalContextFromDb(): Promise<string | null> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select("additional_context")
      .eq("id", user.id)
      .maybeSingle();

    return p?.additional_context ?? null;
  } catch {
    return null;
  }
}

export async function saveAdditionalContextToDb(
  context: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      additional_context: context.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
}

export async function loadPersonalStatementDraftFromDb(): Promise<
  string | null
> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: p } = await supabase
      .from("profiles")
      .select("personal_statement_draft")
      .eq("id", user.id)
      .maybeSingle();

    return (p?.personal_statement_draft as string | null) ?? null;
  } catch {
    return null;
  }
}

export async function savePersonalStatementDraftToDb(
  text: string,
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      personal_statement_draft: text.trim() || null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
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

  // Canonical 4.0-normalized GPA every internal consumer reads (chancing math,
  // AI prompt), derived from the native-scale entry. Null when "none" / blank.
  const gpaValueNum = info.gpaValue ? parseFloat(info.gpaValue) : null;
  const normalizedGpa = normalizeGpaTo4(gpaValueNum, info.gpaScale);

  const isExactRank = info.classRankType === "exact";
  const isCoarseRank = ["decile", "quintile", "quartile"].includes(
    info.classRankType,
  );

  const fullRow = {
    id: user.id,
    grade_level: info.gradeLevel || null,
    unweighted_gpa: normalizedGpa,
    sat_score: info.satScore ? parseInt(info.satScore, 10) : null,
    act_score: info.actScore ? parseInt(info.actScore, 10) : null,
    // Native-scale GPA entry (display + prompt context).
    gpa_value: gpaValueNum,
    gpa_scale: info.gpaScale || null,
    gpa_weighted: info.gpaValue ? info.gpaWeighted : null,
    // Class rank.
    class_rank_type: info.classRankType || null,
    class_rank_value:
      isExactRank && info.classRankValue
        ? parseInt(info.classRankValue, 10)
        : null,
    class_size:
      isExactRank && info.classSize ? parseInt(info.classSize, 10) : null,
    class_rank_band:
      isCoarseRank && info.classRankBand ? info.classRankBand : null,
    class_rank_weighted:
      info.classRankType && info.classRankType !== "none"
        ? info.classRankWeighted
        : null,
    updated_at: new Date().toISOString(),
  };

  // Legacy-safe subset for envs where the native-GPA / rank columns aren't
  // migrated yet — the core academics still save and onboarding completes.
  const legacyRow = {
    id: fullRow.id,
    grade_level: fullRow.grade_level,
    unweighted_gpa: fullRow.unweighted_gpa,
    sat_score: fullRow.sat_score,
    act_score: fullRow.act_score,
    updated_at: fullRow.updated_at,
  };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert(fullRow, { onConflict: "id" });
  if (profileError) {
    const missingColumn =
      profileError.code === "PGRST204" ||
      /gpa_(value|scale|weighted)|class_(rank|size)/.test(profileError.message);
    if (missingColumn) {
      const { error: fallbackError } = await supabase
        .from("profiles")
        .upsert(legacyRow, { onConflict: "id" });
      if (fallbackError) throw new Error(fallbackError.message);
    } else {
      throw new Error(profileError.message);
    }
  }

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

/**
 * Persist the "About you" step: the name goes to the auth user_metadata (so the
 * dashboard greeting picks it up with no extra lookup), and the free-text
 * location + its auto-detected US state go to the profiles row (the state powers
 * the My Colleges location filters).
 */
export async function saveWelcomeToDb(data: WelcomeInfo): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const name = data.name.trim();
  const location = data.location.trim();

  if (name) {
    const { error: metaError } = await supabase.auth.updateUser({
      data: { first_name: name },
    });
    if (metaError) throw new Error(metaError.message);
  }

  const { error } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      location: location || null,
      location_state: detectState(location),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );
  if (error) throw new Error(error.message);
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

  // major_category is DERIVED from the chosen major (never chosen directly), so
  // the college field-fit layer and AI label maps keep working unchanged.
  const derivedFieldKey = data.academicMajor
    ? fieldKeyForMajor(data.academicMajor)
    : data.majorCategory || null;

  // Legacy-compatible fields that exist in every environment.
  const base = {
    id: user.id,
    major_category: derivedFieldKey,
    specific_major: data.specificMajor || null,
    career_interest: data.careerInterest || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(
    {
      ...base,
      academic_major: data.academicMajor || null,
      academic_interests: data.academicInterests ?? [],
    },
    { onConflict: "id" },
  );

  // If the new columns aren't migrated yet (PGRST204 / undefined column), fall
  // back to the legacy columns so onboarding still completes. The granular
  // direction persists once the migration is applied.
  if (error) {
    const missingColumn =
      error.code === "PGRST204" ||
      /academic_(major|interests)/.test(error.message);
    if (missingColumn) {
      const { error: fallbackError } = await supabase
        .from("profiles")
        .upsert(base, { onConflict: "id" });
      if (fallbackError) throw new Error(fallbackError.message);
      return;
    }
    throw new Error(error.message);
  }
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
