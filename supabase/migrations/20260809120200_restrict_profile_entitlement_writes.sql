-- Prevent end users from modifying their own billing / entitlement columns.
--
-- The profiles_insert / profiles_update RLS policies only check row ownership
-- (auth.uid() = id), so an authenticated user calling the Supabase API directly
-- could set subscription_tier = 'pro' or admin_override = true on their OWN row
-- and self-grant Pro, bypassing Stripe and admin controls. RLS cannot express
-- column-level restrictions here, so we enforce them with a BEFORE trigger.
--
-- These entitlement columns are written exclusively by server-side code using
-- the service-role key (the Stripe webhook, admin billing actions, and override
-- reconciliation). The trigger enforces the lock ONLY for the end-user API roles
-- (authenticated / anon); every privileged role (service_role, postgres, and the
-- migration runner) passes through untouched, so legitimate billing writes are
-- unaffected. Onboarding writes are unaffected because they never set these
-- columns.

create or replace function public.lock_profile_entitlement_columns()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Privileged / server roles (service_role, postgres, ...) write freely.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Force entitlement columns to their safe defaults on user-created rows.
    new.subscription_tier            := 'free';
    new.subscription_status          := null;
    new.current_period_end           := null;
    new.stripe_customer_id           := null;
    new.stripe_subscription_id       := null;
    new.admin_override               := false;
    new.admin_override_tier          := null;
    new.admin_override_start         := null;
    new.admin_override_expires_at    := null;
    new.admin_override_paused_stripe := false;
  else
    -- UPDATE: preserve the existing entitlement columns regardless of input.
    new.subscription_tier            := old.subscription_tier;
    new.subscription_status          := old.subscription_status;
    new.current_period_end           := old.current_period_end;
    new.stripe_customer_id           := old.stripe_customer_id;
    new.stripe_subscription_id       := old.stripe_subscription_id;
    new.admin_override               := old.admin_override;
    new.admin_override_tier          := old.admin_override_tier;
    new.admin_override_start         := old.admin_override_start;
    new.admin_override_expires_at    := old.admin_override_expires_at;
    new.admin_override_paused_stripe := old.admin_override_paused_stripe;
  end if;

  return new;
end;
$$;

drop trigger if exists lock_profile_entitlement_columns on public.profiles;

create trigger lock_profile_entitlement_columns
  before insert or update on public.profiles
  for each row
  execute function public.lock_profile_entitlement_columns();
