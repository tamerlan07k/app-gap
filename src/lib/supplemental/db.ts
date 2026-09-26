// Server-side reads for the Supplemental Essays workspace. Owner-scoped via the
// RLS client passed in. Assembles the college list (from My Colleges) with the
// student's essays grouped under it, and per-essay workspace data (essay + cached
// analyses + chat thread). Also exposes the qualitative college-level signal used
// by My Colleges — derived only from essay STATUS, never from chancing.

import type { SupabaseClient } from "@supabase/supabase-js";
import { CURRENT_CYCLE_YEAR } from "~/lib/colleges/types";
import { chatThreadSchema } from "./chat";
import {
  evaluationSchema,
  lineByLineSchema,
  parseSchema,
  redundancySchema,
} from "./schemas";
import {
  type CollegeEssaySignal,
  deriveCollegeSignal,
  type EssayStatus,
} from "./status";
import type {
  CollegeCatalogInfo,
  CollegeEssayGroupDTO,
  EssayWorkspaceData,
  SupplementalEssayDTO,
  SupplementStatus,
  VerifiedPromptDTO,
} from "./types";

const ESSAY_COLS =
  "id, college_id, prompt_text, word_limit, prompt_source, catalog_prompt_id, content, word_count, status, finalized_content, finalized_word_count, finalized_at, created_at, updated_at";

function essayFromRow(row: Record<string, unknown>): SupplementalEssayDTO {
  return {
    id: row.id as string,
    collegeId: row.college_id as string,
    promptText: (row.prompt_text as string) ?? "",
    wordLimit: (row.word_limit as number | null) ?? null,
    promptSource: ((row.prompt_source as string) ?? "manual") as
      | "manual"
      | "catalog",
    catalogPromptId: (row.catalog_prompt_id as string | null) ?? null,
    content: (row.content as string) ?? "",
    wordCount: (row.word_count as number) ?? 0,
    status: (row.status as EssayStatus) ?? "not_started",
    finalizedContent: (row.finalized_content as string | null) ?? null,
    finalizedWordCount: (row.finalized_word_count as number | null) ?? null,
    finalizedAt: (row.finalized_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

/**
 * Load the colleges the student is applying to (from My Colleges) plus any
 * college they've already written essays for, with their essays grouped under
 * each. Colleges with no essays still appear so the student can start.
 */
export async function loadEssayGroups(
  client: SupabaseClient,
  userId: string,
): Promise<CollegeEssayGroupDTO[]> {
  const [savedRes, essaysRes] = await Promise.all([
    client
      .from("user_colleges")
      .select("college_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    client
      .from("supplemental_essays")
      .select(ESSAY_COLS)
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
  ]);

  const essays = (essaysRes.data ?? []).map(essayFromRow);
  const essaysByCollege = new Map<string, SupplementalEssayDTO[]>();
  for (const e of essays) {
    if (!essaysByCollege.has(e.collegeId)) essaysByCollege.set(e.collegeId, []);
    essaysByCollege.get(e.collegeId)?.push(e);
  }

  // Union of saved colleges (in order) + any college that has essays.
  const orderedIds: string[] = [];
  const seen = new Set<string>();
  for (const row of savedRes.data ?? []) {
    const id = row.college_id as string;
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }
  for (const id of essaysByCollege.keys()) {
    if (!seen.has(id)) {
      seen.add(id);
      orderedIds.push(id);
    }
  }

  if (orderedIds.length === 0) return [];

  const { data: colleges } = await client
    .from("colleges")
    .select("id, canonical_name, slug, logo_asset_path, logo_url")
    .in("id", orderedIds);
  const nameById = new Map(
    (colleges ?? []).map((c) => [
      c.id as string,
      {
        name: c.canonical_name as string,
        slug: c.slug as string | null,
        logoAssetPath: (c.logo_asset_path as string | null) ?? null,
        logoUrl: (c.logo_url as string | null) ?? null,
      },
    ]),
  );

  return orderedIds.map((id) => {
    const meta = nameById.get(id);
    return {
      collegeId: id,
      collegeName: meta?.name ?? "Unknown college",
      slug: meta?.slug ?? null,
      logoAssetPath: meta?.logoAssetPath ?? null,
      logoUrl: meta?.logoUrl ?? null,
      essays: essaysByCollege.get(id) ?? [],
    };
  });
}

/** One college's group (name/slug/logo + its essays), or null if not found. */
export async function loadCollegeGroup(
  client: SupabaseClient,
  userId: string,
  collegeId: string,
): Promise<CollegeEssayGroupDTO | null> {
  const [collegeRes, essaysRes] = await Promise.all([
    client
      .from("colleges")
      .select("id, canonical_name, slug, logo_asset_path, logo_url")
      .eq("id", collegeId)
      .maybeSingle(),
    client
      .from("supplemental_essays")
      .select(ESSAY_COLS)
      .eq("user_id", userId)
      .eq("college_id", collegeId)
      .order("created_at", { ascending: true }),
  ]);
  if (!collegeRes.data) return null;
  return {
    collegeId,
    collegeName: collegeRes.data.canonical_name as string,
    slug: (collegeRes.data.slug as string | null) ?? null,
    logoAssetPath: (collegeRes.data.logo_asset_path as string | null) ?? null,
    logoUrl: (collegeRes.data.logo_url as string | null) ?? null,
    essays: (essaysRes.data ?? []).map(essayFromRow),
  };
}

/**
 * Load the official, VERIFIED supplemental prompts for a college in the current
 * application cycle. Only rows with verified_at set are ever returned (the
 * project-wide invariant); the table ships empty, so this returns [] until real
 * prompt data is ingested and human-verified. Never invents prompt text.
 */
export async function loadVerifiedPrompts(
  client: SupabaseClient,
  collegeId: string,
): Promise<VerifiedPromptDTO[]> {
  try {
    const { data } = await client
      .from("college_supplemental_prompts")
      .select(
        "id, prompt_text, word_limit, is_required, sort_order, school_id, college_schools(name)",
      )
      .eq("college_id", collegeId)
      .eq("cycle_year", CURRENT_CYCLE_YEAR)
      .not("verified_at", "is", null)
      .order("sort_order", { ascending: true });
    return (data ?? []).map((r) => {
      // PostgREST returns a to-one embed as an object, but can surface an array;
      // handle both.
      const rawSchool = r.college_schools as
        | { name?: string }
        | { name?: string }[]
        | null;
      const school = Array.isArray(rawSchool) ? rawSchool[0] : rawSchool;
      return {
        id: r.id as string,
        promptText: (r.prompt_text as string) ?? "",
        wordLimit: (r.word_limit as number | null) ?? null,
        isRequired: (r.is_required as boolean) ?? true,
        schoolName: school?.name ?? null,
        schoolId: (r.school_id as string | null) ?? null,
      };
    });
  } catch {
    // Table not present yet in some environments — degrade to no catalog.
    return [];
  }
}

/**
 * The student's selected undergraduate school for a college, from My Colleges
 * (user_colleges.school_id). Null when they haven't added the college or haven't
 * picked a specific school. Used to show only the supplemental prompts that apply
 * to their school (plus university-wide prompts).
 */
export async function loadUserCollegeSchool(
  client: SupabaseClient,
  userId: string,
  collegeId: string,
): Promise<string | null> {
  try {
    const { data } = await client
      .from("user_colleges")
      .select("school_id")
      .eq("user_id", userId)
      .eq("college_id", collegeId)
      .maybeSingle();
    return (data?.school_id as string | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Load the verified supplemental COVERAGE STATUS for a college in the current
 * cycle. Only a row with verified_at set is authoritative; an unverified or
 * missing row is reported as "pending" (prompts unknown). This is what lets the
 * UI show "No supplemental essays required" (none_required) distinctly from the
 * paste-your-own fallback (pending).
 */
export async function loadSupplementStatus(
  client: SupabaseClient,
  collegeId: string,
): Promise<SupplementStatus> {
  try {
    const { data } = await client
      .from("college_supplement_status")
      .select("status, verified_at")
      .eq("college_id", collegeId)
      .eq("cycle_year", CURRENT_CYCLE_YEAR)
      .maybeSingle();
    if (!data || !data.verified_at) return "pending";
    return (data.status as SupplementStatus) ?? "pending";
  } catch {
    // Table not present yet in some environments — degrade to pending.
    return "pending";
  }
}

/**
 * Batched catalog summary for the college LIST: for each requested college, the
 * verified coverage status and its verified official-prompt count. Prompts always
 * win — any college with >=1 verified prompt is reported has_supplements even if
 * its status row lags. Colleges with no verified prompts fall back to their
 * verified status row (none_required), else pending. Colleges not returned by
 * either query are implicitly pending.
 */
export async function loadCollegeCatalogInfo(
  client: SupabaseClient,
  collegeIds: string[],
): Promise<Map<string, CollegeCatalogInfo>> {
  const out = new Map<string, CollegeCatalogInfo>();
  if (collegeIds.length === 0) return out;
  try {
    const [promptsRes, statusRes] = await Promise.all([
      client
        .from("college_supplemental_prompts")
        .select("college_id")
        .in("college_id", collegeIds)
        .eq("cycle_year", CURRENT_CYCLE_YEAR)
        .not("verified_at", "is", null),
      client
        .from("college_supplement_status")
        .select("college_id, status, verified_at")
        .in("college_id", collegeIds)
        .eq("cycle_year", CURRENT_CYCLE_YEAR),
    ]);

    const promptCounts = new Map<string, number>();
    for (const row of promptsRes.data ?? []) {
      const id = row.college_id as string;
      promptCounts.set(id, (promptCounts.get(id) ?? 0) + 1);
    }
    const verifiedStatus = new Map<string, SupplementStatus>();
    for (const row of statusRes.data ?? []) {
      if (!row.verified_at) continue;
      verifiedStatus.set(
        row.college_id as string,
        (row.status as SupplementStatus) ?? "pending",
      );
    }

    for (const id of collegeIds) {
      const count = promptCounts.get(id) ?? 0;
      if (count > 0) {
        out.set(id, { status: "has_supplements", promptCount: count });
      } else {
        out.set(id, {
          status: verifiedStatus.get(id) ?? "pending",
          promptCount: 0,
        });
      }
    }
    return out;
  } catch {
    for (const id of collegeIds)
      out.set(id, { status: "pending", promptCount: 0 });
    return out;
  }
}

/**
 * Load everything the prompt workspace needs: the essay, its college, all cached
 * analyses (defensively re-validated — stale/older shapes are dropped), and the
 * chat thread. Returns null when the essay isn't the user's.
 */
export async function loadEssayWorkspace(
  client: SupabaseClient,
  userId: string,
  essayId: string,
): Promise<EssayWorkspaceData | null> {
  const { data: essayRow, error: essayErr } = await client
    .from("supplemental_essays")
    .select(ESSAY_COLS)
    .eq("id", essayId)
    .eq("user_id", userId)
    .maybeSingle();
  // Surface a real query failure (e.g. a schema/migration gap) so it is never
  // silently mistaken for "essay not found" (which renders a 404).
  if (essayErr) {
    console.error(
      "[supplemental] loadEssayWorkspace essay query failed:",
      essayErr.message,
    );
  }
  if (!essayRow) return null;
  const essay = essayFromRow(essayRow);

  const [collegeRes, analysesRes, chatRes] = await Promise.all([
    client
      .from("colleges")
      .select("canonical_name, slug, logo_asset_path, logo_url")
      .eq("id", essay.collegeId)
      .maybeSingle(),
    client
      .from("supplemental_essay_analyses")
      .select("kind, analysis")
      .eq("essay_id", essayId)
      .in("kind", ["parse", "evaluation", "line_by_line", "redundancy"]),
    client
      .from("supplemental_essay_chats")
      .select("messages")
      .eq("essay_id", essayId)
      .maybeSingle(),
  ]);

  const byKind = new Map<string, unknown>();
  for (const row of analysesRes.data ?? []) {
    byKind.set(row.kind as string, row.analysis);
  }

  const parse = parseSchema.safeParse(byKind.get("parse"));
  const evaluation = evaluationSchema.safeParse(byKind.get("evaluation"));
  const lineByLine = lineByLineSchema.safeParse(byKind.get("line_by_line"));
  const redundancy = redundancySchema.safeParse(byKind.get("redundancy"));
  const chat = chatThreadSchema.safeParse(chatRes.data?.messages);

  return {
    essay,
    collegeName: (collegeRes.data?.canonical_name as string) ?? "",
    collegeSlug: (collegeRes.data?.slug as string | null) ?? null,
    logoAssetPath: (collegeRes.data?.logo_asset_path as string | null) ?? null,
    logoUrl: (collegeRes.data?.logo_url as string | null) ?? null,
    parse: parse.success ? parse.data : null,
    evaluation: evaluation.success ? evaluation.data : null,
    lineByLine: lineByLine.success ? lineByLine.data : null,
    redundancy: redundancy.success ? redundancy.data : null,
    chat: chat.success ? chat.data : [],
  };
}

/**
 * The qualitative My Colleges signal per college, derived ONLY from essay status
 * (never chancing). Returns a map collegeId → signal for colleges that have at
 * least one essay. Used by the My Colleges page.
 */
export async function loadCollegeEssaySignals(
  client: SupabaseClient,
  userId: string,
): Promise<Map<string, CollegeEssaySignal>> {
  const { data } = await client
    .from("supplemental_essays")
    .select("college_id, status")
    .eq("user_id", userId);

  const byCollege = new Map<string, EssayStatus[]>();
  for (const row of data ?? []) {
    const id = row.college_id as string;
    if (!byCollege.has(id)) byCollege.set(id, []);
    byCollege.get(id)?.push((row.status as EssayStatus) ?? "not_started");
  }

  const out = new Map<string, CollegeEssaySignal>();
  for (const [id, statuses] of byCollege) {
    out.set(id, deriveCollegeSignal(statuses));
  }
  return out;
}
