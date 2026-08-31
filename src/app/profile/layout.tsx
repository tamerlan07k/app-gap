import type { ReactNode } from "react";
import { createClient } from "~/lib/supabase/server";
import { OnboardingStorageGuard } from "./onboarding-storage-guard";

// Wraps the whole onboarding flow so the cached step data is scoped to the
// signed-in account (see OnboardingStorageGuard). The user id comes from the
// server session — reliable, and it never touches the browser auth client.
export default async function ProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <OnboardingStorageGuard userId={user?.id ?? null}>
      {children}
    </OnboardingStorageGuard>
  );
}
