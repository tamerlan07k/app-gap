import { DashboardNav } from "~/components/dashboard-nav";
import { isAdmin } from "~/lib/is-admin";
import { createClient } from "~/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
