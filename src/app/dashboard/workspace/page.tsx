import { ArrowLeft, Compass, Lock } from "lucide-react";
import Link from "next/link";

// Foundation-only Workplace / My Roadmap. This is the future home of actionable
// next steps (the diagnostic explains where the student stands; the Workplace is
// where they act). Locked for now — the analysis-body transition links here.
export default function WorkspacePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Dashboard
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">My Roadmap</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your Workplace — where your analysis turns into action.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-brand-teal/20 bg-brand-teal/[0.04] px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-teal">
            Workplace
          </p>
        </div>
        <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-teal/10">
            <Compass className="size-6 text-brand-teal" />
          </div>
          <div className="max-w-md space-y-1.5">
            <p className="flex items-center justify-center gap-2 text-base font-semibold">
              <Lock className="size-4 text-muted-foreground" />
              Coming soon
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Your Workplace will turn the gaps from your AppGap Analysis into a
              guided set of next steps — find opportunities, track applications,
              and update your profile as you complete them. Your latest analysis
              stays saved in My Analysis in the meantime.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-brand-teal/10 px-3 py-2 text-sm font-medium text-brand-teal transition-colors hover:bg-brand-teal/20"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
