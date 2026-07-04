import { Suspense } from "react";
import { createClient } from "~/lib/supabase/server";
import { getFirstName } from "~/lib/user";
import { AnalysisSection } from "./analysis/analysis-section";
import { AnalysisSkeleton } from "./analysis/analysis-skeleton";
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

      <Suspense fallback={<AnalysisSkeleton />}>
        <AnalysisSection />
      </Suspense>
    </div>
  );
}
