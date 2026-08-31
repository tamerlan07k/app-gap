-- Career Direction v2: granular academic direction + per-college target hierarchy.
--
-- 1) profiles gains a precise academic direction alongside the existing coarse
--    `major_category` (which stays as the field-fit key, now auto-derived):
--      - academic_major     : specific major key from the taxonomy
--                             (src/lib/academic-interests.ts), e.g. "aerospace-engineering"
--      - academic_interests : optional specialization keys (jsonb array)
--    The legacy `selectivity` column is intentionally LEFT IN PLACE (non-
--    destructive) but is no longer written or read — the AppGap score must not
--    depend on a target tier.
--
-- 2) user_colleges gains an OPTIONAL university → school → program → degree
--    target hierarchy. All nullable: only collected when a college has
--    meaningful separately-admitting schools/degree distinctions, and
--    uncertainty ("Not sure yet") is always allowed. These are never used to
--    fabricate admission multipliers — only verified data drives chances.

-- ── profiles: academic direction ─────────────────────────────────────────────

alter table public.profiles
  add column if not exists academic_major text;

alter table public.profiles
  add column if not exists academic_interests jsonb not null default '[]'::jsonb;

-- ── user_colleges: optional per-college target hierarchy ─────────────────────

alter table public.user_colleges
  add column if not exists school_id uuid
    references public.college_schools(id) on delete set null;

alter table public.user_colleges
  add column if not exists program_id uuid
    references public.college_programs(id) on delete set null;

-- Free-text intended major/program for this specific college when the student
-- knows a program not represented by a college_programs row.
alter table public.user_colleges
  add column if not exists intended_major text;

-- Degree pathway when it materially affects the application (e.g. 'BA' vs 'BS');
-- NULL means undecided / not applicable — a legitimate state.
alter table public.user_colleges
  add column if not exists degree_type text;

create index if not exists user_colleges_school_id_idx
  on public.user_colleges (school_id);
create index if not exists user_colleges_program_id_idx
  on public.user_colleges (program_id);
