"use client";

import { Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PROFILE_SECTIONS, profileSectionHref } from "~/lib/profile-sections";
import { cn } from "~/lib/utils";

// The My Profile internal navigation, shown in place of the main sidebar while
// inside the profile workspace. Mirrors the DashboardNav / AdminNav pill pattern.
export function ProfileNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-x-visible md:pb-0">
      {PROFILE_SECTIONS.map((section) => {
        const href = profileSectionHref(section.slug);
        const isActive = pathname === href;
        return (
          <Link
            key={section.slug || "overview"}
            href={href}
            className={cn(
              "flex items-center justify-between gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-brand-teal/10 text-brand-teal"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <span>{section.label}</span>
            {section.locked && (
              <Lock className="size-3 shrink-0 opacity-60" aria-hidden={true} />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
