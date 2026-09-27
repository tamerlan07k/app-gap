"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  APPLICATION_WRITING_SECTIONS,
  applicationWritingHref,
} from "~/lib/application-writing-sections";
import { cn } from "~/lib/utils";

// The Application Writing internal navigation — three sub-tabs (Personal
// Statement, Supplemental Essays, Activity & Additional Info). Mirrors ProfileNav
// so the two workspaces feel identical. A sub-tab is active for its own route and
// anything nested under it (e.g. a specific college's essay workspace).
export function ApplicationWritingNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {APPLICATION_WRITING_SECTIONS.map((section) => {
        const href = applicationWritingHref(section.slug);
        // Overview (empty slug) is active only on the exact index route; the
        // other tabs are also active for anything nested under them.
        const isActive =
          section.slug === ""
            ? pathname === href
            : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={section.slug}
            href={href}
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-teal/10 text-brand-teal"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}
