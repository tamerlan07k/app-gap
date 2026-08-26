-- Per-draft AI feedback cache for the Personal Statement coach.
--
-- One row per (draft, kind), so each draft keeps its own latest feedback for
-- each engine — kind is "draft" (holistic analysis), and later "line_by_line",
-- "evaluation", etc. Like the other analysis caches, writes come ONLY from the
-- service-role API routes (which bypass RLS), so there is no authenticated
-- insert/update policy — users can only read their own rows. The unique
-- (draft_id, kind) constraint lets routes upsert in place.

create table if not exists public.personal_statement_analyses (
  id                uuid primary key default gen_random_uuid(),
  draft_id          uuid not null references public.personal_statement_drafts(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  kind              text not null,
  analysis          jsonb not null,
  model             text not null,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (draft_id, kind)
);

alter table public.personal_statement_analyses enable row level security;

create index if not exists personal_statement_analyses_user_id_idx
  on public.personal_statement_analyses(user_id);
create index if not exists personal_statement_analyses_draft_id_idx
  on public.personal_statement_analyses(draft_id);

-- Read-own only. All writes flow through the service-role coach routes.
create policy "personal_statement_analyses_select"
  on public.personal_statement_analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
