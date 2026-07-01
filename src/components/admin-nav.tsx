"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "~/lib/utils";

const navItems = [
  { label: "Users", href: "/admin" },
  { label: "Feedback", href: "/admin/feedback" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === item.href
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
