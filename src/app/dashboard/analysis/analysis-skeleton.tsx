import { Skeleton } from "~/components/ui/skeleton";

function SkeletonCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-6 py-4">
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export function AnalysisSkeleton() {
  return (
    <div className="space-y-6">
      {/* Gap score */}
      <SkeletonCard>
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <Skeleton className="size-32 shrink-0 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-28" />
            <Skeleton className="h-4 w-40" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-3/5" />
            </div>
          </div>
        </div>
      </SkeletonCard>

      {/* 2-column: strengths + gaps */}
      <div className="grid gap-6 lg:grid-cols-2">
        {[0, 1].map((col) => (
          <SkeletonCard key={col}>
            <div className="space-y-5">
              {[0, 1, 2].map((row) => (
                <div key={row} className="flex gap-3">
                  <Skeleton className="mt-0.5 size-4 shrink-0 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </SkeletonCard>
        ))}
      </div>

      {/* Next steps */}
      <SkeletonCard>
        <div className="space-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-52" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/5" />
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>

      {/* Roadmap */}
      <SkeletonCard>
        <div className="space-y-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="size-7 shrink-0 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-3 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SkeletonCard>
    </div>
  );
}
