-- Personal Statement workspace: user-editable essays and their drafts.
--
-- Unlike the read-only AI caches (writing_analyses, activity_analyses) which are
-- written only by the service-role API routes, these two tables hold content the
-- STUDENT edits directly from the client. They therefore get full owner RLS
-- (select/insert/update/delete on auth.uid()), exactly like the activities table.
--
-- A student can have multiple personal_statements (e.g. a main Common App essay
-- plus an alternate), and each statement has one or more drafts. Drafts let the
-- student iterate — write Draft 1, then branch Draft 2 from it (a server-side
-- content copy, no manual re-typing). The AI coach (Phase 2) is not wired here;
-- its per-draft analysis cache is a separate, later migration.

-- ─── personal_statements ─────────────────────────────────────────────────────
-- The essay container: title + which prompt the student is answering. When the
-- prompt is the free-choice "own" option, custom_prompt holds their own prompt
-- text. prompt_id is stored as free text (validated in application code against
-- the known prompt set) so adding/renaming prompts never needs a migration.

create table if not exists public.personal_statements (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  prompt_id     text not null default '',
  custom_prompt text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.personal_statements enable row level security;

create index if not exists personal_statements_user_id_idx
  on public.personal_statements(user_id);

create policy "personal_statements_select" on public.personal_statements
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "personal_statements_insert" on public.personal_statements
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "personal_statements_update" on public.personal_statements
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "personal_statements_delete" on public.personal_statements
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── personal_statement_drafts ───────────────────────────────────────────────
-- One or more drafts per statement. content is the essay text; word_count is
-- persisted (recomputed server-side on save) so lists can show it without
-- re-counting. is_current marks the draft the student treats as their working
-- copy (the coach will analyze this one in Phase 2). user_id is denormalized
-- from the parent statement so RLS and owner filters stay simple and indexed.

create table if not exists public.personal_statement_drafts (
  id            uuid primary key default gen_random_uuid(),
  statement_id  uuid not null references public.personal_statements(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  label         text not null default 'Draft 1',
  content       text not null default '',
  word_count    integer not null default 0,
  is_current    boolean not null default false,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.personal_statement_drafts enable row level security;

create index if not exists personal_statement_drafts_statement_id_idx
  on public.personal_statement_drafts(statement_id);
create index if not exists personal_statement_drafts_user_id_idx
  on public.personal_statement_drafts(user_id);

create policy "personal_statement_drafts_select" on public.personal_statement_drafts
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "personal_statement_drafts_insert" on public.personal_statement_drafts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "personal_statement_drafts_update" on public.personal_statement_drafts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "personal_statement_drafts_delete" on public.personal_statement_drafts
  for delete to authenticated
  using (user_id = (select auth.uid()));
