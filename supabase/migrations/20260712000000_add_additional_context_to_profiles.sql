-- Add optional additional_context field to profiles for student-supplied context
-- that the AI uses during roadmap generation.

alter table public.profiles
  add column if not exists additional_context text;
