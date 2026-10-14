-- Onboarding "About you" identity fields, class rank, and native GPA scale.
--
-- All columns are added to the existing public.profiles table, which already has
-- RLS enabled with per-row owner policies (see 20260630045432). These are plain
-- scalar columns owned by the same row, so the existing profiles_* policies cover
-- them — no new policy or index is required (none are referenced in any policy).
--
-- Every column is nullable and additive, so existing rows and in-flight
-- onboarding are unaffected.

alter table public.profiles
  -- Identity / location (onboarding Step 1 "About you").
  -- `location` is the free-text string the student types; `location_state` is the
  -- best-effort 2-letter US state code auto-detected from it (null when none was
  -- detected), used to power the My Colleges state/region filters.
  add column if not exists location        text,
  add column if not exists location_state  text,

  -- Native-scale GPA entry. `unweighted_gpa` (existing) remains the canonical
  -- 4.0-normalized value every internal consumer reads (chancing math, AI prompt).
  -- These store what the student actually entered, for display + prompt context.
  --   gpa_scale: '4' | '5' | ... | '20' | '100' | 'none'
  add column if not exists gpa_value       numeric(6,2),
  add column if not exists gpa_scale       text,
  add column if not exists gpa_weighted    boolean,

  -- Class rank (onboarding academics page).
  --   class_rank_type: 'exact' | 'decile' | 'quintile' | 'quartile' | 'none'
  --   class_rank_value: exact rank position (1 = valedictorian), when type = 'exact'
  --   class_size: approximate graduating class size, when type = 'exact'
  --   class_rank_band: selected band for decile/quintile/quartile (e.g. '1' = top band)
  --   class_rank_weighted: whether the rank is based on weighted GPA (recorded only;
  --     does not change the score — rank systems vary too much across schools)
  add column if not exists class_rank_type     text,
  add column if not exists class_rank_value    integer,
  add column if not exists class_size          integer,
  add column if not exists class_rank_band     text,
  add column if not exists class_rank_weighted boolean;
