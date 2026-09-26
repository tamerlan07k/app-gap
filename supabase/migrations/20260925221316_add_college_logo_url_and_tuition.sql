-- Purpose: extend the college reference data so My Colleges can show official
-- logos and a fuller info panel (SAT/ACT/Tuition/Location).
--
--   * colleges.logo_url               — an official-logo URL resolved from the
--     institution's own domain (see scripts/college-ingest/backfill-logos.mjs).
--     Kept separate from the self-hosted `logo_asset_path` layer so either can
--     be used; the UI prefers a self-hosted asset, then this URL, then a
--     generated monogram fallback. Overridable per school.
--   * college_admission_stats.tuition_in_state / tuition_out_of_state — annual
--     published undergraduate tuition (USD), from College Scorecard
--     (latest.cost.tuition.*). Not total cost of attendance. Left null when the
--     source does not report it (recorded as not_reported in field_status).
--
-- No new RLS policies or indexes are required: these columns live on existing
-- tables whose public-read select policies (colleges_select_*, and the
-- college_admission_stats select policies) already cover every column, and the
-- new columns are not referenced by any RLS policy.

alter table public.colleges
  add column if not exists logo_url text;

alter table public.college_admission_stats
  add column if not exists tuition_in_state integer;

alter table public.college_admission_stats
  add column if not exists tuition_out_of_state integer;

comment on column public.colleges.logo_url is
  'Official logo URL resolved from the institution domain; UI falls back to logo_asset_path then a generated monogram.';
comment on column public.college_admission_stats.tuition_in_state is
  'Annual published in-state undergraduate tuition in USD (College Scorecard latest.cost.tuition.in_state). Not cost of attendance.';
comment on column public.college_admission_stats.tuition_out_of_state is
  'Annual published out-of-state undergraduate tuition in USD (College Scorecard latest.cost.tuition.out_of_state). Not cost of attendance.';
