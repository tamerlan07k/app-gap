"use client";

import { type ReactNode, useEffect, useState } from "react";
import {
  clearOnboardingStorage,
  getStorageOwner,
  setStorageOwner,
} from "~/lib/profile-storage";

/**
 * Account-scopes the onboarding localStorage. localStorage is per-DEVICE, so a
 * new account on the same device would otherwise inherit the previous account's
 * pre-filled onboarding forms (which never belonged to it). This clears the
 * cached step data whenever the signed-in account differs from the account that
 * cached it, BEFORE the onboarding pages render and read it (children are gated
 * behind `ready`, so there's no first-render flash of the wrong account's data).
 */
export function OnboardingStorageGuard({
  userId,
  children,
}: {
  userId: string | null;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (userId && getStorageOwner() !== userId) {
      clearOnboardingStorage();
      setStorageOwner(userId);
    }
    setReady(true);
  }, [userId]);

  if (!ready) return null;
  return <>{children}</>;
}
