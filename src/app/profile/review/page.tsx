import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function ReviewPage() {
  return (
    <main className="px-6 py-16">
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
            Step 4 of 4
          </p>
          <h1 className="text-3xl font-bold tracking-tight">
            Review &amp; generate
          </h1>
          <p className="leading-relaxed text-muted-foreground">
            This is where AppGap will show your complete profile summary and
            generate personalized insights and recommendations. Coming soon.
          </p>
        </div>

        <div className="flex items-center justify-center rounded-xl border border-dashed border-border py-20 text-center">
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" asChild>
            <Link href="/profile/activities">
              <ArrowLeft />
              Back
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
