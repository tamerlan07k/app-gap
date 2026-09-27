import { ArrowRight, Lock, Sparkles } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

// Free-tier gate for the Supplemental Essays workspace. Mirrors the Personal
// Statement upsell.
export function ProUpsell() {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
          Supplemental Essays
        </p>
      </div>
      <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-teal/10">
          <Lock className="size-6 text-brand-teal" aria-hidden={true} />
        </div>
        <div className="max-w-md space-y-1.5">
          <p className="text-base font-semibold">A Pro feature</p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            The Supplemental Essays workspace — per-college prompts, an
            evidence-based evaluation, and an AppGap coach that checks whether
            you actually answered the prompt — is part of AppGap Pro.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/billing">
            <Sparkles />
            Upgrade to Pro
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
