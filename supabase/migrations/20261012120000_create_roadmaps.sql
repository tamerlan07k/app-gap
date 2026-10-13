-- My Roadmap — the personalized, four-branch college-application planning
-- surface. One roadmap per user, ever (a Pro, lifetime-once feature). This table
-- stores the GENERATED roadmap only: an ordered list of milestone references
-- (stable library IDs), their per-user state, and the recommended next step.
--
-- The milestone TEMPLATES (titles, why-it-matters, destination routes, grade
-- ranges, …) live in code (src/lib/roadmap/milestones.ts), NOT here, so the
-- library can be maintained without rewriting anyone's saved roadmap. A saved
-- roadmap references templates by ID; render-time lookup supplies the content.
--
-- Concurrency + the one-generation-ever rule:
--   • `user_id` is UNIQUE — at most one roadmap row can exist per user, so two
--     simultaneous generate requests cannot both create a roadmap. The losing
--     request sees the existing row and returns it.
--   • The durable "lifetime generation consumed" signal is the append-only
--     feature_usage ledger (feature = 'roadmapGeneration', window = lifetime),
--     written only on a SUCCESSFUL generation. A failed generation leaves a
--     recoverable 'failed' row and records NO usage, so the allowance is intact
--     and the user can retry without ever producing two successful roadmaps.

create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,

  -- Lifecycle. 'generating' is a reservation written before the AI call;
  -- 'ready' is a persisted, usable roadmap; 'failed' is a recoverable reservation
  -- whose generation errored (retry allowed, allowance not consumed).
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),

  -- The ordered roadmap: an array of { id, branch, status, note? } objects whose
  -- `id` is a stable milestone-library key. Structural content (title, route, …)
  -- is looked up from the code library by id at render time — never stored here.
  milestones jsonb not null default '[]'::jsonb,

  -- The recommended next milestone id. Recomputed deterministically on every
  -- completion/adaptation; stored so the server stays the source of truth.
  next_step_id text,

  -- Effective tier at generation time (audit/analytics only).
  tier text check (tier in ('free', 'pro')),

  -- Last non-fatal generation error, for the recoverable 'failed' state.
  error text,

  started_at timestamptz not null default now(),   -- reservation timestamp
  generated_at timestamptz,                        -- set when status → 'ready'
  updated_at timestamptz not null default now()
);

alter table public.roadmaps enable row level security;

-- Users may READ their own roadmap (the page loads it via the user-scoped client).
create policy "roadmaps_select_own"
  on public.roadmaps
  for select
  to authenticated
  using (auth.uid() = user_id);

-- Users may UPDATE their own roadmap's PROGRESS from the client (marking a
-- milestone complete / recomputing the next step). The server-side generation
-- and reservation writes use the service-role key, which bypasses RLS. There are
-- deliberately NO insert or delete policies for authenticated/anon: a user
-- cannot create a roadmap directly (only the server can, enforcing the limit)
-- and cannot delete it to reset their lifetime allowance.
create policy "roadmaps_update_own"
  on public.roadmaps
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Table-level privileges for the Data API roles. RLS policies alone do not grant
-- table access — the API roles also need a GRANT (the current Supabase default no
-- longer auto-grants new public tables). Read + update only; insert/delete stay
-- with the service role.
grant select, update on public.roadmaps to authenticated;

-- user_id is already unique (implicit index); this index speeds the status-scoped
-- reservation guards (recover only 'failed' / stale 'generating' rows).
create index if not exists roadmaps_user_status_idx
  on public.roadmaps (user_id, status);
