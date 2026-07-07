"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Roadmaps", href: "/dashboard/roadmaps" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Account", href: "/dashboard/account" },
  { label: "Billing", href: "/dashboard/billing" },
];

export function DashboardNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const allItems = isAdmin
    ? [...navItems, { label: "Admin", href: "/admin" }]
    : navItems;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {allItems.map((item) => {
        const isActive =
          pathname === item.href ||
          (item.href === "/admin" && pathname.startsWith("/admin"));
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
