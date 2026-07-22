-- Roadmap generation usage ledger.
--
-- Purpose: track how many roadmap generations a user has consumed per billing
-- month, INDEPENDENTLY of the ai_analyses rows that store the generated
-- roadmaps. Previously the monthly limit was derived by counting ai_analyses
-- rows, which let a user reset their limit by deleting a roadmap. This table is
-- an append-only ledger: a row is written on each successful generation and is
-- never removed when a roadmap is deleted, so deletes can never restore or
-- increase a user's remaining monthly generations.

create table if not exists public.roadmap_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  -- Effective tier at the moment of generation (audit / analytics only).
  tier text not null check (tier in ('free', 'pro')),
  created_at timestamptz default now() not null
);

alter table public.roadmap_generations enable row level security;

-- Users can read their own usage (the dashboard pages count these rows via the
-- user-scoped client to decide whether the monthly limit is reached).
create policy "users_select_own_generations"
  on public.roadmap_generations
  for select
  to authenticated
  using (auth.uid() = user_id);

-- No insert/update/delete policies: writes come exclusively from the API route
-- using the service-role key, which bypasses RLS. Leaving these unmanaged means
-- authenticated and anon clients are default-denied, so the ledger is immutable
-- from the client — a user cannot tamper with their own usage count.

create index if not exists roadmap_generations_user_id_created_at_idx
  on public.roadmap_generations (user_id, created_at desc);

-- Backfill from existing analyses so the switch-over preserves each user's
-- current-month usage (the migration itself must not reset anyone's limit).
-- One ledger row per historical analysis. Tier is unknown for past rows, so we
-- record the tier the profile currently resolves to as a best-effort default;
-- only created_at matters for the monthly count.
insert into public.roadmap_generations (user_id, tier, created_at)
select
  a.user_id,
  case when coalesce(p.subscription_tier, 'free') = 'pro' then 'pro' else 'free' end,
  a.created_at
from public.ai_analyses a
left join public.profiles p on p.id = a.user_id;
