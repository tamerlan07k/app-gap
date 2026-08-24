-- College profile content (history, structured facts) for the dedicated
-- per-college page. See docs/college-data-architecture.md.
--
-- PUBLIC REFERENCE DATA: `select` is granted to anon + authenticated, matching
-- the other college_* tables. All writes go through the service-role ingestion
-- pipeline (scripts/college-ingest/), so there are intentionally no
-- insert/update/delete policies for end-user roles — they are default-denied
-- while the service role (which bypasses RLS) performs ingestion.
--
-- Two classes of content, deliberately separated:
--   • Structured FACTS (founded_year, student_faculty_ratio, locale/setting) —
--     ingested from citable structured sources (Wikidata / IPEDS / Scorecard),
--     attributed via facts_source_url.
--   • PROSE (history) — drafted then HUMAN-VERIFIED. The UI must only display
--     prose whose *_verified_at is set, so an unverified draft never ships.
--
-- Program-strength prose for the major-specific section is NOT stored here — it
-- reuses the existing source-attributed college_field_strengths table.

create table if not exists public.college_profiles (
  id                     uuid primary key default gen_random_uuid(),
  college_id             uuid not null unique
                           references public.colleges(id) on delete cascade,

  -- ── Structured facts (source-attributed) ──
  founded_year           integer,
  student_faculty_ratio  numeric(5, 2),  -- e.g. 7.00 → rendered "7:1"
  locale                 text,           -- raw IPEDS/Scorecard locale label
  setting                text,           -- normalized: urban | suburban | town | rural
  facts_source_url       text,
  facts_source_date      date,
  facts_verified_at      timestamptz,

  -- ── Prose (display gated on history_verified_at) ──
  history                text,
  history_source_url     text,
  history_verified_at    timestamptz,
  history_confidence     text,           -- low | medium | high (draft self-rating)

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

alter table public.college_profiles enable row level security;

-- college_id is the lookup/join column referenced by the page loader; the unique
-- constraint already provides a btree index, so no extra index is required.

-- Sanity guard: a plausible founding year (no zero / far-future typos).
do $$ begin
  alter table public.college_profiles
    add constraint college_profiles_founded_year_chk
    check (founded_year is null or (founded_year between 1000 and 2100));
exception when duplicate_object then null; end $$;

create policy "college_profiles_select_anon"
  on public.college_profiles for select to anon using (true);
create policy "college_profiles_select_auth"
  on public.college_profiles for select to authenticated using (true);
