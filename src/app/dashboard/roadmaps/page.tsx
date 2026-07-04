import { ArrowRight, MapIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export default function RoadmapsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Roadmaps</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your saved roadmaps will appear here once you generate them.
        </p>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-border py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-teal/10">
          <MapIcon className="size-7 text-brand-teal" />
        </div>
        <div>
          <p className="font-semibold">No roadmaps yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your profile to generate your first personalized roadmap.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/profile">
            Build My Roadmap
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
