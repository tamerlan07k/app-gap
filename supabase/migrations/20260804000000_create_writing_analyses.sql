-- Create writing_analyses table to cache Application Writing feedback.
--
-- Mirrors ai_analyses: one row per generated analysis, newest read back per
-- user. Kept separate from ai_analyses because Application Writing is
-- communication feedback on the student's real text and never feeds the gap
-- score. Inserts come exclusively from the API route via the service-role key
-- (which bypasses RLS), so no authenticated insert policy is defined.

create table if not exists public.writing_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  analysis jsonb not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz default now() not null
);

alter table public.writing_analyses enable row level security;

-- Users can only read their own writing analyses.
create policy "users_select_own_writing_analyses"
  on public.writing_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Index the columns used to fetch a user's latest analysis.
create index if not exists writing_analyses_user_id_created_at_idx
  on public.writing_analyses (user_id, created_at desc);
