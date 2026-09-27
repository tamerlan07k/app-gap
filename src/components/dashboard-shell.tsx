"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { DashboardNav } from "~/components/dashboard-nav";

// Renders the authenticated app shell. Most sections show the main sidebar next
// to the content. The self-navigating workspaces — My Profile
// (/dashboard/profile*) and Application Writing (/dashboard/application-writing*)
// — hide the main sidebar and present their own internal nav + back button (see
// their respective layout.tsx).
export function DashboardShell({
  isAdmin,
  children,
}: {
  isAdmin?: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const inOwnWorkspace =
    pathname.startsWith("/dashboard/profile") ||
    pathname.startsWith("/dashboard/application-writing");

  if (inOwnWorkspace) {
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
