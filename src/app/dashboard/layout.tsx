import { DashboardNav } from "~/components/dashboard-nav";
import { isAdmin } from "~/lib/is-admin";
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
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <aside className="shrink-0 md:w-44">
          <DashboardNav isAdmin={isAdmin(user?.email)} />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
