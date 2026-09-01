-- Batch 0 for scalable program coverage across ALL institutions.
--
-- Two additive changes, no data, no breaking changes:
--   1) Provenance on `college_programs` so machine-sourced (IPEDS/Scorecard)
--      undergraduate programs can be stored "with a source + year" like every
--      other data-bearing row (docs §1, §3). Existing hand-authored rows are
--      untouched (columns are nullable / defaulted).
--   2) A NEW `college_application_tracks` concept — application-relevant
--      distinctions that are NOT separately-admitting schools (Princeton A.B. vs
--      B.S.E., honors colleges, audition/portfolio tracks, direct-admit-to-major).
--      Modeling these as their own type (not `college_schools`) keeps the
--      University → School hierarchy honest and gives the future Supplemental
--      Essays system a real key. NOTHING here feeds the chance engine.
--
-- STRICT: program/track data must never synthesize an admission rate or
-- multiplier. The chancing engine reads ONLY `college_admission_stats`
-- (assessment.ts / strength.ts) — these tables are descriptive/routing only.

-- ─── 1) Provenance on college_programs ───────────────────────────────────────
-- Reuse the existing college_source_type enum (scorecard | ipeds | cds |
-- official_site | manual). All nullable so existing rows stay valid.

alter table public.college_programs
  add column if not exists cip_code_verified boolean not null default false;

alter table public.college_programs
  add column if not exists source_type public.college_source_type;

alter table public.college_programs
  add column if not exists source_url text;

alter table public.college_programs
  add column if not exists source_date date;

alter table public.college_programs
  add column if not exists verified_at timestamptz;

alter table public.college_programs
  add column if not exists verified_by text;

alter table public.college_programs
  add column if not exists confidence text;

-- {field: reported | not_reported | not_applicable | pending} — e.g. the B.A./B.S.
-- designation is `not_reported` for IPEDS-sourced rows (IPEDS confirms a program
-- exists at bachelor's level but not the specific degree name).
alter table public.college_programs
  add column if not exists field_status jsonb not null default '{}'::jsonb;

-- Index the (college, cip) pair used to dedupe idempotent CIP-keyed upserts.
create index if not exists college_programs_college_cip_idx
  on public.college_programs (college_id, cip_code);

-- DB-enforced idempotency for CIP-keyed program rows: a college can have a given
-- CIP family at most once. Partial (WHERE cip_code is not null) so the existing
-- hand-authored rows — which have cip_code = null — are unaffected and may still
-- repeat a school-scoped program under different schools.
create unique index if not exists college_programs_college_cip_unique
  on public.college_programs (college_id, cip_code)
  where cip_code is not null;

-- ─── 2) college_application_tracks ───────────────────────────────────────────

do $$ begin
  create type public.college_track_type as enum (
    'degree_track',          -- e.g. Princeton A.B. vs B.S.E.
    'honors',                -- honors college / program
    'audition_portfolio',    -- audition- or portfolio-gated entry
    'direct_admit_major',    -- competitive direct-admit-to-major (not a school)
    'coordinated_dual_degree' -- e.g. Brown|RISD, 3-2 programs
  );
exception when duplicate_object then null; end $$;

create table if not exists public.college_application_tracks (
  id          uuid primary key default gen_random_uuid(),
  college_id  uuid not null references public.colleges(id) on delete cascade,
  -- Optional: a track can be scoped to a school when one exists; usually null.
  school_id   uuid references public.college_schools(id) on delete set null,
  name        text not null,
  track_type  public.college_track_type not null,
  -- Verified degree this track grants (e.g. 'A.B.', 'B.S.E.'), or null.
  degree      text,
  notes       text,
  -- Provenance (same shape as other reference rows).
  source_type public.college_source_type,
  source_url  text,
  source_date date,
  verified_at timestamptz,
  verified_by text,
  confidence  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.college_application_tracks enable row level security;

create index if not exists college_application_tracks_college_id_idx
  on public.college_application_tracks (college_id);
create index if not exists college_application_tracks_school_id_idx
  on public.college_application_tracks (school_id);

-- Public reference data: read-only for anon + authenticated (writes go through
-- the service-role ingestion pipeline, which bypasses RLS). Granular per-role
-- select policies, never FOR ALL (mirrors college_schools / college_programs).
create policy "college_application_tracks_select_anon"
  on public.college_application_tracks for select to anon using (true);
create policy "college_application_tracks_select_auth"
  on public.college_application_tracks for select to authenticated using (true);

-- ─── 3) Optional user selection of a track (future essay routing) ────────────
-- Nullable; a student may pick a degree/application track for a saved college
-- the same way they pick a school/program today. Never used for chancing.

alter table public.user_colleges
  add column if not exists track_id uuid
    references public.college_application_tracks(id) on delete set null;

create index if not exists user_colleges_track_id_idx
  on public.user_colleges (track_id);
