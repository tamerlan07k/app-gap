-- Add Stripe billing fields to profiles for subscription tracking
alter table public.profiles
  add column if not exists stripe_customer_id     text unique,
  add column if not exists stripe_subscription_id text unique,
  add column if not exists subscription_tier      text not null default 'free'
                                                   check (subscription_tier in ('free', 'pro')),
  add column if not exists subscription_status    text,
  add column if not exists current_period_end     timestamptz;

create index if not exists profiles_stripe_customer_id_idx
  on public.profiles(stripe_customer_id);

create index if not exists profiles_stripe_subscription_id_idx
  on public.profiles(stripe_subscription_id);
