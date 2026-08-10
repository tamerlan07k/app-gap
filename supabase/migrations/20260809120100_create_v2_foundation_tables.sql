-- V2 foundation tables: the living-application workspace.
--
-- Additive only — no existing table or column is touched. Three new tables lay
-- the groundwork for the V2 architecture:
--   * user_events       — lightweight activity ledger powering the dashboard
--                         "Jump In" (latest meaningful action) + future progress.
--   * roadmap_tasks     — the Workplace / My Roadmap action items. Tasks carry a
--                         real status lifecycle and a feature_key so a future
--                         feature (Opportunity Finder, Application Writing, ...)
--                         can open from a task and report progress back — tasks
--                         are NOT static text.
--   * profile_documents — essays & written application pieces (Personal
--                         Statement, supplementals, Additional Info, activity
--                         descriptions). Backs the dashboard "Essays" progress
--                         count and the My Profile essay sections.
-- All three are owner-scoped with granular per-operation RLS, matching the
-- existing profile/child-table conventions.

-- ─── user_events ─────────────────────────────────────────────────────────────

create table if not exists public.user_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  event_type text not null,                    -- e.g. 'analysis_generated', 'essay_completed'
  title      text not null default '',         -- human-readable label for "Jump In"
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.user_events enable row level security;

create index if not exists user_events_user_id_created_at_idx
  on public.user_events (user_id, created_at desc);

create policy "user_events_select" on public.user_events
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_events_insert" on public.user_events
  for insert to authenticated
  with check (user_id = (select auth.uid()));

-- ─── roadmap_tasks ───────────────────────────────────────────────────────────

create table if not exists public.roadmap_tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  -- The diagnostic snapshot that surfaced this task (nullable; keep the task if
  -- the analysis is later deleted).
  analysis_id uuid references public.ai_analyses(id) on delete set null,
  title       text not null default '',
  description text not null default '',
  category    text not null default '',        -- 'academics' | 'activities' | 'awards' | 'essays' | ...
  -- Lifecycle: not_started -> in_progress -> pending -> accepted/rejected -> in_process -> done
  status      text not null default 'not_started'
              check (status in ('not_started','in_progress','pending','accepted','rejected','in_process','done')),
  priority    text check (priority in ('high','medium','low')),
  -- Which AppGap feature this task opens (e.g. 'opportunity_finder','application_writing').
  feature_key text,
  metadata    jsonb not null default '{}'::jsonb,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.roadmap_tasks enable row level security;

create index if not exists roadmap_tasks_user_id_idx
  on public.roadmap_tasks (user_id);
create index if not exists roadmap_tasks_user_id_status_idx
  on public.roadmap_tasks (user_id, status);
create index if not exists roadmap_tasks_analysis_id_idx
  on public.roadmap_tasks (analysis_id);

create policy "roadmap_tasks_select" on public.roadmap_tasks
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "roadmap_tasks_insert" on public.roadmap_tasks
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "roadmap_tasks_update" on public.roadmap_tasks
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "roadmap_tasks_delete" on public.roadmap_tasks
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- ─── profile_documents ───────────────────────────────────────────────────────

create table if not exists public.profile_documents (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  doc_type   text not null
             check (doc_type in ('personal_statement','supplemental','additional_info','activity_description')),
  title      text not null default '',
  prompt     text not null default '',
  content    text not null default '',
  status     text not null default 'not_started'
             check (status in ('not_started','in_progress','complete')),
  college    text,                             -- future: which college a supplement targets
  word_count integer,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profile_documents enable row level security;

create index if not exists profile_documents_user_id_idx
  on public.profile_documents (user_id);
create index if not exists profile_documents_user_id_doc_type_idx
  on public.profile_documents (user_id, doc_type);

create policy "profile_documents_select" on public.profile_documents
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "profile_documents_insert" on public.profile_documents
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "profile_documents_update" on public.profile_documents
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "profile_documents_delete" on public.profile_documents
  for delete to authenticated
  using (user_id = (select auth.uid()));
