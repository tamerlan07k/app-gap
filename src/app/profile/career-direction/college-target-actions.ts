"use server";

// Onboarding College Targets persistence — SERVER-side (server Supabase client),
// which resolves the user reliably from cookies (the same path the protected
// dashboard uses). This deliberately avoids the browser client's
// auth.getUser(), which was hanging on the onboarding page (navigator.locks
// auth-token contention across multiple browser-client instances), freezing the
// section and preventing any write.

import { revalidatePath } from "next/cache";
import { createClient } from "~/lib/supabase/server";

export interface OnboardingCollege {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
}

export interface OnboardingCollegeData {
  /** The server-resolved user id (diagnostic + gate), or null if no session. */
  serverUserId: string | null;
  colleges: OnboardingCollege[];
  savedIds: string[];
}

/** Load the college search list + the user's already-saved ids, server-side. */
export async function getOnboardingCollegeData(): Promise<OnboardingCollegeData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [collegesRes, savedRes] = await Promise.all([
    supabase
      .from("colleges")
      .select("id, canonical_name, city, state")
      .eq("status", "active")
      .order("canonical_name"),
    user
      ? supabase
          .from("user_colleges")
          .select("college_id")
          .eq("user_id", user.id)
      : Promise.resolve({ data: [] as { college_id: string }[] }),
  ]);

  return {
    serverUserId: user?.id ?? null,
    colleges: (collegesRes.data ?? []).map(
      (c: {
        id: string;
        canonical_name: string;
        city: string | null;
        state: string | null;
      }) => ({
        id: c.id,
        name: c.canonical_name,
        city: c.city,
        state: c.state,
      }),
    ),
    savedIds: ((savedRes.data ?? []) as { college_id: string }[]).map(
      (r) => r.college_id,
    ),
  };
}

export type TargetResult = { ok: boolean; error?: string };

/** Idempotently add a college to the user's saved list (server-side). */
export async function addOnboardingCollege(
  collegeId: string,
): Promise<TargetResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Ensure a profiles row exists FIRST: user_colleges.user_id references
  // profiles(id), and during onboarding that row may not exist yet if the
  // student reaches College Targets before an earlier step persisted their
  // profile. Without this the insert fails the FK (user_colleges_user_id_fkey).
  // Mirrors saveStep3ToDb, which upserts profiles before its child rows.
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: user.id }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { error } = await supabase
    .from("user_colleges")
    .upsert(
      { user_id: user.id, college_id: collegeId, source: "manual" },
      { onConflict: "user_id,college_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  // Keep the dashboard My Colleges view in sync.
  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

/** Remove a college from the user's saved list (server-side). */
export async function removeOnboardingCollege(
  collegeId: string,
): Promise<TargetResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("user_colleges")
    .delete()
    .eq("user_id", user.id)
    .eq("college_id", collegeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}
