"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { COMMON_ADVANCED_COURSES } from "~/lib/coursework/catalog";
import { createClient } from "~/lib/supabase/server";

// Server-side CRUD for individual courses + the school-availability checklist,
// scoped to the current user (RLS + explicit user_id filter). This complements
// the onboarding /profile academics editor (which does a bulk delete-and-reinsert
// of courses); here each course row is added/edited/deleted independently so the
// Coursework workspace can manage them in place. Both write the same courses
// table — no conflict, just different granularities of the same owner-scoped data.

type ActionResult = { ok: boolean; error?: string };

const COURSE_PATH = "/dashboard/profile/coursework";

// Mirror the onboarding option sets; "" is allowed because onboarding stores
// blank defaults and we must round-trip them without validation errors.
const courseInputSchema = z.object({
  name: z.string().trim().min(1, "Give the course a name.").max(200),
  type: z
    .enum(["", "ap", "honors", "ib", "dual-enrollment", "other"])
    .default(""),
  status: z.enum(["", "current", "completed", "planned"]).default(""),
  gradeLevel: z.enum(["", "9", "10", "11", "12", "gap"]).default(""),
  apExamScore: z
    .enum(["", "1", "2", "3", "4", "5", "not-taken", "not-reporting"])
    .default(""),
});

export type CourseInput = z.input<typeof courseInputSchema>;

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function toRow(input: z.infer<typeof courseInputSchema>) {
  return {
    name: input.name,
    type: input.type,
    status: input.status,
    grade_level: input.gradeLevel,
    ap_exam_score: input.apExamScore,
  };
}

export async function addCourse(raw: CourseInput): Promise<ActionResult> {
  const parsed = courseInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid course.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Ensure a profile row exists (FK requirement), matching the activities editor.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { data: last } = await supabase
    .from("courses")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = ((last?.sort_order as number | null) ?? -1) + 1;

  const { error } = await supabase
    .from("courses")
    .insert({ user_id: userId, sort_order: nextSort, ...toRow(parsed.data) });
  if (error) return { ok: false, error: error.message };

  revalidatePath(COURSE_PATH);
  return { ok: true };
}

export async function updateCourse(
  id: string,
  raw: CourseInput,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing course." };
  const parsed = courseInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid course.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("courses")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(COURSE_PATH);
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing course." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(COURSE_PATH);
  return { ok: true };
}

// ─── School opportunity context (availability self-report) ────────────────────

const VALID_COURSE_KEYS = new Set(COMMON_ADVANCED_COURSES.map((c) => c.key));

const availabilityInputSchema = z.object({
  courseKey: z.string().refine((k) => VALID_COURSE_KEYS.has(k), {
    message: "Unknown course.",
  }),
  availability: z.enum(["offered", "not_offered", "unsure"]),
});

export type AvailabilityInput = z.input<typeof availabilityInputSchema>;

export async function setCourseAvailability(
  raw: AvailabilityInput,
): Promise<ActionResult> {
  const parsed = availabilityInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid selection.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { error } = await supabase.from("school_course_availability").upsert(
    {
      user_id: userId,
      course_key: parsed.data.courseKey,
      availability: parsed.data.availability,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,course_key" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath(COURSE_PATH);
  return { ok: true };
}
