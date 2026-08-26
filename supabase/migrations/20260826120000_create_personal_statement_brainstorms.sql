-- Personal Statement brainstorming workspace (one row per user).
--
-- Brainstorming happens BEFORE (or alongside) any essay, so it is not tied to a
-- statement or draft. `inputs` holds the student's own exercise answers (the
-- "student who…" line, essence objects, values, freewriting) — user-editable, so
-- this table gets full owner RLS like the drafts table. `insights` holds the AI
-- synthesis, written by the service-role brainstorm route (which bypasses RLS);
-- keeping it in the same row is fine because it's the student's own low-stakes
-- exploration, not a score that must be forgery-proof.
--
-- One row per user (unique user_id) so the route/actions can upsert on user_id.

create table if not exists public.personal_statement_brainstorms (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  inputs            jsonb not null default '{}'::jsonb,
  insights          jsonb,
  model             text,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.personal_statement_brainstorms enable row level security;

create policy "personal_statement_brainstorms_select"
  on public.personal_statement_brainstorms
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "personal_statement_brainstorms_insert"
  on public.personal_statement_brainstorms
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "personal_statement_brainstorms_update"
  on public.personal_statement_brainstorms
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "personal_statement_brainstorms_delete"
  on public.personal_statement_brainstorms
  for delete to authenticated
  using (user_id = (select auth.uid()));
