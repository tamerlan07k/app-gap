-- Admin billing overrides + analytics tracking.
--
-- Extends the existing Stripe billing model WITHOUT changing it:
--   * profiles gains a layer of "admin override" columns that take priority over
--     Stripe when active. Stripe columns (stripe_customer_id, subscription_tier,
--     subscription_status, current_period_end) are left completely untouched so
--     that when an override expires, normal Stripe billing resumes as before.
--   * subscription_notifications powers the in-app billing notification badge.
--   * user_sessions records one row per user per active day for analytics
--     (daily active / returning users). Recorded going forward only.

-- ─── profiles: admin override columns ────────────────────────────────────────

alter table public.profiles
  add column if not exists admin_override           boolean not null default false,
  add column if not exists admin_override_tier      text
                                                    check (admin_override_tier in ('free', 'pro')),
  add column if not exists admin_override_start      timestamptz,
  add column if not exists admin_override_expires_at timestamptz,
  -- Records whether we paused an active Stripe subscription's collection when
  -- the override was applied, so we know to resume it on expiry.
  add column if not exists admin_override_paused_stripe boolean not null default false;

-- Partial index for the reconciliation query (find active overrides to expire).
create index if not exists profiles_admin_override_active_idx
  on public.profiles(admin_override_expires_at)
  where admin_override = true;

-- ─── subscription_notifications ──────────────────────────────────────────────
-- One row per admin-driven subscription change. The user sees a red badge on
-- the Billing page until they open (read) the notification.

create table if not exists public.subscription_notifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  -- 'granted' when an admin assigns/updates a plan; 'expired' when an override ends.
  type          text not null check (type in ('granted', 'expired')),
  tier          text not null check (tier in ('free', 'pro')),
  duration_label text,
  expires_at    timestamptz,
  message       text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.subscription_notifications enable row level security;

create index if not exists subscription_notifications_user_id_idx
  on public.subscription_notifications(user_id);

-- Unread lookup for the badge.
create index if not exists subscription_notifications_unread_idx
  on public.subscription_notifications(user_id, read_at);

-- Users may read their own notifications.
create policy "subscription_notifications_select" on public.subscription_notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Users may mark their own notifications as read (update read_at). Inserts are
-- performed server-side with the service role (admin actions / reconciliation),
-- which bypasses RLS, so no insert policy is granted to authenticated users.
create policy "subscription_notifications_update" on public.subscription_notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ─── user_sessions ───────────────────────────────────────────────────────────
-- One row per authenticated user per active day. Populated on dashboard load.

create table if not exists public.user_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null default (now() at time zone 'utc')::date,
  created_at   timestamptz not null default now(),
  unique (user_id, session_date)
);

alter table public.user_sessions enable row level security;

create index if not exists user_sessions_user_id_idx
  on public.user_sessions(user_id);

create index if not exists user_sessions_session_date_idx
  on public.user_sessions(session_date);

-- Users may record and read their own session rows. Admin analytics reads all
-- rows via the service role (bypasses RLS).
create policy "user_sessions_select" on public.user_sessions
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "user_sessions_insert" on public.user_sessions
  for insert to authenticated
  with check (user_id = (select auth.uid()));
