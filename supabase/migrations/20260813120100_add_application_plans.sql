-- My Colleges: exploration → finalized phases + per-college application plan.
--
-- selected_round_id lets a user pick, for a finalized college, exactly one of
-- the rounds that college actually offers (a row in application_rounds, which
-- carries round_type + deadline). This is the hook a future application-roadmap
-- generator reads: college + round + deadline. ON DELETE SET NULL so a round
-- being re-structured never orphans the FK.

alter table public.user_colleges
  add column if not exists selected_round_id uuid
    references public.application_rounds(id) on delete set null;

-- One-row-per-user list state. finalized_at set = the user has locked in their
-- planned application list (still editable; finalization is a mode, not a lock).

create table if not exists public.user_college_state (
  user_id     uuid primary key references public.profiles(id) on delete cascade,
  finalized_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.user_college_state enable row level security;

create policy "user_college_state_select" on public.user_college_state
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_college_state_insert" on public.user_college_state
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_college_state_update" on public.user_college_state
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_college_state_delete" on public.user_college_state
  for delete to authenticated
  using (user_id = (select auth.uid()));
