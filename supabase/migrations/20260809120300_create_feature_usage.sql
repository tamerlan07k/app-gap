-- Feature-based usage ledger.
--
-- Replaces the roadmap_generations "N generations per month" model with a
-- per-feature, append-only usage ledger. Enforcement (see src/lib/feature-usage.ts)
-- counts rows for a given (user, feature) within the feature's window — lifetime,
-- month, or week — as defined centrally in FEATURE_ACCESS (src/lib/ai/config.ts).
--
-- Like roadmap_generations this is append-only and client-immutable: users may
-- read their own usage but only the service role writes it, so a user can never
-- restore an allowance (e.g. by deleting a saved analysis).
--
-- roadmap_generations is intentionally left in place as legacy/historical data;
-- it is no longer consulted for enforcement.

create table if not exists public.feature_usage (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete cascade not null,
  -- Feature key from the FEATURE_ACCESS registry, e.g. 'profileAnalysis'.
  feature    text not null,
  -- Effective tier at the moment of use (audit / analytics only).
  tier       text not null check (tier in ('free', 'pro')),
  created_at timestamptz default now() not null
);

alter table public.feature_usage enable row level security;

create index if not exists feature_usage_user_feature_created_idx
  on public.feature_usage (user_id, feature, created_at desc);

-- Users may read their own usage (dashboard/list pages check availability). No
-- insert/update/delete policies: writes come exclusively from the service-role
-- API path, so the ledger is immutable from any client.
create policy "feature_usage_select_own" on public.feature_usage
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Backfill each user's existing diagnostic usage from the legacy ledger so the
-- switch-over preserves history: a Free user who already generated their one
-- analysis must NOT be handed a fresh lifetime allowance. roadmap_generations was
-- itself backfilled from ai_analyses, so this captures the full generation history.
insert into public.feature_usage (user_id, feature, tier, created_at)
select user_id, 'profileAnalysis', tier, created_at
from public.roadmap_generations;
