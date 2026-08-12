-- My Colleges: the per-user saved college list that powers the matching /
-- chancing dashboard. One row per (user, college). Category (safety/target/
-- reach) is NOT stored here — it is computed at read time from the user's
-- profile and the college's standardized admission stats, so it always reflects
-- the current profile rather than a stale snapshot.
--
-- This is USER-OWNED data (unlike the public college reference tables), so it
-- gets granular per-operation RLS scoped to the owner, matching courses /
-- activities / awards.

create table if not exists public.user_colleges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  -- How the college entered the list: 'recommended' (from the balanced-list
  -- generator) or 'manual' (user added it). Purely informational.
  source     text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (user_id, college_id)
);

alter table public.user_colleges enable row level security;

create index if not exists user_colleges_user_id_idx
  on public.user_colleges (user_id);
create index if not exists user_colleges_college_id_idx
  on public.user_colleges (college_id);

create policy "user_colleges_select" on public.user_colleges
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_colleges_insert" on public.user_colleges
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "user_colleges_update" on public.user_colleges
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "user_colleges_delete" on public.user_colleges
  for delete to authenticated
  using (user_id = (select auth.uid()));
