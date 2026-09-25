-- Per-college supplemental-essay COVERAGE STATUS, per application cycle.
--
-- The prompts table (college_supplemental_prompts) answers "what are the official
-- prompts?" but it cannot distinguish two very different empty states:
--   * a college we VERIFIED has no supplemental essays this cycle, versus
--   * a college nobody has checked yet (prompts unknown / pending).
--
-- This table adds that third state so the UI can show "No supplemental essays
-- required for 2026-27" for the former and the paste-your-own fallback for the
-- latter, and so we can report coverage across the whole college database.
--
-- One row per (college, cycle). Follows the same college-data conventions:
-- PUBLIC READ (anon + authenticated), NO client writes (service-role ingestion
-- bypasses RLS), provenance + a verified_at gate. A row is only trusted as an
-- authoritative "none_required"/"has_supplements" once verified_at is set;
-- unverified or missing rows are treated as "pending" by the app. Populated by
-- scripts/college-ingest/ingest-supplemental-prompts.mjs (candidates + a
-- --seed-pending pass that gives every college a pending row to track backlog).

create table if not exists public.college_supplement_status (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges(id) on delete cascade,
  cycle_year    text not null default '2026-2027',
  -- has_supplements: college has one or more official supplemental prompts.
  -- none_required:  college verified to require NO supplemental essays.
  -- pending:        not yet checked / prompts unknown (the default backlog state).
  status        text not null default 'pending'
    check (status in ('has_supplements', 'none_required', 'pending')),
  -- Free-text note (e.g. "Applies via CUNY portal; no Common App supplement").
  notes         text,
  -- Provenance + verification (mirrors the other college-data tables).
  source_type   text,
  source_url    text,
  source_date   date,
  verified_at   timestamptz,
  verified_by   text,
  confidence    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (college_id, cycle_year)
);

alter table public.college_supplement_status enable row level security;

create index if not exists college_supplement_status_college_id_idx
  on public.college_supplement_status(college_id);
create index if not exists college_supplement_status_cycle_status_idx
  on public.college_supplement_status(cycle_year, status);

-- Public read, granular per-role (mirrors colleges / college_supplemental_prompts).
-- No insert/update/delete policies: only the service-role ingest writes, and it
-- bypasses RLS.
create policy "college_supplement_status_select_anon"
  on public.college_supplement_status
  for select to anon using (true);

create policy "college_supplement_status_select_authenticated"
  on public.college_supplement_status
  for select to authenticated using (true);
