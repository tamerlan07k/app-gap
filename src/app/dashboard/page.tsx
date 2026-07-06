import { ArrowRight, MapIcon } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Button } from "~/components/ui/button";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";
import { SavedBanner } from "./saved-banner";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName = user ? getFirstName(user) : "there";

  return (
    <div className="space-y-8">
      <Suspense>
        <SavedBanner />
      </Suspense>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Hi, {firstName}.</h1>
        <p className="mt-1 text-muted-foreground">
          Ready to strengthen your college application?
        </p>
      </div>

      {/* Primary CTA card */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Get started
          </p>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-teal/10">
              <MapIcon className="size-5 text-brand-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-tight">
                Build My Roadmap
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                AppGap will analyze your academic profile, extracurriculars, and
                career direction to generate a personalized set of
                recommendations — so you know exactly where to focus before you
                apply.
              </p>
              <div className="mt-5">
                <Button size="default" asChild>
                  <Link href="/profile">
                    Start My Roadmap
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
