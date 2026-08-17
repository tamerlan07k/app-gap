"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

// Server-side CRUD for individual activities, scoped to the current user (RLS +
// explicit user_id filter). This complements the onboarding /profile/activities
// editor (which does a bulk delete-and-reinsert); here each row is added/edited/
// deleted independently so the dashboard can manage activities in place. Both
// write the same activities table — there is no conflict, they're just different
// granularities of the same owner-scoped data.

type ActionResult = { ok: boolean; error?: string };

// Grades limited to the 9–12 checkboxes the onboarding form uses.
const GRADE_VALUES = ["9", "10", "11", "12"] as const;

const activityInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(200),
  category: z.string().trim().max(40).default(""),
  grades: z.array(z.enum(GRADE_VALUES)).max(4).default([]),
  leadershipRole: z.string().trim().max(200).default(""),
  description: z.string().trim().max(300).default(""),
  hoursPerWeek: z.number().int().min(1).max(80).nullable().default(null),
  weeksPerYear: z.number().int().min(1).max(52).nullable().default(null),
  meaningfulness: z.number().int().min(1).max(5).nullable().default(null),
});

export type ActivityInput = z.input<typeof activityInputSchema>;

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

// Map validated camelCase input to the snake_case activities columns.
function toRow(input: z.infer<typeof activityInputSchema>) {
  return {
    name: input.name,
    category: input.category,
    grades: input.grades,
    leadership_role: input.leadershipRole,
    description: input.description,
    hours_per_week: input.hoursPerWeek,
    weeks_per_year: input.weeksPerYear,
    meaningfulness: input.meaningfulness,
  };
}

export async function addActivity(raw: ActivityInput): Promise<ActionResult> {
  const parsed = activityInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid activity.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Ensure a profile row exists (FK requirement), matching saveStep3ToDb.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  // Append to the end of the user's list.
  const { data: last } = await supabase
    .from("activities")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = ((last?.sort_order as number | null) ?? -1) + 1;

  const { error } = await supabase
    .from("activities")
    .insert({ user_id: userId, sort_order: nextSort, ...toRow(parsed.data) });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile/activities");
  return { ok: true };
}

export async function updateActivity(
  id: string,
  raw: ActivityInput,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing activity." };
  const parsed = activityInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid activity.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("activities")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile/activities");
  return { ok: true };
}

export async function deleteActivity(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing activity." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("activities")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/profile/activities");
  return { ok: true };
}
