"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { countWords } from "~/lib/personal-statement/prompts";
import { createClient } from "~/lib/supabase/server";

// Server-side CRUD for the Personal Statement workspace, scoped to the current
// user (RLS + explicit user_id filter). Two granularities of owner-scoped data:
// personal_statements (the essay + chosen prompt) and personal_statement_drafts
// (the iterated versions). Content autosave (updateStatement / updateDraftContent)
// deliberately does NOT revalidate — the client holds the authoritative text and
// a refetch on every keystroke-batch would churn the editor. Structural changes
// (create / clone / delete) do revalidate so a fresh load is correct.
//
// No AI is wired here — this is Phase 1 (the writing surface) only.

const PATH = "/dashboard/profile/personal-statement";

export type DraftDTO = {
  id: string;
  statementId: string;
  label: string;
  content: string;
  wordCount: number;
  isCurrent: boolean;
  sortOrder: number;
};

/** A frozen snapshot of one draft, chosen by the student as their final version. */
export type FinalVersionDTO = {
  content: string;
  finalizedAt: string;
  fromDraftId: string | null;
  fromLabel: string;
  wordCount: number;
};

export type StatementDTO = {
  id: string;
  title: string;
  promptId: string;
  customPrompt: string;
  drafts: DraftDTO[];
  final: FinalVersionDTO | null;
};

type Err = { ok: false; error: string };
/** Success with no payload. */
type Result = { ok: true } | Err;
/** Success carrying a payload T. */
type ResultWith<T> = ({ ok: true } & T) | Err;

// Prompt id is stored as free text and validated in the UI against the known
// set; here we only bound length so a malformed client can't write junk.
const statementFieldsSchema = z.object({
  title: z.string().trim().max(200).default(""),
  promptId: z.string().trim().max(40).default(""),
  customPrompt: z.string().trim().max(1000).default(""),
});

// Generous ceiling — a personal statement is ~650 words, but drafts can hold
// scratch text well above that; we never want autosave to reject real writing.
const contentSchema = z.string().max(20000);
const labelSchema = z.string().trim().min(1).max(60);

async function currentUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, userId: user?.id ?? null };
}

function draftFromRow(row: {
  id: string;
  statement_id: string;
  label: string;
  content: string;
  word_count: number;
  is_current: boolean;
  sort_order: number;
}): DraftDTO {
  return {
    id: row.id,
    statementId: row.statement_id,
    label: row.label,
    content: row.content,
    wordCount: row.word_count,
    isCurrent: row.is_current,
    sortOrder: row.sort_order,
  };
}

const DRAFT_COLS =
  "id, statement_id, label, content, word_count, is_current, sort_order";

// ─── Statements ──────────────────────────────────────────────────────────────

export async function createStatement(
  raw: z.input<typeof statementFieldsSchema>,
): Promise<ResultWith<{ statement: StatementDTO }>> {
  const parsed = statementFieldsSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: "Invalid statement." };
  }
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // FK requirement: ensure a profile row exists (mirrors addActivity).
  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id", ignoreDuplicates: true });
  if (profileError) return { ok: false, error: profileError.message };

  const { data: statementRow, error: statementError } = await supabase
    .from("personal_statements")
    .insert({
      user_id: userId,
      title: parsed.data.title || "My Personal Statement",
      prompt_id: parsed.data.promptId,
      custom_prompt: parsed.data.customPrompt,
    })
    .select("id, title, prompt_id, custom_prompt")
    .single();
  if (statementError || !statementRow) {
    return { ok: false, error: statementError?.message ?? "Could not create." };
  }

  // Every statement starts with one empty, current draft.
  const { data: draftRow, error: draftError } = await supabase
    .from("personal_statement_drafts")
    .insert({
      statement_id: statementRow.id,
      user_id: userId,
      label: "Draft 1",
      content: "",
      word_count: 0,
      is_current: true,
      sort_order: 0,
    })
    .select(DRAFT_COLS)
    .single();
  if (draftError || !draftRow) {
    return {
      ok: false,
      error: draftError?.message ?? "Could not create draft.",
    };
  }

  revalidatePath(PATH);
  return {
    ok: true,
    statement: {
      id: statementRow.id,
      title: statementRow.title,
      promptId: statementRow.prompt_id,
      customPrompt: statementRow.custom_prompt,
      drafts: [draftFromRow(draftRow)],
      final: null,
    },
  };
}

export async function updateStatement(
  id: string,
  raw: z.input<typeof statementFieldsSchema>,
): Promise<Result> {
  if (!id) return { ok: false, error: "Missing statement." };
  const parsed = statementFieldsSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Invalid statement." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("personal_statements")
    .update({
      title: parsed.data.title,
      prompt_id: parsed.data.promptId,
      custom_prompt: parsed.data.customPrompt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  // No revalidate: autosave path, client state is authoritative.
  return { ok: true };
}

export async function deleteStatement(id: string): Promise<Result> {
  if (!id) return { ok: false, error: "Missing statement." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("personal_statements")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

// ─── Drafts ──────────────────────────────────────────────────────────────────

/**
 * Create a new draft under a statement. When `fromDraftId` is given, its content
 * is copied server-side — the "branch from an existing draft without re-typing"
 * flow. The new draft becomes the current (working) draft.
 */
export async function createDraft(
  statementId: string,
  opts: { fromDraftId?: string; label?: string } = {},
): Promise<ResultWith<{ draft: DraftDTO }>> {
  if (!statementId) return { ok: false, error: "Missing statement." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Confirm the statement belongs to the user (RLS also enforces this).
  const { data: statement } = await supabase
    .from("personal_statements")
    .select("id")
    .eq("id", statementId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!statement) return { ok: false, error: "Statement not found." };

  // Existing drafts → next sort_order and default label.
  const { data: existing } = await supabase
    .from("personal_statement_drafts")
    .select("sort_order")
    .eq("statement_id", statementId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: false });
  const count = existing?.length ?? 0;
  const nextSort = ((existing?.[0]?.sort_order as number | null) ?? -1) + 1;

  // Optional clone source (must be the user's own draft in this statement).
  let content = "";
  if (opts.fromDraftId) {
    const { data: source } = await supabase
      .from("personal_statement_drafts")
      .select("content")
      .eq("id", opts.fromDraftId)
      .eq("statement_id", statementId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!source) return { ok: false, error: "Source draft not found." };
    content = (source.content as string) ?? "";
  }

  const label = (
    opts.label && labelSchema.safeParse(opts.label).success
      ? opts.label.trim()
      : `Draft ${count + 1}`
  ).slice(0, 60);

  // The new draft becomes current; clear the flag on the others.
  const { error: clearError } = await supabase
    .from("personal_statement_drafts")
    .update({ is_current: false })
    .eq("statement_id", statementId)
    .eq("user_id", userId);
  if (clearError) return { ok: false, error: clearError.message };

  const { data: draftRow, error: insertError } = await supabase
    .from("personal_statement_drafts")
    .insert({
      statement_id: statementId,
      user_id: userId,
      label,
      content,
      word_count: countWords(content),
      is_current: true,
      sort_order: nextSort,
    })
    .select(DRAFT_COLS)
    .single();
  if (insertError || !draftRow) {
    return {
      ok: false,
      error: insertError?.message ?? "Could not create draft.",
    };
  }

  revalidatePath(PATH);
  return { ok: true, draft: draftFromRow(draftRow) };
}

export async function updateDraftContent(
  draftId: string,
  content: string,
): Promise<ResultWith<{ wordCount: number }>> {
  if (!draftId) return { ok: false, error: "Missing draft." };
  const parsed = contentSchema.safeParse(content);
  if (!parsed.success)
    return { ok: false, error: "Draft is too long to save." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const wordCount = countWords(parsed.data);
  const { error } = await supabase
    .from("personal_statement_drafts")
    .update({
      content: parsed.data,
      word_count: wordCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", draftId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };
  // No revalidate: autosave path.
  return { ok: true, wordCount };
}

export async function renameDraft(
  draftId: string,
  label: string,
): Promise<Result> {
  if (!draftId) return { ok: false, error: "Missing draft." };
  const parsed = labelSchema.safeParse(label);
  if (!parsed.success) return { ok: false, error: "Enter a draft name." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("personal_statement_drafts")
    .update({ label: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", draftId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}

export async function setCurrentDraft(
  statementId: string,
  draftId: string,
): Promise<Result> {
  if (!statementId || !draftId) return { ok: false, error: "Missing draft." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Clear all, then set the chosen one — two owner-scoped updates.
  const { error: clearError } = await supabase
    .from("personal_statement_drafts")
    .update({ is_current: false })
    .eq("statement_id", statementId)
    .eq("user_id", userId);
  if (clearError) return { ok: false, error: clearError.message };

  const { error: setError } = await supabase
    .from("personal_statement_drafts")
    .update({ is_current: true })
    .eq("id", draftId)
    .eq("user_id", userId);
  if (setError) return { ok: false, error: setError.message };

  revalidatePath(PATH);
  return { ok: true };
}

export async function deleteDraft(
  statementId: string,
  draftId: string,
): Promise<ResultWith<{ newCurrentId: string | null }>> {
  if (!statementId || !draftId) return { ok: false, error: "Missing draft." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  // Don't allow deleting the last remaining draft — a statement always has one.
  const { data: siblings } = await supabase
    .from("personal_statement_drafts")
    .select("id, is_current, sort_order")
    .eq("statement_id", statementId)
    .eq("user_id", userId)
    .order("sort_order");
  if (!siblings || siblings.length <= 1) {
    return { ok: false, error: "A statement needs at least one draft." };
  }

  const target = siblings.find((d) => d.id === draftId);
  const { error } = await supabase
    .from("personal_statement_drafts")
    .delete()
    .eq("id", draftId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  // If we removed the current draft, promote the first remaining one.
  let newCurrentId: string | null = null;
  if (target?.is_current) {
    const fallback = siblings.find((d) => d.id !== draftId);
    if (fallback) {
      newCurrentId = fallback.id as string;
      await supabase
        .from("personal_statement_drafts")
        .update({ is_current: true })
        .eq("id", fallback.id)
        .eq("user_id", userId);
    }
  }

  revalidatePath(PATH);
  return { ok: true, newCurrentId };
}

// ─── Finalization ────────────────────────────────────────────────────────────

/**
 * Finalize a specific draft: copy its current text into the statement's frozen
 * snapshot columns. Called AFTER the client has flushed any pending autosave, so
 * the snapshot reflects the latest text. Overwrites any existing final (the
 * "replace final" path). The snapshot is independent — later edits to the source
 * draft do not touch it.
 */
export async function finalizeDraft(
  statementId: string,
  draftId: string,
): Promise<ResultWith<{ final: FinalVersionDTO }>> {
  if (!statementId || !draftId) return { ok: false, error: "Missing draft." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { data: draft } = await supabase
    .from("personal_statement_drafts")
    .select("content, label, word_count")
    .eq("id", draftId)
    .eq("statement_id", statementId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!draft) return { ok: false, error: "Draft not found." };

  const finalizedAt = new Date().toISOString();
  const content = (draft.content as string) ?? "";
  const label = (draft.label as string) ?? "";
  const wordCount = (draft.word_count as number) ?? 0;

  const { error } = await supabase
    .from("personal_statements")
    .update({
      finalized_content: content,
      finalized_at: finalizedAt,
      finalized_from_draft_id: draftId,
      finalized_from_label: label,
      finalized_word_count: wordCount,
      updated_at: finalizedAt,
    })
    .eq("id", statementId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return {
    ok: true,
    final: {
      content,
      finalizedAt,
      fromDraftId: draftId,
      fromLabel: label,
      wordCount,
    },
  };
}

/** Clear the finalized snapshot. Drafts are untouched. */
export async function unfinalizeStatement(
  statementId: string,
): Promise<Result> {
  if (!statementId) return { ok: false, error: "Missing statement." };
  const { supabase, userId } = await currentUserId();
  if (!userId) return { ok: false, error: "Not signed in." };

  const { error } = await supabase
    .from("personal_statements")
    .update({
      finalized_content: null,
      finalized_at: null,
      finalized_from_draft_id: null,
      finalized_from_label: null,
      finalized_word_count: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", statementId)
    .eq("user_id", userId);
  if (error) return { ok: false, error: error.message };

  revalidatePath(PATH);
  return { ok: true };
}
