-- Coursework analysis (My Profile → Coursework) — Phase 1 storage.
--
-- Adds TWO tables and touches NO existing one. The student's actual courses
-- already live in public.courses (name/type/status/grade_level/ap_exam_score);
-- this feature reuses that table as-is and adds only:
--
--   1. school_course_availability — the student's self-reported answer to
--      "does your high school OFFER this course?" for a short, curated list of
--      meaningful advanced courses. This is the ONLY truthful source of school
--      opportunity context we have (there is no verified course-catalog dataset),
--      so it is user-owned and self-reported. The default state is "unsure": the
--      coursework engine treats unknown availability as UNKNOWN CONTEXT, never as
--      a gap — AppGap must never call something a genuine academic gap when the
--      student may simply have lacked access to it.
--
--   2. coursework_analyses — one cached AI interpretation per user (upserted in
--      place), mirroring activity_analyses exactly. This is a PROFILE-ANALYSIS
--      feature only: it never feeds the AppGap Score, componentScores, or the
--      chancing engine. Kept in its own table with its own contract for that
--      isolation.

-- ─── school_course_availability ──────────────────────────────────────────────
-- User-owned self-report. course_key references the curated catalog defined in
-- src/lib/coursework/catalog.ts (kept in application code, not enumerated here,
-- so the checklist can evolve without a migration). availability is constrained
-- to the three states the engine understands.

create table if not exists public.school_course_availability (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  course_key   text not null,
  availability text not null default 'unsure'
    check (availability in ('offered', 'not_offered', 'unsure')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- One row per (user, course_key) so the save action can upsert on the pair.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'school_course_availability_user_course_key'
      and conrelid = 'public.school_course_availability'::regclass
  ) then
    alter table public.school_course_availability
      add constraint school_course_availability_user_course_key
      unique (user_id, course_key);
  end if;
end $$;

-- Index the column used by every RLS predicate (not already covered by the PK).
create index if not exists school_course_availability_user_id_idx
  on public.school_course_availability(user_id);

alter table public.school_course_availability enable row level security;

-- Granular, per-operation policies (one per operation, authenticated only) —
-- the same owner-scoped pattern as public.courses. Never FOR ALL.
create policy "school_course_availability_select"
  on public.school_course_availability
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "school_course_availability_insert"
  on public.school_course_availability
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "school_course_availability_update"
  on public.school_course_availability
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "school_course_availability_delete"
  on public.school_course_availability
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── coursework_analyses ─────────────────────────────────────────────────────
-- One cached AI analysis per user, upserted in place (mirrors activity_analyses).
-- Writes flow exclusively through the service-role API route, so — like
-- activity_analyses — there is no authenticated insert/update policy; only a
-- self-select policy. Never feeds the gap score or chancing engine.

create table if not exists public.coursework_analyses (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  analysis          jsonb not null,
  model             text not null,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- One row per user so the API route can upsert on user_id.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'coursework_analyses_user_id_key'
      and conrelid = 'public.coursework_analyses'::regclass
  ) then
    alter table public.coursework_analyses
      add constraint coursework_analyses_user_id_key unique (user_id);
  end if;
end $$;

alter table public.coursework_analyses enable row level security;

-- Users can only read their own analysis. No insert/update/delete policies: all
-- writes flow through the service-role API route (which bypasses RLS).
create policy "coursework_analyses_select"
  on public.coursework_analyses
  for select to authenticated
  using (user_id = (select auth.uid()));
