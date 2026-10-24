"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";

// Persist a revised activity description from the Application Writing workspace
// back to the SHARED activities row (the same record My Profile and the Activities
// workspace read). This is what lets an improvement made here flow into the
// profile and, in turn, a diagnostic re-evaluation — both surfaces use one
// activity record, never divergent copies. Owner-scoped (RLS + explicit user_id).

type ActionResult = { ok: boolean; error?: string };

// Common App activity descriptions cap at 150 chars; the column tolerates more,
// but we keep the same generous 300 ceiling the editors use.
const inputSchema = z.object({
  id: z.string().min(1, "Missing activity."),
  description: z.string().trim().max(300),
});

export async function applyActivityDescription(
  id: string,
  description: string,
): Promise<ActionResult> {
  const parsed = inputSchema.safeParse({ id, description });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid description.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("activities")
    .update({ description: parsed.data.description })
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);
  if (error) return { ok: false, error: error.message };

  // Both surfaces that read this row should reflect the new text on next load.
  revalidatePath("/dashboard/application-writing/activity-additional-info");
  revalidatePath("/dashboard/profile");
  revalidatePath("/dashboard/profile/activities");
  return { ok: true };
}
