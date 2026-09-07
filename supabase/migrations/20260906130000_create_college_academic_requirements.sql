-- College academic requirements — the SCOPED, provenance-guarded home for
-- verified coursework/academic expectations, attachable at any level of the
-- University → School → Program → Track hierarchy.
--
-- WHY THIS SHIPS EMPTY: an audit of the live database confirms AppGap stores NO
-- verified per-college coursework requirements today (college_admission_factors
-- has 0 rows and is unwired; no requirement table existed). This migration adds
-- the ARCHITECTURE, not data. The table starts empty; the app surfaces a row
-- ONLY when it is human-verified (verified_at is not null). Nothing is ever
-- fabricated — a missing requirement means "unknown", never "none".
--
-- SCOPING (the whole point): every row declares a `scope` and carries the
-- matching hierarchy id. A CHECK constraint enforces that the id for the scope is
-- present, so a row can never be mis-scoped. The application-side resolver
-- (src/lib/coursework/requirement-scope.ts) then guarantees a row scoped to one
-- school/program/track is NEVER returned for an applicant targeting a different
-- school/program/track at the same university — and applies specificity
-- precedence (track > program > school > university). The same generic resolver
-- is intended for reuse by the future Supplemental Essays requirements.
--
-- Public reference data: anon+authenticated may SELECT; all writes go through the
-- service role (ingestion / admin verification), matching every other college_*
-- table. Never feeds the AppGap Score or chancing engine.

create table if not exists public.college_academic_requirements (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges(id) on delete cascade,
  school_id     uuid references public.college_schools(id) on delete cascade,
  program_id    uuid references public.college_programs(id) on delete cascade,
  track_id      uuid references public.college_application_tracks(id) on delete cascade,

  -- Where this requirement attaches. The CHECK keeps scope and ids consistent.
  scope         text not null
    check (scope in ('university', 'school', 'program', 'track')),

  requirement_type text not null default 'recommended'
    check (requirement_type in ('required', 'recommended')),

  -- What it concerns. subject_area maps to the coursework engine's SubjectArea;
  -- topic optionally narrows it (e.g. 'calculus'). Both are plain text so the
  -- ingest side is not blocked on an enum migration.
  subject_area  text not null,
  topic         text,
  label         text not null,
  detail        text,

  -- Provenance quartet — identical convention to the other college_* tables. A
  -- row is only ever surfaced to users when verified_at is not null.
  source_url    text not null,
  source_date   date,
  verified_at   timestamptz,
  verified_by   text,
  confidence    text,
  field_status  jsonb not null default '{}',

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  -- Scope ↔ id consistency: the id for the declared scope must be present, and a
  -- university-scoped row must carry no narrower id.
  constraint college_academic_requirements_scope_ids check (
    (scope = 'university'
      and school_id is null and program_id is null and track_id is null)
    or (scope = 'school' and school_id is not null)
    or (scope = 'program' and program_id is not null)
    or (scope = 'track' and track_id is not null)
  )
);

-- Indexes for the resolver's lookups (fetch by college, then narrow by scope id).
create index if not exists college_academic_requirements_college_id_idx
  on public.college_academic_requirements(college_id);
create index if not exists college_academic_requirements_school_id_idx
  on public.college_academic_requirements(school_id);
create index if not exists college_academic_requirements_program_id_idx
  on public.college_academic_requirements(program_id);
create index if not exists college_academic_requirements_track_id_idx
  on public.college_academic_requirements(track_id);

alter table public.college_academic_requirements enable row level security;

-- Public reference data: read-only to end users; writes only via the service
-- role (which bypasses RLS). No insert/update/delete policies — same pattern as
-- college_field_strengths and the other college_* reference tables.
create policy "college_academic_requirements_select_anon"
  on public.college_academic_requirements
  for select to anon
  using (true);

create policy "college_academic_requirements_select_auth"
  on public.college_academic_requirements
  for select to authenticated
  using (true);
