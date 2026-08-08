-- Track whether a Stripe subscription is scheduled to cancel at the end of the
-- current billing period. Set from the `cancel_at_period_end` field on Stripe
-- subscription webhook events so the billing UI can show a pending-cancellation
-- state ("Cancels on <date>") instead of implying the plan will renew.
alter table public.profiles
  add column if not exists cancel_at_period_end boolean not null default false;
