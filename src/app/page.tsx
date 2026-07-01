import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

// ─── Hero ────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-6 py-24 text-center">
      <div className="mx-auto max-w-3xl space-y-6">
        <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
          College application clarity
        </p>
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Know where your application stands.
        </h1>
        <p className="mx-auto max-w-xl text-xl leading-relaxed text-muted-foreground">
          AppGap helps high school students see exactly where their profile is
          strong, where the gaps are, and what to do before applying.
        </p>
        <div className="pt-2">
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
    <section className="border-t border-border bg-muted px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-muted-foreground">
            Three steps to a clearer picture of your application.
          </p>
        </div>
        <div className="grid gap-10 sm:grid-cols-3">
          {steps.map((step) => (
            <div key={step.number} className="space-y-3">
              <div className="font-mono text-4xl font-bold text-muted-foreground/30">
                {step.number}
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
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
    <section className="border-t border-border px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-12 sm:grid-cols-2 sm:gap-20">
          <div className="space-y-4">
            <h2 className="text-3xl font-bold tracking-tight">
              What AppGap helps with
            </h2>
            <p className="leading-relaxed text-muted-foreground">
              AppGap doesn't make promises about admissions outcomes. It gives
              you an honest read on where your current profile actually stands —
              so you can do something about it.
            </p>
          </div>
          <ul className="space-y-4">
            {helpItems.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check className="mt-0.5 size-4 shrink-0" />
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
    title: "High school juniors and seniors",
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
    <section className="border-t border-border bg-muted px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12">
          <h2 className="text-3xl font-bold tracking-tight">Who it's for</h2>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {audiences.map((item) => (
            <div key={item.title} className="space-y-2">
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
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
    <section
      id="get-started"
      className="border-t border-border px-6 py-24 text-center"
    >
      <div className="mx-auto max-w-xl space-y-6">
        <h2 className="text-3xl font-bold tracking-tight">
          Ready to see where you stand?
        </h2>
        <p className="text-muted-foreground">
          Takes a few minutes. Free to get started.
        </p>
        <Button size="lg" asChild>
          <Link href="/dashboard">
            Try AppGap
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </section>
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
    </main>
  );
}
