import { redirect } from "next/navigation";
import { DashboardShell } from "~/components/dashboard-shell";
import { isAdmin } from "~/lib/is-admin";
import { isOnboardingComplete } from "~/lib/onboarding";
import { createAdminClient } from "~/lib/supabase/admin";
import { createClient } from "~/lib/supabase/server";

// Records one session row per user per UTC day for analytics (daily active /
// returning users). Idempotent via the (user_id, session_date) unique index, so
// repeated navigations in a day are no-ops. Fire-and-forget: never blocks render.
async function recordSession(userId: string) {
  try {
    const admin = createAdminClient();
    const today = new Date().toISOString().slice(0, 10);
    await admin
      .from("user_sessions")
      .upsert(
        { user_id: userId, session_date: today },
        { onConflict: "user_id,session_date", ignoreDuplicates: true },
      );
  } catch {
    // Analytics tracking must never break the dashboard.
  }
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await recordSession(user.id);

    // Gate the dashboard on onboarding completion: brand-new users (and anyone
    // who never finished onboarding) are routed into the 5-step flow, while users
    // who already completed it pass straight through and are never sent back.
    // Completion is derived from required profile fields (see isOnboardingComplete),
    // so existing users keep their access with no migration dependency.
    const { data: profile } = await supabase
      .from("profiles")
      .select("grade_level, major_category")
      .eq("id", user.id)
      .maybeSingle();

    if (!isOnboardingComplete(profile)) {
      redirect("/profile");
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <DashboardShell isAdmin={isAdmin(user?.email)}>{children}</DashboardShell>
    </div>
  );
}
