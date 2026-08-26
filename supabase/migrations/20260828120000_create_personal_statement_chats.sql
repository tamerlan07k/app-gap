-- GapCoach live-chat threads, one per personal statement.
--
-- The whole conversation for an essay lives in a single `messages` jsonb array
-- ([{role, content, at}, ...]). Writes come ONLY from the service-role chat route
-- (which appends the student's message and GapCoach's reply together), so there
-- is no authenticated insert/update policy — users can read their own thread but
-- not forge messages. One row per statement (statement_id is the PK) lets the
-- route upsert in place.

create table if not exists public.personal_statement_chats (
  statement_id uuid primary key references public.personal_statements(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  messages     jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.personal_statement_chats enable row level security;

create index if not exists personal_statement_chats_user_id_idx
  on public.personal_statement_chats(user_id);

-- Read-own only. All writes flow through the service-role chat route.
create policy "personal_statement_chats_select"
  on public.personal_statement_chats
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
