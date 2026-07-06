-- Add school_type column to profiles for high school type question (Step 2 of onboarding)

alter table public.profiles
  add column if not exists school_type text;
