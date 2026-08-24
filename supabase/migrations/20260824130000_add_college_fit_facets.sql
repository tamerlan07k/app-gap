-- Section-3 "fit" prose facets for the dedicated college page.
--
-- Adds human-verifiable prose facets (campus life, diversity, opportunities,
-- vibe, career) to college_profiles. Stored as a small JSON object so the five
-- related facets share ONE verification gate (fit_verified_at) and one review
-- action. Like history, the page renders these ONLY when fit_verified_at is set,
-- so an unreviewed draft never displays.
--
-- Structured facts (founded_year, setting) added in the prior migration keep
-- their own facts_verified_at gate — they are separate from this prose.

alter table public.college_profiles
  add column if not exists fit            jsonb,
  add column if not exists fit_source_url text,
  add column if not exists fit_confidence text,
  add column if not exists fit_verified_at timestamptz;

-- No new RLS policy needed: college_profiles already has select policies for
-- anon + authenticated, and writes remain service-role only (ingestion / admin).
