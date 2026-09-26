"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

// Server-side CRUD for individual awards, scoped to the current user (RLS +
// explicit user_id). Complements the onboarding /profile editor (which does a bulk
// delete-and-reinsert of the base name/level/grade fields); here each award is
// managed in place with the richer Recognition Map fields. Both write the same
// `awards` table — no conflict, just different granularities. The base three
// fields (name/level/grade) remain what the AppGap Score reads; the richer fields
// are additive and never touched by chancing.

type ActionResult = { ok: boolean; error?: string };

const AWARDS_PATH = "/dashboard/profile/awards";

// "" allowed on selects because we round-trip blank defaults.
const awardInputSchema = z.object({
  name: z.string().trim().min(1, "Give the award a name.").max(200),
  organization: z.string().trim().max(200).default(""),
  year: z.string().trim().max(20).default(""),
  level: z
    .enum(["", "school", "regional", "state-national", "international"])
    .default(""),
  category: z.string().trim().max(60).default(""),
  placement: z.string().trim().max(120).default(""),
  grade: z.enum(["", "9", "10", "11", "12"]).default(""),
  selectivityContext: z.string().trim().max(300).default(""),
  description: z.string().trim().max(600).default(""),
  evidenceUrl: z
    .string()
    .trim()
    .max(500)
    .url("Enter a valid URL (or leave it blank).")
    .or(z.literal(""))
    .default(""),
  studentExplanation: z.string().trim().max(800).default(""),
});

export type AwardInput = z.input<typeof awardInputSchema>;

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function toRow(input: z.infer<typeof awardInputSchema>) {
  return {
    name: input.name,
    organization: input.organization,
    year: input.year,
    level: input.level,
    category: input.category,
    placement: input.placement,
    grade: input.grade,
    selectivity_context: input.selectivityContext,
    description: input.description,
    evidence_url: input.evidenceUrl ? input.evidenceUrl : null,
    student_explanation: input.studentExplanation,
    updated_at: new Date().toISOString(),
  };
}

export async function addAward(raw: AwardInput): Promise<ActionResult> {
  const parsed = awardInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid award.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Ensure a profile row exists (FK requirement), matching the other editors.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { data: last } = await supabase
    .from("awards")
    .select("sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSort = ((last?.sort_order as number | null) ?? -1) + 1;

  const { error } = await supabase
    .from("awards")
    .insert({ user_id: userId, sort_order: nextSort, ...toRow(parsed.data) });
  if (error) return { ok: false, error: error.message };

  revalidatePath(AWARDS_PATH);
  return { ok: true };
}

export async function updateAward(
  id: string,
  raw: AwardInput,
): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing award." };
  const parsed = awardInputSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid award.",
    };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("awards")
    .update(toRow(parsed.data))
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(AWARDS_PATH);
  return { ok: true };
}

export async function deleteAward(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing award." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("awards")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(AWARDS_PATH);
  return { ok: true };
}
