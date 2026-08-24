"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "~/lib/is-admin";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/** Defense-in-depth: every action re-checks admin (the layout gate protects the
 * page, not these server-action endpoints). */
async function requireAdmin(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user.email))
    return { ok: false, error: "Not authorized." };
  return { ok: true };
}

async function revalidateFor(collegeId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("colleges")
    .select("slug")
    .eq("id", collegeId)
    .maybeSingle();
  if (data?.slug) revalidatePath(`/dashboard/colleges/${data.slug}`);
  revalidatePath("/admin/college-content");
}

/**
 * Save the School-History prose for a college. `published` gates public display:
 * true sets history_verified_at (visible on the college page), false clears it
 * (stays a draft). Content is stored either way so a draft is never lost.
 */
export async function saveCollegeHistory(
  collegeId: string,
  input: { history: string; sourceUrl: string; published: boolean },
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!collegeId) return { ok: false, error: "Missing college." };

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("college_profiles").upsert(
    {
      college_id: collegeId,
      history: input.history.trim() || null,
      history_source_url: input.sourceUrl.trim() || null,
      history_verified_at: input.published ? now : null,
      updated_at: now,
    },
    { onConflict: "college_id" },
  );
  if (error) return { ok: false, error: error.message };

  await revalidateFor(collegeId);
  return { ok: true };
}

/**
 * Bulk-publish EVERY history draft (history present, not yet verified) in one
 * action. Intended for use after a spot-check confirms quality. Detail pages
 * render dynamically (no cache), so they reflect this on next load; we only
 * revalidate the admin list so its status pills refresh.
 */
export async function publishAllHistoryDrafts(): Promise<
  Result & { count?: number }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("college_profiles")
    .update({ history_verified_at: now, updated_at: now })
    .not("history", "is", null)
    .is("history_verified_at", null)
    .select("college_id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/** Undo: unpublish ALL currently-published history (keeps the text as a draft).
 * A safety valve if a bulk publish surfaced a problem. */
export async function unpublishAllHistory(): Promise<
  Result & { count?: number }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("college_profiles")
    .update({ history_verified_at: null, updated_at: new Date().toISOString() })
    .not("history_verified_at", "is", null)
    .select("college_id");
  if (error) return { ok: false, error: error.message };

  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/** Bulk-publish every fit-facet draft (fit present, not yet verified). */
export async function publishAllFitDrafts(): Promise<
  Result & { count?: number }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("college_profiles")
    .update({ fit_verified_at: now, updated_at: now })
    .not("fit", "is", null)
    .is("fit_verified_at", null)
    .select("college_id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/** Undo: unpublish ALL currently-published fit facets (kept as drafts). */
export async function unpublishAllFit(): Promise<Result & { count?: number }> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("college_profiles")
    .update({ fit_verified_at: null, updated_at: new Date().toISOString() })
    .not("fit_verified_at", "is", null)
    .select("college_id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/** Bulk-publish every program-strength draft (verified_at not yet set). */
export async function publishAllProgramDrafts(): Promise<
  Result & { count?: number }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await admin
    .from("college_field_strengths")
    .update({ verified_at: now, updated_at: now })
    .is("verified_at", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/** Undo: unpublish ALL currently-published program strengths (kept as drafts). */
export async function unpublishAllProgram(): Promise<
  Result & { count?: number }
> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("college_field_strengths")
    .update({ verified_at: null, updated_at: new Date().toISOString() })
    .not("verified_at", "is", null)
    .select("id");
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/college-content");
  return { ok: true, count: (data ?? []).length };
}

/**
 * Save the Section-3 "fit" facets. Same publish gate via fit_verified_at. The
 * five facets share one gate so they publish/unpublish together.
 */
export async function saveCollegeFit(
  collegeId: string,
  input: {
    fit: {
      campusLife: string;
      diversity: string;
      opportunities: string;
      vibe: string;
      careerFit: string;
    };
    sourceUrl: string;
    published: boolean;
  },
): Promise<Result> {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;
  if (!collegeId) return { ok: false, error: "Missing college." };

  // Store only non-empty facets; if all are empty, store null (nothing to show).
  const trimmed = Object.fromEntries(
    Object.entries(input.fit)
      .map(([k, v]) => [k, v.trim()])
      .filter(([, v]) => v),
  );
  const fit = Object.keys(trimmed).length > 0 ? trimmed : null;

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("college_profiles").upsert(
    {
      college_id: collegeId,
      fit,
      fit_source_url: input.sourceUrl.trim() || null,
      fit_verified_at: input.published && fit ? now : null,
      updated_at: now,
    },
    { onConflict: "college_id" },
  );
  if (error) return { ok: false, error: error.message };

  await revalidateFor(collegeId);
  return { ok: true };
}
