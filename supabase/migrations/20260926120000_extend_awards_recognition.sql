-- Awards & Recognition — extend the existing `awards` table into a richer
-- "Recognition Map" record, and add a per-user analysis cache.
--
-- IMPORTANT: the base `awards` table (name, level, grade) is the SAME source that
-- feeds the AppGap Score / chancing engine via loadFullProfile. Every column added
-- here is NULLABLE with a safe default, so nothing about how chancing reads awards
-- changes — the score still only ever looks at name/level/grade. Onboarding keeps
-- writing just those three; the Recognition Map (a new post-onboarding editor)
-- writes the richer fields. We deliberately REUSE this existing profile source
-- rather than creating a parallel awards table (per the project convention of not
-- duplicating student-profile fields).

-- ─── Enrich the awards record ─────────────────────────────────────────────────

alter table public.awards
  add column if not exists organization        text not null default '',
  add column if not exists year                 text not null default '',
  add column if not exists category             text not null default '',
  add column if not exists placement            text not null default '',
  add column if not exists selectivity_context  text not null default '',
  add column if not exists description          text not null default '',
  add column if not exists evidence_url         text,
  add column if not exists student_explanation  text not null default '',
  add column if not exists updated_at           timestamptz not null default now();

-- ─── award_recognition_analyses ───────────────────────────────────────────────
-- One row per user (upserted in place), mirroring activity_analyses /
-- coursework_analyses. Holds ONE cached AI interpretation covering the whole
-- Recognition Map: the collective "what your recognition demonstrates", the
-- recognition/evidence gaps, and per-award detail notes (keyed by award id).
-- Doing it in one row + one AI call is the cost-control choice — opening the
-- Awards page never triggers AI; only the explicit "Analyze" button does, and it
-- refreshes this single row. Never feeds the AppGap Score or chancing.
--
-- Writes flow exclusively through the service-role API route (which bypasses RLS),
-- so there is no authenticated insert/update policy — same pattern as
-- activity_analyses / coursework_analyses.

create table if not exists public.award_recognition_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  analysis jsonb not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per user so the route can upsert on user_id.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'award_recognition_analyses_user_id_key'
      and conrelid = 'public.award_recognition_analyses'::regclass
  ) then
    alter table public.award_recognition_analyses
      add constraint award_recognition_analyses_user_id_key unique (user_id);
  end if;
end $$;

alter table public.award_recognition_analyses enable row level security;

-- Users can read only their own analysis. No insert/update/delete policies: all
-- writes go through the service-role API route.
create policy "users_select_own_award_recognition_analyses"
  on public.award_recognition_analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Table-level privilege for the Data API. RLS gates WHICH rows; the role still
-- needs a GRANT to touch the table at all. Current Supabase does not auto-grant
-- new public tables, so grant read explicitly (writes go through the service role,
-- which bypasses RLS). The awards table itself is a pre-existing table and keeps
-- its existing grants — its new columns are covered by that table-level grant.
grant select on public.award_recognition_analyses to authenticated;
