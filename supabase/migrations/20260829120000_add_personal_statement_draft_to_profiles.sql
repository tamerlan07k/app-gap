-- Optional onboarding personal-statement text.
--
-- Mirrors additional_context: a nullable free-text column the student may fill in
-- during the (optional) onboarding Personal Statement step. When present, the
-- onboarding diagnostic scores it and it contributes 15% to the overall AppGap
-- score; when null, scoring renormalizes over the other components (no penalty).
-- Distinct from the full Personal Statement feature's own drafts tables.
--
-- No RLS change: profiles already has full owner policies covering this column.

alter table public.profiles
  add column if not exists personal_statement_draft text;
