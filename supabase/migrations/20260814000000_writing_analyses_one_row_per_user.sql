-- Collapse writing_analyses to one row per user (upsert model).
--
-- The app only ever reads a user's most recent Application Writing analysis, but
-- the previous design inserted a new row on every "Analyze"/"Refresh" click, so
-- the table grew unbounded with history that is never read. This migration
-- de-duplicates to the newest row per user, enforces one row per user with a
-- unique constraint (so the API route can upsert in place), and adds updated_at
-- to track the last refresh. Roll-forward only — safe whether or not the table
-- already holds duplicate rows.

-- 1. Keep only the most recent row per user (drop older history).
delete from public.writing_analyses a
using public.writing_analyses b
where a.user_id = b.user_id
  and a.created_at < b.created_at;

-- Tie-breaker for identical timestamps: keep the lowest id.
delete from public.writing_analyses a
using public.writing_analyses b
where a.user_id = b.user_id
  and a.created_at = b.created_at
  and a.id > b.id;

-- 2. Track the last refresh independently of the original creation time.
alter table public.writing_analyses
  add column if not exists updated_at timestamptz not null default now();

-- 3. Enforce one row per user so inserts can upsert on user_id.
--    (Guarded so re-running the migration is a no-op.)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'writing_analyses_user_id_key'
      and conrelid = 'public.writing_analyses'::regclass
  ) then
    alter table public.writing_analyses
      add constraint writing_analyses_user_id_key unique (user_id);
  end if;
end $$;

-- 4. The old composite index is now redundant — the unique constraint above
--    creates a unique index on user_id, and there is at most one row per user,
--    so ordering by created_at is unnecessary for the latest-row lookup.
drop index if exists public.writing_analyses_user_id_created_at_idx;
