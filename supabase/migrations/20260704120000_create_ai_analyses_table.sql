-- Create ai_analyses table to store AI-generated admissions guidance
create table if not exists public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  analysis jsonb not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz default now() not null
);

alter table public.ai_analyses enable row level security;

-- Users can only read their own analyses
create policy "users_select_own_analyses"
  on public.ai_analyses
  for select
  using (auth.uid() = user_id);

-- Inserts come exclusively from the API route using the service role key,
-- which bypasses RLS entirely, so no authenticated insert policy is needed.

create index if not exists ai_analyses_user_id_created_at_idx
  on public.ai_analyses (user_id, created_at desc);
