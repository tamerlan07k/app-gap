"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "~/lib/supabase/server";
import { countWords } from "~/lib/supplemental/text";
import type { SupplementalEssayDTO } from "~/lib/supplemental/types";

// Server-side CRUD for the Supplemental Essays workspace, owner-scoped (RLS +
// explicit user_id filter). Single content per prompt (no multi-draft model);
// finalizing copies the working content into the frozen snapshot columns.
// Content autosave (updateEssayContent) does NOT revalidate — the client holds
// the authoritative text. Structural changes (add / delete / finalize / status)
// do revalidate so a fresh load and the college progress are correct.

const PATH = "/dashboard/profile/supplemental-essays";

type Err = { ok: false; error: string };
type Result = { ok: true } | Err;
type ResultWith<T> = ({ ok: true } & T) | Err;

const promptSchema = z.string().trim().min(1).max(4000);
const contentSchema = z.string().max(20000);
const wordLimitSchema = z.number().int().positive().max(2000).nullable();
const statusSchema = z.enum([
  "not_started",
  "drafting",
  "needs_revision",
  "finalized",
]);

const ANALYSIS_KINDS = ["parse", "evaluation", "line_by_line", "redundancy"];

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

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
    status: (row.status as SupplementalEssayDTO["status"]) ?? "not_started",
    finalizedContent: (row.finalized_content as string | null) ?? null,
    finalizedWordCount: (row.finalized_word_count as number | null) ?? null,
    finalizedAt: (row.finalized_at as string | null) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function addEssay(
  collegeId: string,
  rawPrompt: string,
  rawWordLimit: number | null = null,
): Promise<ResultWith<{ essay: SupplementalEssayDTO }>> {
  if (!collegeId) return { ok: false, error: "Missing college." };
  const prompt = promptSchema.safeParse(rawPrompt);
  if (!prompt.success) return { ok: false, error: "Enter the prompt text." };
  const wordLimit = wordLimitSchema.safeParse(rawWordLimit);
  if (!wordLimit.success) return { ok: false, error: "Invalid word limit." };

  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("supplemental_essays")
    .insert({
      user_id: userId,
      college_id: collegeId,
      prompt_text: prompt.data,
      word_limit: wordLimit.data,
      prompt_source: "manual",
      content: "",
      word_count: 0,
      status: "not_started",
    })
    .select(ESSAY_COLS)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not add the essay." };
  }

  revalidatePath(PATH);
  revalidatePath(`${PATH}/${collegeId}`);
  return { ok: true, essay: essayFromRow(data) };
}

/**
 * Start an essay from an official (verified) catalog prompt. Copies the prompt
 * text + word limit from the verified prompt, tags the essay as catalog-sourced,
 * and links catalog_prompt_id (so the workspace can mark that prompt as added).
 * If the student already has an essay for this catalog prompt, returns it instead
 * of creating a duplicate.
 */
export async function addEssayFromPrompt(
  collegeId: string,
  catalogPromptId: string,
): Promise<ResultWith<{ essay: SupplementalEssayDTO }>> {
  if (!collegeId || !catalogPromptId) {
    return { ok: false, error: "Missing prompt." };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Only ever copy a VERIFIED prompt for this college (the invariant).
  const { data: prompt } = await supabase
    .from("college_supplemental_prompts")
    .select("id, college_id, prompt_text, word_limit, verified_at")
    .eq("id", catalogPromptId)
    .eq("college_id", collegeId)
    .not("verified_at", "is", null)
    .maybeSingle();
  if (!prompt) {
    return { ok: false, error: "That prompt is no longer available." };
  }

  // Don't create a duplicate if this catalog prompt is already started.
  const { data: existing } = await supabase
    .from("supplemental_essays")
    .select(ESSAY_COLS)
    .eq("user_id", userId)
    .eq("catalog_prompt_id", catalogPromptId)
    .maybeSingle();
  if (existing) {
    return { ok: true, essay: essayFromRow(existing) };
  }

  const { data, error } = await supabase
    .from("supplemental_essays")
    .insert({
      user_id: userId,
      college_id: collegeId,
      prompt_text: prompt.prompt_text as string,
      word_limit: (prompt.word_limit as number | null) ?? null,
      prompt_source: "catalog",
      catalog_prompt_id: catalogPromptId,
      content: "",
      word_count: 0,
      status: "not_started",
    })
    .select(ESSAY_COLS)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not add the essay." };
  }

  revalidatePath(PATH);
  revalidatePath(`${PATH}/${collegeId}`);
  return { ok: true, essay: essayFromRow(data) };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateEssayContent(
  essayId: string,
  content: string,
): Promise<
  ResultWith<{ wordCount: number; status: SupplementalEssayDTO["status"] }>
> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success)
    return { ok: false, error: "Essay is too long to save." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const wordCount = countWords(parsed.data);

  // Auto-advance a not-yet-started essay to "drafting" once there's text; never
  // downgrade a finalized/needs-revision essay from an autosave.
  const { data: existing } = await supabase
    .from("supplemental_essays")
    .select("status")
    .eq("id", essayId)
    .eq("user_id", userId)
    .maybeSingle();
  const currentStatus =
    (existing?.status as SupplementalEssayDTO["status"]) ?? "not_started";
  const nextStatus: SupplementalEssayDTO["status"] =
    currentStatus === "not_started" && wordCount > 0
      ? "drafting"
      : currentStatus;

  const { error } = await supabase
    .from("supplemental_essays")
    .update({
      content: parsed.data,
      word_count: wordCount,
      status: nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", essayId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  // No revalidate: autosave path.
  return { ok: true, wordCount, status: nextStatus };
}

/**
 * Update the prompt text / word limit. Changing the prompt invalidates the cached
 * analyses (the parse, evaluation, and line-by-line were about the OLD prompt), so
 * we clear them — they'll be regenerated on demand.
 */
export async function updateEssayPrompt(
  essayId: string,
  rawPrompt: string,
  rawWordLimit: number | null,
): Promise<Result> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const prompt = promptSchema.safeParse(rawPrompt);
  if (!prompt.success) return { ok: false, error: "Enter the prompt text." };
  const wordLimit = wordLimitSchema.safeParse(rawWordLimit);
  if (!wordLimit.success) return { ok: false, error: "Invalid word limit." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("supplemental_essays")
    .update({
      prompt_text: prompt.data,
      word_limit: wordLimit.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", essayId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  // Invalidate stale analyses tied to the old prompt.
  await supabase
    .from("supplemental_essay_analyses")
    .delete()
    .eq("essay_id", essayId)
    .eq("user_id", userId)
    .in("kind", ANALYSIS_KINDS);

  revalidatePath(PATH);
  return { ok: true };
}

export async function setEssayStatus(
  essayId: string,
  status: SupplementalEssayDTO["status"],
): Promise<Result> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const parsed = statusSchema.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("supplemental_essays")
    .update({ status: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", essayId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteEssay(essayId: string): Promise<Result> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("supplemental_essays")
    .delete()
    .eq("id", essayId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

// ─── Finalization ─────────────────────────────────────────────────────────────

/**
 * Finalize an essay: copy its working content into the frozen snapshot columns
 * and set status to "finalized". Called AFTER the client flushes any pending
 * autosave. The snapshot is independent of later content edits.
 */
export async function finalizeEssay(
  essayId: string,
): Promise<ResultWith<{ essay: SupplementalEssayDTO }>> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { data: essay } = await supabase
    .from("supplemental_essays")
    .select("content, word_count")
    .eq("id", essayId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!essay) return { ok: false, error: "Essay not found." };
  const content = (essay.content as string) ?? "";
  if (!content.trim()) {
    return { ok: false, error: "Write the essay before finalizing it." };
  }

  const finalizedAt = new Date().toISOString();
  const { data, error } = await supabase
    .from("supplemental_essays")
    .update({
      finalized_content: content,
      finalized_word_count: (essay.word_count as number) ?? countWords(content),
      finalized_at: finalizedAt,
      status: "finalized",
      updated_at: finalizedAt,
    })
    .eq("id", essayId)
    .eq("user_id", userId)
    .select(ESSAY_COLS)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not finalize." };
  }

  revalidatePath(PATH);
  revalidatePath(`${PATH}/${data.college_id}`);
  return { ok: true, essay: essayFromRow(data) };
}

/** Clear the finalized snapshot and return the essay to drafting. */
export async function unfinalizeEssay(
  essayId: string,
): Promise<ResultWith<{ essay: SupplementalEssayDTO }>> {
  if (!essayId) return { ok: false, error: "Missing essay." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { data, error } = await supabase
    .from("supplemental_essays")
    .update({
      finalized_content: null,
      finalized_word_count: null,
      finalized_at: null,
      status: "drafting",
      updated_at: new Date().toISOString(),
    })
    .eq("id", essayId)
    .eq("user_id", userId)
    .select(ESSAY_COLS)
    .single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Could not update." };
  }

  revalidatePath(PATH);
  revalidatePath(`${PATH}/${data.college_id}`);
  return { ok: true, essay: essayFromRow(data) };
}
