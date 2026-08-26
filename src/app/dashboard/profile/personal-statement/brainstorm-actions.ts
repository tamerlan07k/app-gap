"use server";

import {
  type BrainstormInputs,
  brainstormInputsSchema,
} from "~/lib/personal-statement/brainstorm";
import { createClient } from "~/lib/supabase/server";

// Persists the student's brainstorming EXERCISE answers (owner-scoped, RLS). The
// AI insights are written separately by the brainstorm API route (service role).
// Autosaved from the panel, and always flushed right before a reflect request so
// the route reads the latest inputs from the DB. No revalidate — the client holds
// the authoritative inputs, exactly like the draft-content autosave.

type Result = { ok: true } | { ok: false; error: string };

export async function saveBrainstormInputs(
  raw: BrainstormInputs,
): Promise<Result> {
  const parsed = brainstormInputsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid brainstorm input." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Ensure a profile row exists (FK requirement), mirroring the other actions.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { error } = await supabase
    .from("personal_statement_brainstorms")
    .upsert(
      {
        user_id: user.id,
        inputs: parsed.data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}
