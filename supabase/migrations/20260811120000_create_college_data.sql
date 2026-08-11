-- College data infrastructure.
--
-- Centralized, source-attributed college reference data for the My Colleges /
-- matching system. See docs/college-data-architecture.md.
--
-- All tables here are PUBLIC REFERENCE DATA: `select` is granted to anon +
-- authenticated. Every write happens through the service-role ingestion pipeline
-- (scripts/college-ingest/), so there are intentionally no insert/update/delete
-- policies for end-user roles — they are default-denied while the service role
-- (which bypasses RLS) performs ingestion. The raw ingestion table is internal
-- and has no public read.

-- Trigram search for college name / alias matching (done in Postgres, never by
-- the AI).
create extension if not exists pg_trgm;

-- ─── Enums (guarded so `supabase db reset` is idempotent) ─────────────────────

do $$ begin
  create type public.college_institution_type as enum
    ('public', 'private_nonprofit', 'private_forprofit', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.college_source_type as enum
    ('scorecard', 'ipeds', 'cds', 'official_site', 'manual');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.college_test_policy as enum
    ('test_required', 'test_optional', 'test_blind', 'test_flexible', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.college_round_type as enum
    ('EA', 'REA', 'ED', 'ED_II', 'RD', 'ROLLING', 'PRIORITY');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.college_factor_importance as enum
    ('very_important', 'important', 'considered', 'not_considered');
exception when duplicate_object then null; end $$;

-- ─── college_systems ──────────────────────────────────────────────────────────
-- Groupings such as the University of California or Penn State. Each campus is a
-- separate `colleges` row linked by system_id (see multi-campus handling).

create table if not exists public.college_systems (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.college_systems enable row level security;

create policy "college_systems_select_anon"
  on public.college_systems for select to anon using (true);
create policy "college_systems_select_auth"
  on public.college_systems for select to authenticated using (true);

-- ─── colleges ─────────────────────────────────────────────────────────────────
-- One row per institution, keyed on the federal IPEDS unitid.

create table if not exists public.colleges (
  id               uuid primary key default gen_random_uuid(),
  ipeds_unitid     integer unique,
  canonical_name   text not null,
  slug             text not null unique,
  city             text,
  state            text,
  country          text not null default 'USA',
  institution_type public.college_institution_type not null default 'unknown',
  official_website text,
  admissions_url   text,
  system_id        uuid references public.college_systems(id) on delete set null,
  -- Logo is self-hosted (bucket path); the DB only references it. `logo_variant`
  -- is 'official' or 'monogram' (generated fallback). See docs §8.
  logo_asset_path  text,
  logo_source_url  text,
  logo_license     text,
  logo_variant     text,
  status           text not null default 'active',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.colleges enable row level security;

create index if not exists colleges_system_id_idx on public.colleges (system_id);
create index if not exists colleges_state_idx on public.colleges (state);
create index if not exists colleges_name_trgm_idx
  on public.colleges using gin (canonical_name gin_trgm_ops);

create policy "colleges_select_anon"
  on public.colleges for select to anon using (true);
create policy "colleges_select_auth"
  on public.colleges for select to authenticated using (true);

-- ─── college_aliases ──────────────────────────────────────────────────────────

create table if not exists public.college_aliases (
  id         uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  alias      text not null,
  alias_type text, -- former_name | abbreviation | nickname | common_misspelling
  created_at timestamptz not null default now()
);

alter table public.college_aliases enable row level security;

create index if not exists college_aliases_college_id_idx
  on public.college_aliases (college_id);
create index if not exists college_aliases_alias_trgm_idx
  on public.college_aliases using gin (alias gin_trgm_ops);

create policy "college_aliases_select_anon"
  on public.college_aliases for select to anon using (true);
create policy "college_aliases_select_auth"
  on public.college_aliases for select to authenticated using (true);

-- ─── college_schools ──────────────────────────────────────────────────────────
-- Undergraduate sub-units that may admit separately (e.g. Cornell's colleges).

create table if not exists public.college_schools (
  id                uuid primary key default gen_random_uuid(),
  college_id        uuid not null references public.colleges(id) on delete cascade,
  name              text not null,
  admits_separately boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.college_schools enable row level security;

create index if not exists college_schools_college_id_idx
  on public.college_schools (college_id);

create policy "college_schools_select_anon"
  on public.college_schools for select to anon using (true);
create policy "college_schools_select_auth"
  on public.college_schools for select to authenticated using (true);

-- ─── college_programs ─────────────────────────────────────────────────────────

create table if not exists public.college_programs (
  id         uuid primary key default gen_random_uuid(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  school_id  uuid references public.college_schools(id) on delete set null,
  name       text not null,
  cip_code   text,
  offered    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.college_programs enable row level security;

create index if not exists college_programs_college_id_idx
  on public.college_programs (college_id);

create policy "college_programs_select_anon"
  on public.college_programs for select to anon using (true);
create policy "college_programs_select_auth"
  on public.college_programs for select to authenticated using (true);

-- ─── college_admission_stats (historical / standardized) ──────────────────────
-- One row per (college, school?, academic_year, source). Append-only per year.

create table if not exists public.college_admission_stats (
  id                   uuid primary key default gen_random_uuid(),
  college_id           uuid not null references public.colleges(id) on delete cascade,
  school_id            uuid references public.college_schools(id) on delete set null,
  academic_year        text not null,
  source               public.college_source_type not null,
  source_url           text,
  source_date          date,
  applicants           integer,
  admits               integer,
  enrolled             integer, -- enrolled first-year students
  undergrad_enrollment integer, -- total undergraduate enrollment
  admit_rate           numeric(6, 4), -- fraction 0..1
  yield_rate           numeric(6, 4),
  sat_ebrw_25          integer,
  sat_ebrw_50          integer,
  sat_ebrw_75          integer,
  sat_math_25          integer,
  sat_math_50          integer,
  sat_math_75          integer,
  sat_total_25         integer,
  sat_total_50         integer,
  sat_total_75         integer,
  act_composite_25     integer,
  act_composite_50     integer,
  act_composite_75     integer,
  gpa_avg              numeric(4, 3),
  gpa_distribution     jsonb,
  class_rank           jsonb,
  test_policy_for_year public.college_test_policy,
  -- {field: reported | not_reported | not_applicable | pending}
  field_status         jsonb not null default '{}'::jsonb,
  verified_at          timestamptz,
  verified_by          text,
  confidence           text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

alter table public.college_admission_stats enable row level security;

create index if not exists college_admission_stats_college_id_idx
  on public.college_admission_stats (college_id);
-- One stats row per college/school/year/source. school_id is coalesced so NULLs
-- (institution-level rows) still dedupe.
create unique index if not exists college_admission_stats_unique_idx
  on public.college_admission_stats (
    college_id,
    coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid),
    academic_year,
    source
  );

create policy "college_admission_stats_select_anon"
  on public.college_admission_stats for select to anon using (true);
create policy "college_admission_stats_select_auth"
  on public.college_admission_stats for select to authenticated using (true);

-- ─── college_admission_factors (CDS Section C7, historical) ───────────────────

create table if not exists public.college_admission_factors (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges(id) on delete cascade,
  academic_year text not null,
  source        public.college_source_type not null default 'cds',
  factor        text not null, -- e.g. rigor_of_record, gpa, test_scores, essay, ...
  importance    public.college_factor_importance not null,
  source_url    text,
  source_date   date,
  verified_at   timestamptz,
  verified_by   text,
  created_at    timestamptz not null default now()
);

alter table public.college_admission_factors enable row level security;

create index if not exists college_admission_factors_college_id_idx
  on public.college_admission_factors (college_id);
create unique index if not exists college_admission_factors_unique_idx
  on public.college_admission_factors (college_id, academic_year, factor);

create policy "college_admission_factors_select_anon"
  on public.college_admission_factors for select to anon using (true);
create policy "college_admission_factors_select_auth"
  on public.college_admission_factors for select to authenticated using (true);

-- ─── application_cycles (current cycle, official source) ──────────────────────

create table if not exists public.application_cycles (
  id                uuid primary key default gen_random_uuid(),
  college_id        uuid not null references public.colleges(id) on delete cascade,
  cycle_year        text not null, -- e.g. '2025-2026' (fall-2026 entry)
  test_policy       public.college_test_policy not null default 'unknown',
  test_policy_notes text,
  source_type       public.college_source_type not null default 'official_site',
  source_url        text,
  source_date       date,
  verified_at       timestamptz,
  verified_by       text,
  confidence        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (college_id, cycle_year)
);

alter table public.application_cycles enable row level security;

create index if not exists application_cycles_college_id_idx
  on public.application_cycles (college_id);

create policy "application_cycles_select_anon"
  on public.application_cycles for select to anon using (true);
create policy "application_cycles_select_auth"
  on public.application_cycles for select to authenticated using (true);

-- ─── application_rounds (current cycle, official source) ──────────────────────

create table if not exists public.application_rounds (
  id                    uuid primary key default gen_random_uuid(),
  cycle_id              uuid not null references public.application_cycles(id) on delete cascade,
  school_id             uuid references public.college_schools(id) on delete set null,
  program_id            uuid references public.college_programs(id) on delete set null,
  round_type            public.college_round_type not null,
  name                  text,
  deadline_date         date,
  decision_release_date date,
  is_binding            boolean not null default false,
  is_restrictive        boolean not null default false,
  is_rolling            boolean not null default false,
  offered               boolean not null default true,
  notes                 text,
  source_url            text,
  source_date           date,
  verified_at           timestamptz,
  verified_by           text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.application_rounds enable row level security;

create index if not exists application_rounds_cycle_id_idx
  on public.application_rounds (cycle_id);

create policy "application_rounds_select_anon"
  on public.application_rounds for select to anon using (true);
create policy "application_rounds_select_auth"
  on public.application_rounds for select to authenticated using (true);

-- ─── college_ingest_raw (internal provenance staging) ─────────────────────────
-- Untransformed source payloads. Internal only — RLS on with no policies means
-- anon/authenticated are default-denied; the service role reads/writes it.

create table if not exists public.college_ingest_raw (
  id           uuid primary key default gen_random_uuid(),
  source       public.college_source_type not null,
  ipeds_unitid integer,
  college_id   uuid references public.colleges(id) on delete set null,
  payload      jsonb not null,
  fetched_at   timestamptz not null default now(),
  notes        text
);

alter table public.college_ingest_raw enable row level security;

create index if not exists college_ingest_raw_unitid_idx
  on public.college_ingest_raw (ipeds_unitid);
