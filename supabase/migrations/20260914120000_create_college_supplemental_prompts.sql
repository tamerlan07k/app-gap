-- Verified supplemental-essay prompts, per college and application cycle.
--
-- A college-reference table that follows the SAME conventions as the rest of the
-- college-data foundation (see docs/college-data-architecture): PUBLIC READ
-- (select to anon + authenticated), NO client writes (service-role ingestion
-- bypasses RLS), and a provenance + verification gate. The application surfaces a
-- prompt ONLY when verified_at is not null — the table ships EMPTY, and no prompt
-- text is ever invented. Prompts change every cycle, so each row is scoped to a
-- cycle_year; the workspace reads the current cycle only.
--
-- This lets the Supplemental Essays workspace pre-populate a college's official
-- prompts (student clicks one and starts writing) while manual prompt entry
-- remains the fallback for novel/custom or not-yet-verified prompts. Populated by
-- scripts/college-ingest/ingest-supplemental-prompts.mjs (candidate data,
-- pending), then human-verified (verified_at set) exactly like rounds/profiles.

create table if not exists public.college_supplemental_prompts (
  id            uuid primary key default gen_random_uuid(),
  college_id    uuid not null references public.colleges(id) on delete cascade,
  -- Optional school scope for colleges whose supplements differ by school
  -- (e.g. a specific undergraduate college). Null = applies college-wide.
  school_id     uuid references public.college_schools(id) on delete set null,
  cycle_year    text not null default '2026-2027',
  prompt_text   text not null,
  word_limit    integer,
  is_required   boolean not null default true,
  sort_order    integer not null default 0,
  -- Provenance + verification (mirrors the other college-data tables).
  source_type   text,
  source_url    text,
  source_date   date,
  verified_at   timestamptz,
  verified_by   text,
  confidence    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.college_supplemental_prompts enable row level security;

create index if not exists college_supplemental_prompts_college_id_idx
  on public.college_supplemental_prompts(college_id);
create index if not exists college_supplemental_prompts_college_cycle_idx
  on public.college_supplemental_prompts(college_id, cycle_year);

-- Public read, granular per-role (mirrors colleges / college_field_* tables).
create policy "college_supplemental_prompts_select_anon"
  on public.college_supplemental_prompts
  for select to anon using (true);

create policy "college_supplemental_prompts_select_authenticated"
  on public.college_supplemental_prompts
  for select to authenticated using (true);

-- ─── Link a student's essay back to the catalog prompt it came from ───────────
-- When a student starts an essay from an official prompt, we record which catalog
-- prompt it was (so the workspace can mark that prompt as "already added" and
-- avoid duplicates). Nullable: manually-entered prompts have no catalog link.
-- ON DELETE SET NULL so retiring a catalog prompt never deletes a student's essay.

alter table public.supplemental_essays
  add column if not exists catalog_prompt_id uuid
    references public.college_supplemental_prompts(id) on delete set null;

create index if not exists supplemental_essays_catalog_prompt_id_idx
  on public.supplemental_essays(catalog_prompt_id);
