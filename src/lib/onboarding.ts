// Onboarding completion signal.
//
// There is no single "completed" boolean in the schema; completion is derived
// from the presence of the required onboarding fields — Step 1 (grade level) and
// Step 2 (intended major) — the same rule the admin dashboard uses. This works
// for every existing user with no migration dependency. The explicit
// profiles.onboarding_completed_at timestamp is honored as an authoritative
// override when a caller provides it.

export type OnboardingSignals = {
  grade_level?: string | null;
  major_category?: string | null;
  onboarding_completed_at?: string | null;
};

/**
 * True once a user has finished onboarding (and should therefore land on the
 * dashboard rather than be routed back through the onboarding flow).
 */
export function isOnboardingComplete(
  profile: OnboardingSignals | null | undefined,
): boolean {
  if (!profile) return false;
  if (profile.onboarding_completed_at) return true;
  return Boolean(profile.grade_level) && Boolean(profile.major_category);
}
