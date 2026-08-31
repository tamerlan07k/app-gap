"use server";

import { revalidatePath } from "next/cache";
import {
  loadApplicantStrength,
  loadCollegesWithData,
  loadMatchProfile,
} from "~/lib/colleges/db";
import { buildBalancedList } from "~/lib/colleges/matching";
import { CURRENT_CYCLE_YEAR } from "~/lib/colleges/types";
import { createClient } from "~/lib/supabase/server";

type ActionResult = { ok: boolean; error?: string };

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

export async function addCollege(collegeId: string): Promise<ActionResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("user_colleges")
    .upsert(
      { user_id: userId, college_id: collegeId, source: "manual" },
      { onConflict: "user_id,college_id", ignoreDuplicates: true },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

export async function removeCollege(collegeId: string): Promise<ActionResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("user_colleges")
    .delete()
    .eq("user_id", userId)
    .eq("college_id", collegeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

/**
 * Seed the user's list with a balanced 3 safeties / 6 targets / 4 reaches set
 * computed from their profile and the available college data. Skips colleges
 * already saved; classified purely by fit, never prestige.
 */
export async function generateBalancedList(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Load the SAME applicant strength the college page uses to display/re-bucket
  // the list. Generation and display must feed classifyAdmission identical inputs
  // or a strong profile's reaches would flip to targets on load (the 3/10/0 bug).
  const [profile, strength, { all }] = await Promise.all([
    loadMatchProfile(supabase, userId),
    loadApplicantStrength(supabase, userId),
    loadCollegesWithData(supabase),
  ]);
  if (!profile) return { ok: false, error: "Complete your profile first." };

  const { data: existing } = await supabase
    .from("user_colleges")
    .select("college_id")
    .eq("user_id", userId);
  const have = new Set((existing ?? []).map((r) => r.college_id as string));

  const { safetyIds, targetIds, reachIds } = buildBalancedList(
    profile,
    all,
    strength,
    have,
  );
  const ids = [...safetyIds, ...targetIds, ...reachIds];
  if (ids.length === 0) {
    return { ok: false, error: "No colleges available to recommend." };
  }

  const rows = ids.map((college_id) => ({
    user_id: userId,
    college_id,
    source: "recommended",
  }));
  const { error } = await supabase
    .from("user_colleges")
    .upsert(rows, { onConflict: "user_id,college_id", ignoreDuplicates: true });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

/**
 * Clear the CURRENT user's entire college list and reset them to exploration
 * mode. Scoped to the user's own rows (RLS + explicit user_id filter) — it only
 * ever touches user_colleges / user_college_state, never the shared college
 * reference tables.
 */
export async function clearColleges(): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("user_colleges")
    .delete()
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  // Clearing the list drops any finalized state back to exploration. Updates
  // only an existing row (no-op if the user never finalized).
  const { error: stateError } = await supabase
    .from("user_college_state")
    .update({ finalized_at: null, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (stateError) return { ok: false, error: stateError.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

// ─── Phase 2: finalization + application plan ─────────────────────────────────

async function setFinalized(finalized: boolean): Promise<ActionResult> {
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const now = new Date().toISOString();
  const { error } = await supabase.from("user_college_state").upsert(
    {
      user_id: userId,
      finalized_at: finalized ? now : null,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

export async function finalizeList(): Promise<ActionResult> {
  return setFinalized(true);
}

export async function reopenList(): Promise<ActionResult> {
  return setFinalized(false);
}

/**
 * Select (or clear) the application plan for one college. `roundId` must be a
 * round the college actually offers this cycle — validated server-side so the
 * plan can never point at a round the college doesn't have.
 */
export async function selectRound(
  collegeId: string,
  roundId: string | null,
): Promise<ActionResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  if (roundId) {
    const { data: cycle } = await supabase
      .from("application_cycles")
      .select("id")
      .eq("college_id", collegeId)
      .eq("cycle_year", CURRENT_CYCLE_YEAR)
      .maybeSingle();
    if (!cycle)
      return { ok: false, error: "No application cycle for college." };

    const { data: round } = await supabase
      .from("application_rounds")
      .select("id")
      .eq("id", roundId)
      .eq("cycle_id", cycle.id)
      .maybeSingle();
    if (!round) {
      return { ok: false, error: "That round isn't offered by this college." };
    }
  }

  const { error } = await supabase
    .from("user_colleges")
    .update({ selected_round_id: roundId })
    .eq("user_id", userId)
    .eq("college_id", collegeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}

/**
 * Set (or clear) the per-college academic target: undergraduate school, program,
 * degree pathway, and/or a free-text intended major. All fields optional —
 * uncertainty ("Not sure yet" → null) is a legitimate state. `schoolId` /
 * `programId`, when provided, are validated to actually belong to the college so
 * a stale/foreign id can never be written. Choosing a school clears a program
 * that no longer belongs to it.
 */
export async function setCollegeTarget(
  collegeId: string,
  target: {
    schoolId?: string | null;
    programId?: string | null;
    degreeType?: string | null;
    intendedMajor?: string | null;
  },
): Promise<ActionResult> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const schoolId = target.schoolId || null;
  const programId = target.programId || null;

  if (schoolId) {
    const { data: school } = await supabase
      .from("college_schools")
      .select("id")
      .eq("id", schoolId)
      .eq("college_id", collegeId)
      .maybeSingle();
    if (!school)
      return { ok: false, error: "That school isn't part of this college." };
  }

  if (programId) {
    const { data: program } = await supabase
      .from("college_programs")
      .select("id, school_id")
      .eq("id", programId)
      .eq("college_id", collegeId)
      .maybeSingle();
    if (!program)
      return { ok: false, error: "That program isn't part of this college." };
    // If a school is also chosen, the program must belong to it (when scoped).
    if (schoolId && program.school_id && program.school_id !== schoolId) {
      return { ok: false, error: "That program isn't in the chosen school." };
    }
  }

  const degreeType = target.degreeType?.trim() || null;
  const intendedMajor = target.intendedMajor?.trim() || null;

  const { error } = await supabase
    .from("user_colleges")
    .update({
      school_id: schoolId,
      program_id: programId,
      degree_type: degreeType,
      intended_major: intendedMajor,
    })
    .eq("user_id", userId)
    .eq("college_id", collegeId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/colleges");
  return { ok: true };
}
