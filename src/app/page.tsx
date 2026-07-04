import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { AppGapLogo } from "~/components/logo";
import { Button } from "~/components/ui/button";

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="relative flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center overflow-hidden px-6 py-24 text-center">
      {/* Decorative background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-72 -top-32 h-[520px] w-[520px] rounded-full bg-brand-teal/[0.08] blur-3xl" />
        <div className="absolute -left-72 bottom-0 h-[440px] w-[440px] rounded-full bg-brand-teal/[0.06] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <p className="animate-fade-in text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
          College application clarity
        </p>
        <h1 className="animate-fade-up [animation-delay:0.12s] mt-4 text-5xl font-bold leading-tight tracking-tight sm:text-6xl">
          Know where your
          <br className="hidden sm:block" /> application stands.
        </h1>
        <p className="animate-fade-up [animation-delay:0.24s] mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
          AppGap helps high school students see exactly where their profile is
          strong, where the gaps are, and what to do before applying.
        </p>
        <div className="animate-fade-up [animation-delay:0.36s] mt-8">
          <Button size="lg" asChild>
            <Link href="/dashboard">
              Try AppGap
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── How it works ────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Enter your profile",
    description:
      "Share your GPA, coursework, test scores, and extracurricular activities in one place.",
  },
  {
    number: "02",
    title: "See where you stand",
    description:
      "AppGap maps your profile and surfaces where you're strong and where there are real gaps.",
  },
  {
    number: "03",
    title: "Get a clear plan",
    description:
      "Walk away knowing exactly what to work on — before application season, not during it.",
  },
];

function HowItWorks() {
  return (
    <section className="bg-brand-dark px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-14 scroll-reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
            Step
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
            How it works
          </h2>
          <p className="mt-3 max-w-sm text-base text-white/55">
            Three steps to a clearer picture of your application.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-brand-dark-surface p-7 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Ghost number */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-2 -top-4 select-none font-mono text-[7rem] font-black leading-none text-white/[0.06]"
              >
                {step.number}
              </div>
              {/* Step badge */}
              <div className="mb-5 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand-teal/20">
                <span className="text-xs font-bold text-brand-teal">
                  {step.number}
                </span>
              </div>
              <h3 className="text-base font-semibold text-white">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/55">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── What it helps with ──────────────────────────────────────────────────────

const helpItems = [
  "Identify underdeveloped areas in your academic or extracurricular profile",
  "Spot gaps in course rigor, activity depth, or how you're positioning yourself",
  "Understand how your profile reads before it's too late to change it",
  "Get concrete direction — not vague advice about 'showing passion'",
];

function WhatItHelps() {
  return (
    <section className="bg-card px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 sm:grid-cols-2 sm:gap-20">
          <div className="scroll-reveal space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
              What it helps with
            </p>
            <h2 className="text-3xl font-bold tracking-tight">
              What AppGap helps with
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              AppGap doesn't make promises about admissions outcomes. It gives
              you an honest read on where your current profile actually stands —
              so you can do something about it.
            </p>
          </div>
          <ul className="scroll-reveal space-y-5">
            {helpItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-teal/15">
                  <Check className="size-3 text-brand-teal" strokeWidth={3} />
                </div>
                <span className="text-sm leading-relaxed text-muted-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Who it's for ────────────────────────────────────────────────────────────

const audiences = [
  {
    title: "High school students",
    description:
      "Planning to apply to college and want a realistic sense of where their profile stands right now.",
  },
  {
    title: "Students who aren't sure if they're on track",
    description:
      "Interested in selective schools but unclear whether their current activities and grades tell the right story.",
  },
  {
    title: "Students who want a plan, not anxiety",
    description:
      "Looking for something concrete to work toward — not just a list of everything that could go wrong.",
  },
];

function WhoItsFor() {
  return (
    <section className="bg-muted px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 scroll-reveal">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
            Who it's for
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight">
            Who it's for
          </h2>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {audiences.map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
            >
              <h3 className="font-semibold text-foreground">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ───────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section id="get-started" className="px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <div className="scroll-reveal overflow-hidden rounded-3xl bg-brand-dark px-10 py-14 sm:flex sm:items-center sm:justify-between sm:gap-12">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
              Try it now
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
              Ready to see where you stand?
            </h2>
            <p className="mt-3 text-base text-white/55">
              Takes a few minutes. Free to get started.
            </p>
          </div>
          <div className="mt-8 shrink-0 sm:mt-0">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Try AppGap
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="bg-muted px-6 pb-10 pt-16">
      <div className="mx-auto max-w-5xl space-y-10">
        {/* Brand + disclaimer */}
        <div className="max-w-xl space-y-4">
          <div className="flex items-center gap-2.5">
            <AppGapLogo className="h-7 w-auto" />
            <span className="text-sm font-bold tracking-tight">AppGap</span>
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

        {/* AI disclaimer */}
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Disclaimer: </span>
            AI-generated recommendations are intended for guidance only and
            should not be considered official admissions decisions or
            guarantees.
          </p>
        </div>

        {/* Bottom bar */}
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
      <HowItWorks />
      <WhatItHelps />
      <WhoItsFor />
      <FinalCTA />
      <Footer />
    </main>
  );
}
