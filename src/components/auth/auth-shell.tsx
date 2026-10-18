import { AppGapLogo } from "~/components/logo";
import { DotPattern } from "~/components/ui/dot-pattern";
import { AppGapMascot } from "./app-gap-mascot";

type AuthShellProps = {
  /** Two-tone tagline for the brand panel (wrap the accent word in a span). */
  tagline: React.ReactNode;
  /** One supporting line under the tagline. */
  subline: string;
  /** The form column. */
  children: React.ReactNode;
};

/**
 * Split-panel auth layout: a teal brand panel on the left (lg+) and the form on
 * the right — mirrors polyprep.co's sign-in screen in AppGap's palette.
 */
export function AuthShell({ tagline, subline, children }: AuthShellProps) {
  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl border border-border/70 bg-card shadow-xl lg:grid-cols-2">
        {/* Brand panel */}
        <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-teal-wash p-10 lg:flex">
          <DotPattern
            width={20}
            height={20}
            cr={1}
            className="text-brand-teal/15 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_70%)]"
          />
          <div className="relative flex items-center gap-2.5">
            <AppGapLogo className="h-7 w-auto" />
            <span className="font-display text-base font-extrabold tracking-tight">
              AppGap
            </span>
          </div>

          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em]">
              {tagline}
            </h2>
            <p className="mt-4 max-w-xs text-base leading-relaxed text-muted-foreground">
              {subline}
            </p>
          </div>

          <div className="relative flex items-end justify-center">
            <AppGapMascot className="h-32 w-auto animate-mascot-sway drop-shadow-sm" />
          </div>
        </div>

        {/* Form panel */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          {/* Mobile brand mark (brand panel is hidden below lg) */}
          <div className="mb-8 flex items-center justify-center gap-2.5 lg:hidden">
            <AppGapLogo className="h-8 w-auto" />
            <span className="font-display text-base font-extrabold tracking-tight">
              AppGap
            </span>
          </div>
          {children}
        </div>
      </div>
    </main>
  );
}
