-- Stores AI-generated roadmaps. One row per generation — users may have multiple
-- saved roadmaps over time.

create table if not exists public.roadmaps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  content        text not null,
  grade_level    text,
  timeline_stage text,
  created_at     timestamptz not null default now()
);

alter table public.roadmaps enable row level security;

create index if not exists roadmaps_user_id_idx on public.roadmaps(user_id);

create policy "roadmaps_select" on public.roadmaps
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "roadmaps_insert" on public.roadmaps
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "roadmaps_delete" on public.roadmaps
  for delete to authenticated
  using (user_id = (select auth.uid()));
