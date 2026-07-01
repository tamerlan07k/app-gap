-- Normalized profile schema for AppGap.
-- profiles: one row per user (1:1 with auth.users), holds all scalar fields.
-- courses, activities, awards: child tables linked to profiles.id via user_id.

-- ─── profiles ────────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  -- Academic info (Step 1)
  grade_level     text,
  unweighted_gpa  numeric(3,2),
  sat_score       integer,
  act_score       integer,
  -- Career direction (Step 2)
  major_category  text,
  specific_major  text,
  career_interest text,
  selectivity     text,
  -- Timestamps
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "profiles_insert" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = id);

create policy "profiles_update" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "profiles_delete" on public.profiles
  for delete to authenticated
  using ((select auth.uid()) = id);

-- ─── courses ─────────────────────────────────────────────────────────────────

create table if not exists public.courses (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  name          text not null default '',
  type          text not null default '',
  status        text not null default '',
  grade_level   text not null default '',
  ap_exam_score text not null default '',
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

alter table public.courses enable row level security;

create index if not exists courses_user_id_idx on public.courses(user_id);

create policy "courses_select" on public.courses
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "courses_insert" on public.courses
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "courses_update" on public.courses
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "courses_delete" on public.courses
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── activities ──────────────────────────────────────────────────────────────

create table if not exists public.activities (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  name            text not null default '',
  category        text not null default '',
  grades          text[] not null default '{}',
  leadership_role text not null default '',
  description     text not null default '',
  hours_per_week  integer,
  weeks_per_year  integer,
  meaningfulness  integer check (meaningfulness between 1 and 5),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

alter table public.activities enable row level security;

create index if not exists activities_user_id_idx on public.activities(user_id);

create policy "activities_select" on public.activities
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "activities_insert" on public.activities
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "activities_update" on public.activities
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "activities_delete" on public.activities
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── awards ──────────────────────────────────────────────────────────────────

create table if not exists public.awards (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  name       text not null default '',
  level      text not null default '',
  grade      text not null default '',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.awards enable row level security;

create index if not exists awards_user_id_idx on public.awards(user_id);

create policy "awards_select" on public.awards
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "awards_insert" on public.awards
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "awards_update" on public.awards
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "awards_delete" on public.awards
  for delete to authenticated
  using (user_id = (select auth.uid()));
