-- Add finalization to personal_statements: a frozen snapshot of one chosen draft.
--
-- Finalizing copies a draft's text into these columns AT THAT MOMENT, so later
-- edits to the source draft never change the finalized version. finalized_at
-- being non-null is the flag that a final exists. finalized_from_draft_id and
-- finalized_from_label are kept only for display ("finalized from Draft 3") —
-- the id is deliberately NOT a foreign key so deleting the source draft leaves
-- the snapshot intact.
--
-- No RLS changes: personal_statements already has owner select/update policies
-- that cover these columns.

alter table public.personal_statements
  add column if not exists finalized_content       text,
  add column if not exists finalized_at            timestamptz,
  add column if not exists finalized_from_draft_id uuid,
  add column if not exists finalized_from_label    text,
  add column if not exists finalized_word_count    integer;
