import {
  ArrowRight,
  Compass,
  Gauge,
  GraduationCap,
  PenLine,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AppWindow } from "~/components/landing/app-window";
import { Faq } from "~/components/landing/faq";
import {
  FeatureRow,
  type FeatureRowProps,
} from "~/components/landing/feature-row";
import { StatsBand } from "~/components/landing/stats-band";
import { AppGapLogo } from "~/components/logo";
import { AnimatedShinyText } from "~/components/ui/animated-shiny-text";
import { Button } from "~/components/ui/button";
import { DotPattern } from "~/components/ui/dot-pattern";
import { FlickeringGrid } from "~/components/ui/flickering-grid";

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-20 sm:pt-28">
      {/* Decorative background: soft teal wash + dots */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-[32rem] bg-gradient-to-b from-brand-teal-wash to-transparent" />
        <DotPattern
          width={22}
          height={22}
          cr={1}
          className="text-brand-teal/20 [mask-image:radial-gradient(ellipse_at_top,white,transparent_60%)]"
        />
        <div className="absolute -right-72 -top-32 h-[520px] w-[520px] rounded-full bg-brand-teal/[0.08] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="animate-fade-in flex justify-center">
          <span className="inline-flex items-center rounded-full border border-brand-teal/20 bg-brand-teal-wash px-4 py-1.5">
            <AnimatedShinyText className="mx-0 max-w-none text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
              College application clarity
            </AnimatedShinyText>
          </span>
        </p>
        <h1 className="animate-fade-up [animation-delay:0.12s] mt-6 font-display text-5xl font-extrabold leading-[1.03] tracking-[-0.035em] sm:text-7xl">
          Know where your
          <br className="hidden sm:block" />{" "}
          <span className="text-brand-teal">application stands.</span>
        </h1>
        <p className="animate-fade-up [animation-delay:0.24s] mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
          AppGap reads your academics, activities, and awards and shows you
          exactly where your profile is strong, where the gaps are, and what to
          do before you apply.
        </p>
        <div className="animate-fade-up [animation-delay:0.36s] mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Try AppGap free
              <ArrowRight />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="#features">See how it works</Link>
          </Button>
        </div>
      </div>

      {/* Hero product preview */}
      <div className="animate-fade-up [animation-delay:0.48s] relative mx-auto mt-16 max-w-5xl">
        <AppWindow
          url="appgap.co/dashboard"
          label="Your AppGap dashboard"
          icon={Gauge}
          media={{
            src: "/landing/dashboard-v3.png",
            kind: "image",
            width: 1336,
            height: 901,
          }}
        />
      </div>
    </section>
  );
}

// ─── Features ────────────────────────────────────────────────────────────────

const features: FeatureRowProps[] = [
  {
    eyebrow: "AppGap Score",
    title: (
      <>
        See exactly where
        <br /> your profile stands
      </>
    ),
    description:
      "AppGap scores your academics, activities, and awards across six categories — so you know what's strong and what's holding you back.",
    bullets: [
      "A clear overall gap score, broken down by category",
      "Honest, specific feedback — not 'show more passion'",
      "Updates as your profile grows",
    ],
    cta: { label: "Get my score", href: "/dashboard" },
    icon: Gauge,
    url: "appgap.co/dashboard",
    media: {
      src: "/landing/appgap-score-v3.png",
      kind: "image",
      width: 1388,
      height: 861,
    },
  },
  {
    eyebrow: "My Colleges",
    title: (
      <>
        Your real chances,
        <br /> school by school
      </>
    ),
    description:
      "Build your college list and see honest admission chances based on your actual profile — not inflated guesses.",
    bullets: [
      "1,500+ colleges with real admissions data",
      "Holistic chancing with an honest range",
      "Field-fit and application plans per school",
    ],
    cta: { label: "Explore colleges", href: "/dashboard/colleges" },
    icon: GraduationCap,
    url: "appgap.co/dashboard/colleges",
    media: {
      src: "/landing/my-colleges-v3.png",
      kind: "image",
      width: 1347,
      height: 897,
    },
    reverse: true,
  },
  {
    eyebrow: "Application Writing",
    title: (
      <>
        Make every
        <br /> activity count
      </>
    ),
    description:
      "AppGap scores your activity descriptions and additional-info section and shows you how to sharpen them line by line.",
    bullets: [
      "Each activity scored on verb, specificity, and impact",
      "Polish, rewrite, and template modes",
      "Guidance built on the current Common App",
    ],
    cta: {
      label: "Sharpen my writing",
      href: "/dashboard/application-writing",
    },
    icon: PenLine,
    url: "appgap.co/dashboard/application-writing",
    media: {
      src: "/landing/application-writing-v3.png",
      kind: "image",
      width: 900,
      height: 560,
    },
  },
  {
    eyebrow: "Personal Statement",
    title: (
      <>
        Essays that
        <br /> actually land
      </>
    ),
    description:
      "Draft, clone, and refine your personal statement and supplemental essays with line-by-line AI coaching toward a stronger story.",
    bullets: [
      "Line-by-line feedback and grading",
      "Per-college supplemental workspaces",
      "Finalize a clean snapshot when you're ready",
    ],
    cta: {
      label: "Start an essay",
      href: "/dashboard/application-writing/personal-statement",
    },
    icon: Sparkles,
    url: "appgap.co/dashboard/application-writing/personal-statement",
    media: {
      src: "/landing/personal-statement-v3.png",
      kind: "image",
      width: 956,
      height: 793,
    },
    reverse: true,
  },
  {
    eyebrow: "My Roadmap",
    title: (
      <>
        A plan built around
        <br /> your timeline
      </>
    ),
    description:
      "Turn your gaps into a personalized, step-by-step plan that fits your grade level and your target test and application dates.",
    bullets: [
      "Personalized milestones across four tracks",
      "Tuned to your grade and deadlines",
      "Concrete next steps, not vague advice",
    ],
    cta: { label: "Build my roadmap", href: "/dashboard/workspace" },
    icon: Compass,
    url: "appgap.co/dashboard/workspace",
    media: {
      src: "/landing/my-roadmap-v3.png",
      kind: "image",
      width: 1300,
      height: 880,
    },
  },
];

function Features() {
  return (
    <section id="features" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-20 max-w-2xl scroll-reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
            Everything you need
          </p>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
            Everything you need to understand your application
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            One place to see where you stand, where you can get in, and what to
            work on next.
          </p>
        </div>

        <div className="space-y-24 sm:space-y-32">
          {features.map((feature) => (
            <FeatureRow key={feature.eyebrow} {...feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section id="get-started" className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="scroll-reveal relative overflow-hidden rounded-3xl bg-brand-dark px-8 py-16 text-center sm:px-16 sm:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_80%)]"
          >
            <DotPattern
              width={20}
              height={20}
              cr={1}
              className="text-white/[0.07]"
            />
          </div>
          <div className="relative">
            <h2 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
              Ready to see where you stand?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-lg text-white/60">
              Takes a few minutes. Free to get started.
            </p>
            <div className="mt-9">
              <Button size="lg" asChild>
                <Link href="/dashboard">
                  Try AppGap free
                  <ArrowRight />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-muted px-6 pb-10 pt-16">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_90%)]"
      >
        <FlickeringGrid
          className="h-full w-full"
          squareSize={4}
          gridGap={5}
          flickerChance={0.35}
          maxOpacity={0.45}
          color="rgb(20, 139, 148)"
        />
      </div>

      {/* Legibility scrim: veils the animation just enough for text to read
          cleanly, without altering the grid itself. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-muted/75"
      />

      <div className="relative mx-auto max-w-5xl space-y-10">
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <AppGapLogo className="h-7 w-auto" />
            <span className="font-display text-sm font-extrabold tracking-tight">
              AppGap
            </span>
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Student-Led Project
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            AppGap is an independent student-led project created to help
            students navigate the college admissions process. While we strive to
            provide helpful guidance and AI-powered recommendations, AppGap is
            not a substitute for a professional college counselor or official
            admissions advice. Students should always verify important
            information directly with colleges and scholarship providers.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Disclaimer: </span>
            AI-generated recommendations are intended for guidance only and
            should not be considered official admissions decisions or
            guarantees.
          </p>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border pt-8 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © 2026 AppGap. All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Terms of Service
            </Link>
            <Link
              href="/partners"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Partners
            </Link>
            <Link
              href="/contact"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <StatsBand />
      <Faq />
      <FinalCTA />
      <Footer />
    </main>
  );
}
