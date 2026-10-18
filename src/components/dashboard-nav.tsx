"use client";

import {
  CalendarDays,
  Compass,
  Gauge,
  GraduationCap,
  Home,
  type LucideIcon,
  PenLine,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { cn } from "~/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** When set, the item is also active for any route nested under this prefix. */
  activePrefix?: string;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

// Grouped navigation. Account-type items (Account, Billing, Feedback, Admin)
// now live in the top-bar user menu (see UserMenu), not here. Routes are
// unchanged; "My Analysis" is surfaced as "Gap Analysis" and "Dashboard" as
// "Home".
const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Home", href: "/dashboard", icon: Home },
      {
        label: "My Profile",
        href: "/dashboard/profile",
        icon: User,
        activePrefix: "/dashboard/profile",
      },
      {
        label: "Gap Analysis",
        href: "/dashboard/roadmaps",
        icon: Gauge,
        activePrefix: "/dashboard/roadmap",
      },
    ],
  },
  {
    label: "Application",
    items: [
      {
        label: "My Colleges",
        href: "/dashboard/colleges",
        icon: GraduationCap,
        activePrefix: "/dashboard/colleges",
      },
      {
        label: "Application Writing",
        href: "/dashboard/application-writing",
        icon: PenLine,
        activePrefix: "/dashboard/application-writing",
      },
    ],
  },
  {
    label: "Planning",
    items: [
      {
        label: "My Roadmap",
        href: "/dashboard/workspace",
        icon: Compass,
        activePrefix: "/dashboard/workspace",
      },
      {
        label: "Calendar",
        href: "/dashboard/calendar",
        icon: CalendarDays,
        activePrefix: "/dashboard/calendar",
      },
    ],
  },
];

export function DashboardNav({ isAdmin }: { isAdmin?: boolean }) {
  // `isAdmin` is accepted for API compatibility; the Admin link now lives in the
  // top-bar user menu.
  void isAdmin;
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:gap-0.5 md:overflow-x-visible md:pb-0">
      {navGroups.map((group) => (
        <Fragment key={group.label}>
          <p className="mt-5 mb-1 hidden px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground first:mt-0 md:block">
            {group.label}
          </p>
          {group.items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.activePrefix != null &&
                (pathname === item.activePrefix ||
                  pathname.startsWith(`${item.activePrefix}/`)));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-teal/10 text-brand-teal"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </Fragment>
      ))}
    </nav>
  );
}
