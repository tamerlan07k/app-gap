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
      <div className="mb-8 flex items-center gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Admin Console
          </p>
          <h1 className="mt-0.5 text-xl font-bold tracking-tight">
            AppGap Admin
          </h1>
        </div>
        <span className="ml-auto rounded-full bg-brand-dark px-3 py-1 text-xs font-medium text-white/80">
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
