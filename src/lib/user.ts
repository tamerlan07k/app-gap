import type { User } from "@supabase/supabase-js";

export function getFirstName(user: User): string {
  return (
    (user.user_metadata?.first_name as string | undefined) ??
    (user.user_metadata?.given_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined)?.split(" ")[0] ??
    user.email?.split("@")[0] ??
    "there"
  );
}

export function getLastName(user: User): string {
  return (
    (user.user_metadata?.last_name as string | undefined) ??
    (user.user_metadata?.family_name as string | undefined) ??
    ""
  );
}
