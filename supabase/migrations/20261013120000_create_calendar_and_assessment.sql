-- My Roadmap foundation phase — the Career Path Assessment and the Personalized
-- Application Calendar. Both are part of the shared "foundation" a student passes
-- through before the four application branches are revealed.
--
--   • career_assessments — one row per user: the questionnaire answers, the
--     deterministic suggested-majors result, and whether the student confirmed it.
--   • calendars — one row per user: the single lifetime calendar generation
--     (status/confirmed/provisional), mirroring the roadmaps reservation pattern.
--   • calendar_tasks — the scheduled tasks themselves, shared with the roadmap
--     (a task may reference a roadmap milestone id so the two stay in sync).
--
-- Milestone/task CONTENT lives in code (src/lib/roadmap, src/lib/calendar); these
-- tables store only per-user state so the libraries can change without rewrites.

-- ─── Career Path Assessment ──────────────────────────────────────────────────

create table if not exists public.career_assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  -- Raw questionnaire answers (option keys per question) — lets the student
  -- review/adjust without re-answering from scratch.
  answers jsonb not null default '{}'::jsonb,
  -- Deterministic result: ranked suggested majors/fields + rationale (computed in
  -- code from answers + the academic-interests taxonomy; never AI-fabricated).
  result jsonb not null default '{}'::jsonb,
  -- Where the direction came from: the assessment, or confirming an existing
  -- profile major.
  source text not null default 'assessment' check (source in ('assessment', 'profile')),
  confirmed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.career_assessments enable row level security;

create policy "career_assessments_select_own"
  on public.career_assessments for select to authenticated
  using (auth.uid() = user_id);
create policy "career_assessments_insert_own"
  on public.career_assessments for insert to authenticated
  with check (auth.uid() = user_id);
create policy "career_assessments_update_own"
  on public.career_assessments for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update on public.career_assessments to authenticated;

-- ─── Calendar (one lifetime generation per user) ─────────────────────────────

create table if not exists public.calendars (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null unique,
  status text not null default 'generating'
    check (status in ('generating', 'ready', 'failed')),
  -- The student reviewed and confirmed the proposed schedule.
  confirmed boolean not null default false,
  -- True when deadlines were unknown and the schedule is grade-based guidance
  -- rather than anchored to real application deadlines.
  provisional boolean not null default false,
  horizon_start date,
  horizon_end date,
  deadline_label text,
  tier text check (tier in ('free', 'pro')),
  error text,
  started_at timestamptz not null default now(),
  generated_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.calendars enable row level security;

-- Users read their own calendar and may UPDATE it (confirming the schedule).
-- Generation/reservation writes go through the service role (bypasses RLS); there
-- is no client insert/delete policy, so a user cannot create a calendar directly
-- (the server enforces the one-generation limit) or delete it to reset it.
create policy "calendars_select_own"
  on public.calendars for select to authenticated
  using (auth.uid() = user_id);
create policy "calendars_update_own"
  on public.calendars for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, update on public.calendars to authenticated;

create index if not exists calendars_user_status_idx
  on public.calendars (user_id, status);

-- ─── Calendar tasks (shared with the roadmap) ────────────────────────────────

create table if not exists public.calendar_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  description text not null default '',
  -- Branch this task belongs to (academics/essays/awards/activities/foundation),
  -- for grouping + coloring. Nullable for freeform tasks.
  branch text,
  -- The roadmap milestone this task corresponds to, when they represent the same
  -- work — this is the sync key between the calendar and the roadmap. Nullable.
  milestone_id text,
  -- Destination workspace (validated in code against the known routes). Nullable.
  href text,
  due_date date not null,
  status text not null default 'todo' check (status in ('todo', 'done')),
  deadline_sensitive boolean not null default false,
  is_provisional boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_tasks enable row level security;

-- Users fully own their calendar tasks: read, mark complete, adjust dates, add,
-- or remove. Generation writes (bulk insert) go through the service role.
create policy "calendar_tasks_select_own"
  on public.calendar_tasks for select to authenticated
  using (auth.uid() = user_id);
create policy "calendar_tasks_insert_own"
  on public.calendar_tasks for insert to authenticated
  with check (auth.uid() = user_id);
create policy "calendar_tasks_update_own"
  on public.calendar_tasks for update to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "calendar_tasks_delete_own"
  on public.calendar_tasks for delete to authenticated
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.calendar_tasks to authenticated;

create index if not exists calendar_tasks_user_due_idx
  on public.calendar_tasks (user_id, due_date);
create index if not exists calendar_tasks_user_milestone_idx
  on public.calendar_tasks (user_id, milestone_id);
