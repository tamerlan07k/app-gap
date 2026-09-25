-- Supplemental Essays workspace: per-college, prompt-first supplemental essays.
--
-- Mirrors the Personal Statement dual-ownership model:
--   * supplemental_essays          — content the STUDENT edits directly from the
--                                    client, so it gets full owner RLS
--                                    (select/insert/update/delete on auth.uid()).
--   * supplemental_essay_analyses  — AI feedback caches written ONLY by the
--                                    service-role coach routes (which bypass RLS),
--                                    so there is a read-own SELECT policy and no
--                                    insert/update policy.
--   * supplemental_essay_chats     — GapCoach conversation, one row per essay,
--                                    likewise service-role-written / read-own.
--
-- V1 decisions baked into this schema:
--   * Prompts are STUDENT-ENTERED (prompt-first parser handles novel prompts);
--     there is no prompt-catalog table. prompt_text lives on the essay row.
--   * SINGLE content + finalized snapshot per prompt (no multi-draft model). The
--     working copy is `content`; finalizing copies it into the snapshot columns.
--   * The essay's TARGET SCOPE (school/program/track) is NOT duplicated here — it
--     is read from the student's existing user_colleges row for that college, so
--     the verified-data resolver can scope to it without a second source of truth.
--
-- Fully isolated from the AppGap Score / chancing engine: nothing here feeds
-- strength.ts or assessment.ts. The My Colleges "Supplemental Essays: Strong /
-- Developing / Needs Revision" signal is derived at read time from these rows.

-- ─── supplemental_essays ─────────────────────────────────────────────────────
-- One row per (user, college, prompt the student is answering). A college can
-- have many prompts; each is its own row with its own status and content.
-- word_limit is nullable (many supplements state one, some do not). status tracks
-- the workspace lifecycle; a CHECK guards the small fixed set. prompt_source
-- distinguishes a hand-entered prompt from a future catalog-sourced one.

create table if not exists public.supplemental_essays (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  college_id            uuid not null references public.colleges(id) on delete cascade,
  prompt_text           text not null default '',
  word_limit            integer,
  prompt_source         text not null default 'manual'
                          check (prompt_source in ('manual', 'catalog')),
  content               text not null default '',
  word_count            integer not null default 0,
  status                text not null default 'not_started'
                          check (status in ('not_started', 'drafting', 'needs_revision', 'finalized')),
  -- Frozen snapshot taken when the student marks the essay Finalized. Independent
  -- of `content` so later edits to the working copy never mutate the final.
  finalized_content     text,
  finalized_word_count  integer,
  finalized_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.supplemental_essays enable row level security;

create index if not exists supplemental_essays_user_id_idx
  on public.supplemental_essays(user_id);
create index if not exists supplemental_essays_college_id_idx
  on public.supplemental_essays(college_id);
-- The workspace lists a college's essays for a user; index the pair.
create index if not exists supplemental_essays_user_college_idx
  on public.supplemental_essays(user_id, college_id);

create policy "supplemental_essays_select" on public.supplemental_essays
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "supplemental_essays_insert" on public.supplemental_essays
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "supplemental_essays_update" on public.supplemental_essays
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "supplemental_essays_delete" on public.supplemental_essays
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── supplemental_essay_analyses ─────────────────────────────────────────────
-- Per-essay AI output cache. One row per (essay, kind) so each essay keeps its
-- latest result for each engine. kinds:
--   'parse'        — prompt-first parse (archetypes, directives, constraints)
--   'evaluation'   — graded evaluation (dimensions, directive coverage, notes)
--   'line_by_line' — sentence-level classified feedback
--   'redundancy'   — application-level repetition / value-add diagnostic
-- Writes come ONLY from the service-role coach routes (RLS bypassed), so there is
-- a read-own SELECT policy and no insert/update policy. unique(essay_id, kind)
-- lets routes upsert in place.

create table if not exists public.supplemental_essay_analyses (
  id                uuid primary key default gen_random_uuid(),
  essay_id          uuid not null references public.supplemental_essays(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  kind              text not null,
  analysis          jsonb not null,
  model             text not null,
  prompt_tokens     integer,
  completion_tokens integer,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (essay_id, kind)
);

alter table public.supplemental_essay_analyses enable row level security;

create index if not exists supplemental_essay_analyses_user_id_idx
  on public.supplemental_essay_analyses(user_id);
create index if not exists supplemental_essay_analyses_essay_id_idx
  on public.supplemental_essay_analyses(essay_id);

-- Read-own only. All writes flow through the service-role coach routes.
create policy "supplemental_essay_analyses_select"
  on public.supplemental_essay_analyses
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- ─── supplemental_essay_chats ────────────────────────────────────────────────
-- GapCoach live-chat threads, one per essay. The whole conversation lives in a
-- single `messages` jsonb array ([{role, content, at}, ...]). Writes come ONLY
-- from the service-role chat route (which appends the student's message and the
-- coach's reply together), so there is a read-own SELECT policy and no
-- insert/update policy — users read their own thread but cannot forge messages.
-- One row per essay (essay_id is the PK) lets the route upsert in place.

create table if not exists public.supplemental_essay_chats (
  essay_id     uuid primary key references public.supplemental_essays(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  messages     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.supplemental_essay_chats enable row level security;

create index if not exists supplemental_essay_chats_user_id_idx
  on public.supplemental_essay_chats(user_id);

-- Read-own only. All writes flow through the service-role chat route.
create policy "supplemental_essay_chats_select"
  on public.supplemental_essay_chats
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
