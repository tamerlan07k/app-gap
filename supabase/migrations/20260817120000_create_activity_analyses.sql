-- Create activity_analyses to cache the Activities workspace AI output.
--
-- Mirrors writing_analyses (one row per user, upserted in place): the Activities
-- feature is iterative — a student re-runs it as their activities change — so we
-- only ever keep their single latest analysis, not a history. Kept separate from
-- ai_analyses / writing_analyses because it is a distinct feature contract
-- (per-activity verdicts + collective profile + timeline-aware recommendations)
-- and never feeds the gap score.
--
-- Inserts/updates come exclusively from the API route via the service-role key
-- (which bypasses RLS), so no authenticated insert/update policy is defined —
-- the same pattern as writing_analyses. The unique constraint on user_id lets
-- the route upsert on user_id.

create table if not exists public.activity_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  analysis jsonb not null,
  model text not null,
  prompt_tokens integer,
  completion_tokens integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One row per user so the API route can upsert on user_id. (Guarded so
-- re-running the migration is a no-op on an existing database.)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activity_analyses_user_id_key'
      and conrelid = 'public.activity_analyses'::regclass
  ) then
    alter table public.activity_analyses
      add constraint activity_analyses_user_id_key unique (user_id);
  end if;
end $$;

alter table public.activity_analyses enable row level security;

-- Users can only read their own activity analysis. No insert/update/delete
-- policies: all writes flow through the service-role API route.
create policy "users_select_own_activity_analyses"
  on public.activity_analyses
  for select
  to authenticated
  using (auth.uid() = user_id);
