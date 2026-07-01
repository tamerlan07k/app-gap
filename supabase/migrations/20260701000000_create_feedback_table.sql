-- Feedback submissions from authenticated users.
-- Admin reads all rows via the service role key (bypasses RLS).
-- Users can insert and view only their own submissions.

create table if not exists public.feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,
  email      text,
  subject    text not null default '',
  message    text not null default '',
  created_at timestamptz not null default now()
);

alter table public.feedback enable row level security;

create index if not exists feedback_user_id_idx    on public.feedback(user_id);
create index if not exists feedback_created_at_idx on public.feedback(created_at desc);

create policy "feedback_insert" on public.feedback
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "feedback_select_own" on public.feedback
  for select to authenticated
  using ((select auth.uid()) = user_id);
