"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Roadmaps", href: "/dashboard/roadmaps" },
  { label: "Feedback", href: "/dashboard/feedback" },
  { label: "Account", href: "/dashboard/account" },
];

export function DashboardNav({ isAdmin }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  const allItems = isAdmin
    ? [...navItems, { label: "Admin", href: "/admin" }]
    : navItems;

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {allItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href ||
              (item.href === "/admin" && pathname.startsWith("/admin"))
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
