import { redirect } from "next/navigation";
import { AdminNav } from "~/components/admin-nav";
import { isAdmin } from "~/lib/is-admin";
import { createClient } from "~/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    redirect("/dashboard");
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-lg font-semibold">Admin</h1>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {user.email}
        </span>
      </div>
      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <aside className="shrink-0 md:w-44">
          <AdminNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
