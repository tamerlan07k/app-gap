import { Lock } from "lucide-react";

// Shared locked / coming-soon placeholder for scaffolded My Profile sections.
export function LockedSection({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          {title}
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-muted">
          <Lock className="size-6 text-muted-foreground" aria-hidden={true} />
        </div>
        <div className="max-w-md space-y-1.5">
          <p className="text-base font-semibold">Coming soon</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
