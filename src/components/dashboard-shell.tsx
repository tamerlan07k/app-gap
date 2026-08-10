"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardNav } from "~/components/dashboard-nav";

// Renders the authenticated app shell. Everywhere except My Profile shows the
// main sidebar next to the content. Inside My Profile (/dashboard/profile*) the
// main sidebar is hidden so the profile workspace can present its own internal
// navigation and a back button (see dashboard/profile/layout.tsx).
export function DashboardShell({
  isAdmin,
  children,
}: {
  isAdmin?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const inProfileWorkspace = pathname.startsWith("/dashboard/profile");

  if (inProfileWorkspace) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-10">
      <aside className="shrink-0 md:w-44">
        <DashboardNav isAdmin={isAdmin} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
