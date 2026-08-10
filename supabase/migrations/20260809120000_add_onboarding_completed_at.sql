-- Track when a user completed onboarding.
--
-- Until now "onboarding complete" was derived from the presence of grade_level +
-- major_category (see onboardingStatus() in the admin dashboard). That derivation
-- stays valid, but an explicit timestamp gives the new post-signup routing a
-- single, unambiguous signal and records WHEN onboarding finished (analytics).
-- Nullable + backfilled, so nothing about existing users changes.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Backfill existing users who have already finished onboarding (both the Step 1
-- and Step 2 required fields are present). Use their last profile update as a
-- best-effort completion time. Users still mid-onboarding stay null.
update public.profiles
set onboarding_completed_at = coalesce(updated_at, created_at, now())
where onboarding_completed_at is null
  and grade_level is not null
  and major_category is not null;
