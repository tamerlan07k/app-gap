-- Recognition-opportunity reference database — the data foundation for the Awards
-- section's Opportunity Finder (competitions, hackathons, olympiads, research,
-- conferences, fellowships, entrepreneurship/pitch competitions, academic
-- challenges, student publications, selective programs, service recognition, …).
--
-- Design mirrors activity_opportunities / the college reference tables:
--   • PUBLIC-READ (opportunities are public information): anon + authenticated
--     select; NO client write policy — every write is service-role (this migration
--     or a future ingestion pipeline). The UI never invents opportunities.
--   • Rich, structured, expandable — so the finder never hardcodes lists in React
--     and the catalog can grow without a UI rebuild.
--   • Provenance is preserved on every row (source_url / source_type / verified).
--
-- DATES ARE NOT FABRICATED. Deadlines are stored as a RECURRING month (+ optional
-- day only where the program publishes a genuinely fixed annual date) plus a
-- human-readable `deadline_note`. The deterministic engine computes the NEXT
-- occurrence relative to the current date, so the finder is date-aware without any
-- hardcoded year. Where only the month is known, the UI shows the note (never a
-- fabricated exact day). Rolling opportunities set is_rolling = true.

-- ─── Enums (idempotent for `supabase db reset`) ──────────────────────────────

do $$ begin
  create type public.opportunity_category as enum (
    'competition', 'hackathon', 'olympiad', 'research', 'conference',
    'fellowship', 'entrepreneurship', 'pitch', 'academic_challenge',
    'publication', 'selective_program', 'service', 'scholarship', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  -- Rough preparation/time burden, used by deterministic feasibility + status.
  create type public.opportunity_effort as enum (
    'quick', 'moderate', 'substantial', 'intensive'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.opportunity_source_type as enum (
    'official_site', 'aggregator', 'manual'
  );
exception when duplicate_object then null; end $$;

-- ─── Reference table ─────────────────────────────────────────────────────────

create table if not exists public.opportunities (
  id uuid primary key default gen_random_uuid(),

  -- Identity
  name         text not null,
  organization text not null default '',
  category     public.opportunity_category not null,
  description  text not null default '',

  -- Deterministic eligibility (code-side filtering, never AI)
  eligible_grades  text[] not null default '{}',   -- {'9','10','11','12'}; empty = any
  eligibility_notes text not null default '',
  cost_note        text not null default '',

  -- Field alignment — keys match the profiles.major_category taxonomy
  -- (cs, engineering, bio-premed, business, math-physics, polisci, psych,
  -- humanities, design, education, law). Empty = applies broadly.
  field_keys text[] not null default '{}',

  -- Which recognition/evidence dimensions this opportunity can ADD, using the
  -- Awards theme taxonomy (see src/lib/awards/themes.ts): cs-ai, quantitative,
  -- leadership, service, athletics, entrepreneurship, research, creativity,
  -- academic. This is what lets the finder tell "adds a new dimension" from
  -- "reinforces what you already have".
  evidence_dimensions text[] not null default '{}',

  -- Effort / preparation burden
  effort        public.opportunity_effort not null default 'moderate',
  est_prep_time text not null default '',           -- human label, e.g. '20 minutes', '2–3 months'
  -- Realistic minimum lead time to do it justice, in days. Drives the
  -- deterministic "not enough time" check against the next deadline. Null = unknown.
  est_prep_days_min integer,

  -- Recurring deadline (never a hardcoded year). day is set ONLY when the program
  -- publishes a fixed annual date; otherwise null and deadline_note carries the
  -- human phrasing. is_rolling opportunities have no fixed window.
  deadline_month integer check (deadline_month between 1 and 12),
  deadline_day   integer check (deadline_day between 1 and 31),
  deadline_note  text not null default '',
  is_rolling     boolean not null default false,

  -- The real application / info page — ONLY ever a trustworthy public URL.
  application_url text,

  -- Provenance / verification (same trio as the other reference tables). The
  -- finder treats a row as authoritative only once verified_at is set.
  source_type public.opportunity_source_type not null default 'manual',
  source_url  text,
  source_date date,
  confidence  text not null default '',
  verified_at timestamptz,
  verified_by text,

  status     text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes supporting the deterministic filters.
create index if not exists opportunities_category_idx
  on public.opportunities (category);
create index if not exists opportunities_field_keys_idx
  on public.opportunities using gin (field_keys);
create index if not exists opportunities_evidence_idx
  on public.opportunities using gin (evidence_dimensions);
create index if not exists opportunities_grades_idx
  on public.opportunities using gin (eligible_grades);
create index if not exists opportunities_verified_idx
  on public.opportunities (verified_at);
create index if not exists opportunities_status_idx
  on public.opportunities (status);

alter table public.opportunities enable row level security;

-- Public reference data: read-only to everyone; all writes via service role.
create policy "opportunities_select_anon"
  on public.opportunities for select to anon using (true);

create policy "opportunities_select_auth"
  on public.opportunities for select to authenticated using (true);

-- Table-level privileges for the Data API roles. RLS policies alone do NOT grant
-- table access — the API roles also need a GRANT. Supabase used to auto-grant new
-- public tables to anon/authenticated, but the current default does not, so we
-- grant explicitly (read-only; all writes go through the service role, which
-- bypasses RLS). Without this the finder would get "permission denied" on any
-- project created under the new default.
grant select on public.opportunities to anon, authenticated;

-- ─── Verified seed ───────────────────────────────────────────────────────────
-- A small, curated set of well-known, genuinely real opportunities with their
-- official URLs and PUBLICLY-STABLE recurring deadline windows. Exact days are
-- omitted where the program varies year to year (deadline_note carries the human
-- phrasing instead) — no exact date is fabricated. Confidence + a note remind the
-- student to confirm the current cycle on the official site. This is expandable
-- via a future service-role ingestion pipeline; nothing here is invented.

insert into public.opportunities (
  name, organization, category, description,
  eligible_grades, eligibility_notes, cost_note,
  field_keys, evidence_dimensions,
  effort, est_prep_time, est_prep_days_min,
  deadline_month, deadline_day, deadline_note, is_rolling,
  application_url, source_type, source_url, confidence, verified_at, verified_by
) values
  (
    'Congressional App Challenge', 'U.S. House of Representatives', 'competition',
    'A congressional district–level coding competition: build an app and submit a short demo video. Widely accessible entry point to CS recognition.',
    '{9,10,11,12}', 'Open to U.S. middle/high-school students by congressional district.', 'Free to enter.',
    '{cs,engineering}', '{cs-ai}',
    'moderate', '2–6 weeks to build and submit', 21,
    11, null, 'Typically due early November — confirm your district''s date.', false,
    'https://www.congressionalappchallenge.us/', 'official_site', 'https://www.congressionalappchallenge.us/', 'medium', now(), 'seed'
  ),
  (
    'Regeneron Science Talent Search', 'Society for Science', 'research',
    'The nation''s oldest and most prestigious science and math research competition for high-school seniors, based on an original research project.',
    '{12}', 'U.S. high-school seniors with an independent research project.', 'Free to enter.',
    '{bio-premed,engineering,math-physics,cs}', '{research,academic}',
    'intensive', 'Months of original research + a written report', 180,
    11, null, 'Application typically due mid-November of senior year.', false,
    'https://www.societyforscience.org/regeneron-sts/', 'official_site', 'https://www.societyforscience.org/regeneron-sts/', 'medium', now(), 'seed'
  ),
  (
    'Regeneron International Science and Engineering Fair (ISEF)', 'Society for Science', 'research',
    'The world''s largest pre-college STEM research competition; students qualify through affiliated regional and state science fairs.',
    '{9,10,11,12}', 'Qualify through a Society-affiliated regional/state fair.', 'Free (fair fees vary).',
    '{bio-premed,engineering,math-physics,cs}', '{research,academic}',
    'intensive', 'A full research project + local fair cycle', 120,
    2, null, 'Local/regional fairs run winter–spring; check your affiliated fair.', false,
    'https://www.societyforscience.org/isef/', 'official_site', 'https://www.societyforscience.org/isef/', 'low', now(), 'seed'
  ),
  (
    'MIT THINK Scholars Program', 'MIT THINK', 'research',
    'Supports students with an idea for a science/technology/engineering research project — mentorship and funding rather than a finished project required.',
    '{9,10,11,12}', 'U.S. high-school students; proposal-based (no completed project needed).', 'Free to apply.',
    '{cs,engineering,math-physics}', '{research,cs-ai}',
    'substantial', 'Several weeks to write a strong proposal', 45,
    1, null, 'Applications typically due in January.', false,
    'https://think.mit.edu/', 'official_site', 'https://think.mit.edu/', 'medium', now(), 'seed'
  ),
  (
    'AMC 10/12 (American Mathematics Competitions)', 'Mathematical Association of America', 'olympiad',
    'The entry contests to the USA Mathematical Olympiad pipeline — a widely recognized signal of quantitative ability.',
    '{9,10,11,12}', 'AMC 10 for grade 10 and under; AMC 12 for grade 12 and under. Register via a school or approved site.',
    'Small registration fee (often covered by schools).',
    '{math-physics,cs,engineering}', '{quantitative,academic}',
    'moderate', 'Ongoing practice; the contest itself is 75 minutes', 30,
    11, null, 'Fall contest window is typically November — register through a host school.', false,
    'https://maa.org/student-programs/amc/', 'official_site', 'https://maa.org/student-programs/amc/', 'low', now(), 'seed'
  ),
  (
    'USA Computing Olympiad (USACO)', 'USACO', 'olympiad',
    'Free online algorithmic programming contests with four ability divisions; a strong, self-paced way to demonstrate CS problem-solving.',
    '{9,10,11,12}', 'Open to all pre-college students worldwide.', 'Free.',
    '{cs}', '{cs-ai,quantitative}',
    'substantial', 'Ongoing practice; contests are held on set weekends', 30,
    null, null, 'Contests run roughly monthly December–February; participation is open.', false,
    'https://usaco.org/', 'official_site', 'https://usaco.org/', 'low', now(), 'seed'
  ),
  (
    'Coca-Cola Scholars Program', 'The Coca-Cola Scholars Foundation', 'scholarship',
    'A prestigious achievement-based scholarship recognizing leadership, service, and academic excellence in graduating seniors.',
    '{12}', 'U.S. high-school seniors planning to enroll in college.', 'Free to apply.',
    '{}', '{leadership,service,academic}',
    'moderate', 'A few weeks to prepare the application', 21,
    10, 31, 'Application typically closes October 31 of senior year.', false,
    'https://www.coca-colascholarsfoundation.org/', 'official_site', 'https://www.coca-colascholarsfoundation.org/', 'medium', now(), 'seed'
  ),
  (
    'The Congressional Award', 'The Congressional Award Foundation', 'service',
    'A non-competitive Congressional recognition earned through self-set goals in volunteer service, personal development, physical fitness, and expedition.',
    '{9,10,11,12}', 'Ages 13.5–23; year-round enrollment.', 'Free to register.',
    '{}', '{service,leadership}',
    'substantial', 'Months of logged goals (self-paced)', 90,
    null, null, 'Rolling — register any time and log hours toward your goals.', true,
    'https://www.congressionalaward.org/', 'official_site', 'https://www.congressionalaward.org/', 'medium', now(), 'seed'
  ),
  (
    'Diamond Challenge for High School Entrepreneurs', 'University of Delaware (Horn Entrepreneurship)', 'entrepreneurship',
    'A global entrepreneurship competition where teams pitch a business or social venture concept.',
    '{9,10,11,12}', 'Teams of 2–4 students under 18/19 (see rules).', 'Free to enter.',
    '{business}', '{entrepreneurship,leadership}',
    'substantial', 'Several weeks to develop and pitch a concept', 45,
    11, null, 'Submissions typically due in November.', false,
    'https://diamondchallenge.org/', 'official_site', 'https://diamondchallenge.org/', 'low', now(), 'seed'
  ),
  (
    'Conrad Challenge', 'Conrad Foundation', 'entrepreneurship',
    'An innovation and entrepreneurship competition asking teams to solve real-world problems with a commercially viable product.',
    '{9,10,11,12}', 'Teams of 2–5 students ages 13–18.', 'Registration fee (some waivers available).',
    '{engineering,business,bio-premed}', '{entrepreneurship,research}',
    'substantial', 'Multi-month project across rounds', 60,
    11, null, 'Early rounds open in fall; deadlines are staged through the year.', false,
    'https://www.conradchallenge.org/', 'official_site', 'https://www.conradchallenge.org/', 'low', now(), 'seed'
  ),
  (
    'Scholastic Art & Writing Awards', 'Alliance for Young Artists & Writers', 'competition',
    'The longest-running recognition program for creative teens across many art and writing categories, judged first at the regional level.',
    '{7,8,9,10,11,12}', 'Students in grades 7–12 in the U.S. and Canada.', 'Submission fee per work (waivers available).',
    '{humanities,design}', '{creativity,academic}',
    'moderate', 'Time to create and polish a portfolio piece', 30,
    12, null, 'Regional deadlines fall in December–January; check your region.', false,
    'https://www.artandwriting.org/', 'official_site', 'https://www.artandwriting.org/', 'low', now(), 'seed'
  ),
  (
    'The Concord Review', 'The Concord Review', 'publication',
    'The only quarterly journal in the world to publish exemplary history research essays by high-school students.',
    '{9,10,11,12}', 'Secondary students worldwide; submit a serious history research essay.', 'Submission + subscription fee.',
    '{humanities,polisci}', '{research,creativity,academic}',
    'substantial', 'A researched long-form history essay', 45,
    null, null, 'Rolling submissions reviewed for quarterly issues.', true,
    'https://www.tcr.org/', 'official_site', 'https://www.tcr.org/', 'low', now(), 'seed'
  ),
  (
    'Davidson Fellows Scholarship', 'Davidson Institute', 'fellowship',
    'Scholarships recognizing extraordinary, significant work (a "piece of work") in STEM, literature, music, or philosophy.',
    '{9,10,11,12}', 'Under 18; submit a significant completed project.', 'Free to apply.',
    '{cs,engineering,math-physics,bio-premed,humanities}', '{research,creativity,academic}',
    'intensive', 'A major completed project', 120,
    2, null, 'Application typically due in February.', false,
    'https://www.davidsongifted.org/gifted-programs/fellows-scholarship/', 'official_site', 'https://www.davidsongifted.org/gifted-programs/fellows-scholarship/', 'low', now(), 'seed'
  ),
  (
    'National History Day Contest', 'National History Day', 'academic_challenge',
    'A year-long research program culminating in projects (papers, exhibits, documentaries, performances, websites) advanced through school, regional, and state contests.',
    '{6,7,8,9,10,11,12}', 'Students in grades 6–12; enter through a school or affiliate.', 'Affiliate/registration fees vary.',
    '{humanities,polisci}', '{research,creativity,academic}',
    'substantial', 'A semester-long research project', 60,
    2, null, 'School/regional contests run winter–spring; check your affiliate.', false,
    'https://www.nhd.org/', 'official_site', 'https://www.nhd.org/', 'low', now(), 'seed'
  ),
  (
    'YoungArts', 'National YoungArts Foundation', 'competition',
    'A national award for emerging artists in the visual, literary, design, and performing arts, offering recognition, cash awards, and mentorship.',
    '{10,11,12}', 'Artists ages 15–18 (grades 10–12).', 'Application fee (waivers available).',
    '{design,humanities}', '{creativity,academic}',
    'moderate', 'Time to prepare a strong arts submission', 30,
    10, null, 'Application typically closes in mid-October.', false,
    'https://youngarts.org/apply/', 'official_site', 'https://youngarts.org/apply/', 'low', now(), 'seed'
  ),
  (
    'Congressional Art Competition', 'U.S. House of Representatives', 'competition',
    'An annual district-level visual-art competition; winning works are displayed in the U.S. Capitol.',
    '{9,10,11,12}', 'High-school students by congressional district.', 'Free to enter.',
    '{design}', '{creativity}',
    'moderate', 'Time to complete an original artwork', 21,
    4, null, 'District deadlines are usually in the spring — confirm with your representative''s office.', false,
    'https://www.house.gov/educators-and-students/congressional-art-competition', 'official_site', 'https://www.house.gov/educators-and-students/congressional-art-competition', 'low', now(), 'seed'
  );
