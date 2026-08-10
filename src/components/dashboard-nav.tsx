"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

type NavItem = {
  label: string;
  href: string;
  /** When set, the item is also active for any route nested under this prefix. */
  activePrefix?: string;
};

// Note: "My Analysis" points at the saved-analysis list (opening a snapshot never
// regenerates); "My Roadmap" is the Workplace foundation. Account/Billing/Feedback
// keep their existing routes and behavior.
const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "My Analysis",
    href: "/dashboard/roadmaps",
    activePrefix: "/dashboard/roadmap",
  },
  {
    label: "My Profile",
    href: "/dashboard/profile",
    activePrefix: "/dashboard/profile",
  },
  {
    label: "My Roadmap",
    href: "/dashboard/workspace",
    activePrefix: "/dashboard/workspace",
  },
  {
    label: "My Account",
    href: "/dashboard/account",
    activePrefix: "/dashboard/account",
  },
  {
    label: "Billing",
    href: "/dashboard/billing",
    activePrefix: "/dashboard/billing",
  },
  {
    label: "Feedback",
    href: "/dashboard/feedback",
    activePrefix: "/dashboard/feedback",
  },
];

const adminItem: NavItem = {
  label: "Admin",
  href: "/admin",
  activePrefix: "/admin",
};

export function DashboardNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const allItems = isAdmin ? [...navItems, adminItem] : navItems;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {allItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.activePrefix != null &&
            (pathname === item.activePrefix ||
              pathname.startsWith(`${item.activePrefix}/`)));
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-teal/10 text-brand-teal"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
