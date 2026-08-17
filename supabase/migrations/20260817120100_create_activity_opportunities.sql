-- Activity / opportunity reference database — the data foundation for verified,
-- linkable activity recommendations (competitions, volunteering, summer programs,
-- research, community programs, online-open clubs, etc.).
--
-- This table is created NOW but ships EMPTY, on purpose — exactly like the
-- college field-data layer (college_field_strengths / college_field_resources).
-- The Activities workspace does not invent opportunities: until a row here is
-- ingested from a trustworthy source AND human-verified, the workspace shows
-- only AI-generated activity *archetypes/ideas* (which never carry links), and
-- the verified-opportunities section stays hidden. When real opportunities are
-- ingested later (an out-of-app service-role pipeline, mirroring
-- scripts/college-ingest/), they surface here with their real application link
-- and provenance. Nothing is fabricated to make the UI look complete.
--
-- RLS pattern mirrors the college reference tables: PUBLIC-READ (opportunities
-- are public information) via anon + authenticated select, and NO client write
-- policies — every write goes through the service-role ingestion pipeline.

-- ─── Enums (idempotent for `supabase db reset`) ──────────────────────────────

do $$ begin
  create type public.activity_difficulty as enum ('beginner', 'moderate', 'advanced');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.activity_opportunity_source_type as enum (
    'official_site', 'aggregator', 'manual'
  );
exception when duplicate_object then null; end $$;

-- ─── Reference table ─────────────────────────────────────────────────────────

create table if not exists public.activity_opportunities (
  id uuid primary key default gen_random_uuid(),

  -- Identity / description
  name text not null,
  -- Activity category slug, aligned with the same taxonomy as activities.category
  -- (sports, clubs, volunteering, research, internship, work, personal-project,
  -- business, arts, competitions, cultural, student-gov, other).
  category text not null default '',
  description text,

  -- Deterministic eligibility / metadata (used by code-side filtering, never AI)
  applicable_grades text[] not null default '{}',   -- e.g. {'9','10','11','12'}
  difficulty public.activity_difficulty,
  est_hours_per_week_min integer,
  est_hours_per_week_max integer,
  est_duration text,                                 -- e.g. '2–3 months', 'Ongoing'
  is_ongoing boolean,
  prerequisites text,
  skills text[] not null default '{}',

  -- Major/field alignment — keys match the profiles.major_category taxonomy
  -- (cs, engineering, bio-premed, ...). Empty array = applies broadly.
  field_keys text[] not null default '{}',

  -- Qualitative growth / impact (human-authored during ingestion, not invented)
  leadership_progression text,
  potential_impact text,

  -- The real application / registration page — ONLY ever a trustworthy public URL.
  -- Null when the opportunity has no application step or none is verified.
  application_url text,

  -- Provenance / verification (same trio as the college reference tables). The
  -- workspace treats a row as authoritative only once verified_at is set.
  source_type public.activity_opportunity_source_type not null default 'manual',
  source_url text,
  source_date date,
  confidence text,
  verified_at timestamptz,
  verified_by text,

  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes supporting the deterministic filters (category, grade, field, verified).
create index if not exists activity_opportunities_category_idx
  on public.activity_opportunities (category);
create index if not exists activity_opportunities_field_keys_idx
  on public.activity_opportunities using gin (field_keys);
create index if not exists activity_opportunities_grades_idx
  on public.activity_opportunities using gin (applicable_grades);
create index if not exists activity_opportunities_verified_idx
  on public.activity_opportunities (verified_at);

alter table public.activity_opportunities enable row level security;

-- Public reference data: read-only to everyone; all writes via service role.
create policy "activity_opportunities_select_anon"
  on public.activity_opportunities
  for select
  to anon
  using (true);

create policy "activity_opportunities_select_auth"
  on public.activity_opportunities
  for select
  to authenticated
  using (true);
