import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ApplicationWritingNav } from "~/components/application-writing-nav";
import { Button } from "~/components/ui/button";

// Application Writing workspace shell. The main dashboard sidebar is hidden here
// (see DashboardShell); this layout supplies the section's own internal
// navigation and a back button to the main dashboard — mirroring My Profile.
export default function ApplicationWritingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <Button variant="ghost" size="sm" asChild className="mb-4 -ml-2">
        <Link href="/dashboard">
          <ArrowLeft />
          Back to dashboard
        </Link>
      </Button>

      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Application Writing
        </p>
        <h1 className="mt-0.5 text-xl font-bold tracking-tight">
          Write and sharpen your application
        </h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row md:gap-10">
        <aside className="shrink-0 md:w-52">
          <ApplicationWritingNav />
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
