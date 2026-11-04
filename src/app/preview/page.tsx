"use client";

import {
  ArrowRight,
  BadgeCheck,
  Check,
  Gauge,
  Sparkles,
  X,
} from "lucide-react";
import { Caveat } from "next/font/google";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AppGapMascot } from "~/components/auth/app-gap-mascot";
import { AppWindow } from "~/components/landing/app-window";
import { AppGapLogo } from "~/components/logo";
import { Button } from "~/components/ui/button";
import { cn } from "~/lib/utils";

// Handwritten accent face — annotations only (circled date, scattered notes).
const caveat = Caveat({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hand",
});
const hand = { fontFamily: "var(--font-hand)" } as const;

// ─── Reveal-on-scroll: one observer toggles `.is-in` on every [data-io] node ──

function useScrollReveal() {
  useEffect(() => {
    // Gate the hidden state on JS being present (no-JS stays fully visible).
    document.documentElement.classList.add("io-ready");
    const nodes = Array.from(
      document.querySelectorAll<HTMLElement>("[data-io]"),
    );
    const reveal = (el: Element) => el.classList.add("is-in");

    if (!("IntersectionObserver" in window)) {
      for (const n of nodes) reveal(n);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            reveal(e.target);
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -6% 0px" },
    );
    for (const n of nodes) io.observe(n);

    // Safety net: if the observer never fires (e.g. a backgrounded tab), don't
    // leave content hidden — if nothing has revealed shortly after mount,
    // reveal everything.
    const t = window.setTimeout(() => {
      if (!nodes.some((n) => n.classList.contains("is-in"))) {
        for (const n of nodes) reveal(n);
      }
    }, 1600);

    return () => {
      io.disconnect();
      window.clearTimeout(t);
    };
  }, []);
}

// ─── Paper backdrop: faint ruled lines + a teal margin rule ───────────────────

function Paper({ fade = true }: { fade?: boolean }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div
        className="absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent, transparent 31px, var(--color-border) 31px, var(--color-border) 32px)",
          maskImage: fade
            ? "radial-gradient(ellipse at 50% 30%, black 45%, transparent 85%)"
            : undefined,
        }}
      />
      <div className="absolute inset-y-0 left-10 w-px bg-brand-teal/25 sm:left-16" />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

const heroList = [
  { name: "Stanford", date: "Nov 1", round: "REA" },
  { name: "Rice", date: "Nov 1", round: "ED", highlight: true },
  { name: "Georgia Tech", date: "Oct 15", round: "EA" },
  { name: "NYU", date: "Jan 5", round: "RD" },
];

function RoughCircle({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 96 48"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M70 10 C52 2 24 2 12 12 C2 20 4 34 20 40 C40 47 74 46 86 34 C94 25 90 14 72 9"
        stroke="var(--color-brand-teal)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
      <Paper />
      <div className="absolute -right-72 -top-40 h-[560px] w-[560px] rounded-full bg-brand-teal/[0.07] blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-teal/25 bg-brand-teal-wash px-3.5 py-1.5 text-xs font-semibold text-brand-teal">
            <BadgeCheck className="size-4" />
            Honest odds, not inflated ones
          </span>

          <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.02] tracking-[-0.035em] text-foreground sm:text-6xl">
            College admissions,
            <br />
            finally <span className="text-brand-teal">clear.</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
            Private counselors charge families thousands for the playbook that
            gets students in. AppGap reads your academics, activities, and
            essays and shows you exactly where you stand — and what to fix
            before you apply.
          </p>

          <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Get started
                <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="#how">See how it works</Link>
            </Button>
          </div>
        </div>

        {/* coach + list cards */}
        <div className="relative">
          <div className="absolute -top-8 right-4 z-10 hidden items-center gap-1 sm:flex">
            <span className="text-xl text-brand-teal" style={hand}>
              drag to reorder
            </span>
            <svg
              viewBox="0 0 40 40"
              className="h-9 w-9 text-brand-teal"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 6 C20 10 30 18 30 32"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <path
                d="M22 30 L30 34 L33 25"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="relative z-10 max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl shadow-brand-dark/5 sm:ml-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-brand-teal" />
              Your AppGap coach
            </div>
            <div className="mt-3 flex items-start gap-3">
              <AppGapMascot className="size-14 shrink-0 animate-mascot-sway" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Hi! I read your whole profile, spot the gaps, and tell you
                exactly what to fix — essays, list, activities, test prep —
                before you apply.
              </p>
            </div>
          </div>

          <div className="relative z-0 ml-auto mt-4 max-w-xs rounded-2xl border border-border bg-card p-5 shadow-xl shadow-brand-dark/5 sm:-mt-2 sm:mr-2">
            <p className="font-display text-base font-extrabold tracking-tight text-foreground">
              Your list
            </p>
            <ul className="mt-3 space-y-3">
              {heroList.map((c) => (
                <li
                  key={c.name}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="font-medium text-foreground">{c.name}</span>
                  <span className="flex items-center gap-2.5">
                    <span className="relative font-medium text-muted-foreground">
                      {c.date}
                      {c.highlight && (
                        <RoughCircle className="absolute -inset-x-3 -inset-y-2 h-[calc(100%+16px)] w-[calc(100%+24px)]" />
                      )}
                    </span>
                    <span className="w-9 text-right text-[11px] font-semibold uppercase tracking-wide text-brand-teal">
                      {c.round}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Moving college-logo marquee ──────────────────────────────────────────────

const colleges = [
  "Stanford",
  "MIT",
  "Harvard",
  "Yale",
  "Princeton",
  "Columbia",
  "Brown",
  "Cornell",
  "Duke",
  "UChicago",
  "UPenn",
  "Johns Hopkins",
  "Northwestern",
  "Michigan",
  "UCLA",
  "Berkeley",
  "Rice",
  "Carnegie Mellon",
];

function initials(name: string) {
  const skip = new Set(["of", "the"]);
  const w = name.split(/[\s]+/).filter((x) => !skip.has(x.toLowerCase()));
  if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
  return (w[0][0] + w[1][0]).toUpperCase();
}

function CollegeChip({ name }: { name: string }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5 rounded-full border border-border/70 bg-card/70 px-4 py-2">
      <span className="flex size-7 items-center justify-center rounded-full bg-brand-dark font-display text-[11px] font-extrabold text-white">
        {initials(name)}
      </span>
      <span className="whitespace-nowrap text-sm font-semibold text-muted-foreground">
        {name}
      </span>
    </span>
  );
}

function LogoMarquee() {
  return (
    <section className="relative overflow-hidden border-y border-border/60 bg-muted/30 py-8">
      <p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        Where AppGap students are headed
      </p>
      <div
        className="relative flex w-full overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        }}
      >
        <div className="animate-marquee flex w-max shrink-0 gap-3 pr-3">
          {colleges.map((c) => (
            <CollegeChip key={c} name={c} />
          ))}
        </div>
        <div
          aria-hidden="true"
          className="animate-marquee flex w-max shrink-0 gap-3 pr-3"
        >
          {colleges.map((c) => (
            <CollegeChip key={`${c}-dup`} name={c} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Section heading helper ───────────────────────────────────────────────────

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-teal">
      {children}
    </p>
  );
}

// ─── Product showcase: dashboard ──────────────────────────────────────────────

function Showcase() {
  return (
    <section id="how" className="relative overflow-hidden px-6 py-24">
      <Paper />
      <div className="relative mx-auto max-w-5xl text-center">
        <div data-io className="io-reveal">
          <Eyebrow>Everything in one place</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] text-foreground sm:text-5xl">
            Everything your application needs
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Your score, your list, your essays, your plan — read together, by a
            coach that knows your whole file.
          </p>
        </div>

        <div className="relative mt-14">
          <div data-io className="io-reveal delay-1">
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
              className="mx-auto max-w-4xl"
            />
          </div>

          {/* floating UI chips */}
          <span
            data-io
            className="io-chip absolute -left-2 top-16 hidden rounded-xl border border-brand-teal/30 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-lg sm:block"
            style={{
              ["--chip-rot" as string]: "-5deg",
              ["--chip-delay" as string]: "0.1s",
            }}
          >
            AppGap Score · 72
          </span>
          <span
            data-io
            className="io-chip absolute -right-3 top-28 hidden rounded-xl border border-amber-500/30 bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-lg sm:block"
            style={{
              ["--chip-rot" as string]: "4deg",
              ["--chip-delay" as string]: "0.2s",
            }}
          >
            Michigan · Target · 46%
          </span>
          <span
            data-io
            className="io-chip absolute -bottom-3 left-10 hidden rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground shadow-lg sm:block"
            style={{
              ["--chip-rot" as string]: "3deg",
              ["--chip-delay" as string]: "0.3s",
            }}
          >
            Essay: 148 / 150 ✓
          </span>
        </div>
      </div>
    </section>
  );
}

// ─── Coach row ────────────────────────────────────────────────────────────────

function CoachRow() {
  return (
    <section className="relative overflow-hidden bg-muted/40 px-6 py-24">
      <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-2">
        <div data-io className="io-reveal order-2 lg:order-1">
          <AppWindow
            url="appgap.co/dashboard"
            label="AppGap Score"
            icon={Gauge}
            media={{
              src: "/landing/appgap-score-v3.png",
              kind: "image",
              width: 1388,
              height: 861,
            }}
          />
        </div>
        <div data-io className="io-reveal delay-1 order-1 lg:order-2">
          <Eyebrow>Your coach</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-extrabold tracking-[-0.03em] text-foreground sm:text-5xl">
            Ask your coach,
            <br /> and it&rsquo;s done
          </h2>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-muted-foreground">
            Ask anything, any time. Your coach knows your whole application and
            works beside you — scoring your profile, shaping your activities,
            and reviewing every draft.
          </p>
          <div className="mt-6 flex items-center gap-3">
            <AppGapMascot className="size-12 animate-mascot-sway" />
            <p className="text-sm font-medium text-foreground">
              &ldquo;Move Northwestern to RD and check my odds there.&rdquo;
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Founder (painted portrait) ───────────────────────────────────────────────

function Founder() {
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <Paper fade={false} />
      <div className="relative mx-auto grid max-w-5xl items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div data-io className="io-reveal">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Hi — I built AppGap.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Before you sign up, here&rsquo;s what I wish every student knew: the
            playbook that gets people into great schools isn&rsquo;t a secret —
            it&rsquo;s just expensive. I taught AppGap everything a $12,000
            counselor taught me, so every student gets it, not just the ones who
            can pay.
          </p>
        </div>

        {/* Painted portrait */}
        <div
          data-io
          className="io-reveal delay-1 relative mx-auto w-full max-w-sm"
        >
          <svg className="absolute h-0 w-0" aria-hidden="true">
            <title>paint filter</title>
            {/* Illustrated / gouache look: smooth the photo, warm it, then
                quantize into many soft levels (few harsh bands → no false color). */}
            <filter id="paint" colorInterpolationFilters="sRGB">
              <feGaussianBlur stdDeviation="1.6" result="soft" />
              <feColorMatrix
                in="soft"
                type="saturate"
                values="1.35"
                result="warm"
              />
              <feComponentTransfer in="warm">
                <feFuncR
                  type="discrete"
                  tableValues="0.04 .16 .28 .4 .52 .64 .76 .88 1"
                />
                <feFuncG
                  type="discrete"
                  tableValues="0.04 .16 .28 .4 .52 .64 .76 .88 1"
                />
                <feFuncB
                  type="discrete"
                  tableValues="0.04 .16 .28 .4 .52 .64 .76 .88 1"
                />
              </feComponentTransfer>
            </filter>
          </svg>

          <div className="relative aspect-square">
            {/* hand-drawn brand ring */}
            <svg
              viewBox="0 0 200 200"
              className="absolute inset-0 h-full w-full"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M100 8 C150 6 196 44 193 100 C190 156 150 194 100 192 C48 190 8 150 10 98 C12 46 52 10 100 8 Z"
                stroke="var(--color-brand-teal)"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-[6%] overflow-hidden rounded-full bg-brand-teal-wash ring-1 ring-brand-teal/20">
              <Image
                src="/landing/founder.jpg"
                alt="AppGap founder"
                width={640}
                height={640}
                className="h-full w-full origin-center scale-[1.5] object-cover object-[50%_30%]"
                style={{
                  filter: "url(#paint) brightness(1.08) contrast(1.02)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Floating chips mascot (why I built it) ──────────────────────────────────

type Chip = {
  label: string;
  x: string;
  y: string;
  rot: string;
  accent?: boolean;
};

const whyChips: Chip[] = [
  { label: "Predicted SAT 1450 ↑", x: "3%", y: "60%", rot: "2deg" },
  { label: "Impact 8 · Passion 9", x: "7%", y: "72%", rot: "-4deg" },
  {
    label: "Red flag: “I've always been passionate…”",
    x: "4%",
    y: "86%",
    rot: "-3deg",
  },
  {
    label: "Michigan EA · due Nov 1",
    x: "24%",
    y: "90%",
    rot: "3deg",
    accent: true,
  },
  { label: "Northwestern · Reach · 18%", x: "40%", y: "82%", rot: "-2deg" },
  { label: "148 / 150 characters ✓", x: "52%", y: "92%", rot: "2deg" },
  {
    label: "Hook: the first bike you fixed",
    x: "60%",
    y: "84%",
    rot: "-3deg",
    accent: true,
  },
  { label: "Led 6-person team; 2nd of 40", x: "62%", y: "16%", rot: "2deg" },
  { label: "AP Bio · Cell structure ✓", x: "56%", y: "30%", rot: "-2deg" },
  { label: "Practice test 7 · 1420", x: "76%", y: "22%", rot: "3deg" },
  { label: "UW–Madison · Safety · 81%", x: "82%", y: "44%", rot: "-3deg" },
  { label: "Outline: 3 beats", x: "84%", y: "62%", rot: "2deg" },
  { label: "Narrative check ✓", x: "74%", y: "74%", rot: "-2deg" },
];

function FloatingChips({ chips }: { chips: Chip[] }) {
  return (
    <>
      {chips.map((c, i) => (
        <span
          key={c.label}
          data-io
          className={cn(
            "io-chip absolute hidden -translate-x-1/2 whitespace-nowrap rounded-xl border bg-card px-3 py-2 text-xs font-semibold shadow-lg md:block",
            c.accent
              ? "border-brand-teal/40 text-foreground"
              : "border-border/70 text-muted-foreground",
          )}
          style={{
            left: c.x,
            top: c.y,
            ["--chip-rot" as string]: c.rot,
            ["--chip-delay" as string]: `${0.05 * i}s`,
          }}
        >
          {c.label}
        </span>
      ))}
    </>
  );
}

function WhyBuilt() {
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <Paper />
      <div className="relative mx-auto min-h-[520px] max-w-6xl">
        <div data-io className="io-reveal relative z-10 max-w-xl">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            That&rsquo;s why I built AppGap.
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Every student deserves the read a great counselor gives — honest
            scores, a real college list, and feedback that actually changes the
            draft.
          </p>
        </div>

        <FloatingChips chips={whyChips} />

        <AppGapMascot className="absolute left-1/2 top-1/2 size-28 -translate-x-1/2 -translate-y-1/4 animate-mascot-sway" />
      </div>
    </section>
  );
}

// ─── Story-not-application (connected notes) ─────────────────────────────────

function StoryNotes() {
  return (
    <section className="relative overflow-hidden bg-muted/40 px-6 py-28">
      <div className="relative mx-auto min-h-[520px] max-w-6xl">
        <div data-io className="io-reveal max-w-xl">
          <Eyebrow>One person they&rsquo;d fight for</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            Build your story,
            <br /> not just your application
          </h2>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted-foreground">
            Read your file the way an admissions officer will. Then make every
            activity, essay, and award point to one person they&rsquo;d fight
            for.
          </p>
        </div>

        {/* connected note cards */}
        <div className="pointer-events-none absolute inset-0 hidden md:block">
          <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
            <title>connector</title>
            <line
              x1="22%"
              y1="74%"
              x2="40%"
              y2="64%"
              stroke="var(--color-brand-teal)"
              strokeWidth="2"
            />
          </svg>
          <NoteCard
            x="8%"
            y="70%"
            accent
            text="Led a 6-person robotics team to 2nd of 40 at regionals"
            delay={0}
          />
          <NoteCard
            x="34%"
            y="58%"
            accent
            text="3D-printed 14 hands for kids at a children's hospital"
            delay={0.12}
          />
          <NoteCard
            x="56%"
            y="66%"
            text="Essay: my grandpa's missing hand"
            delay={0.24}
          />
          <NoteCard
            x="76%"
            y="56%"
            text="Why Michigan: its prosthetics lab"
            delay={0.36}
          />
        </div>
      </div>
    </section>
  );
}

function NoteCard({
  x,
  y,
  text,
  accent,
  delay,
}: {
  x: string;
  y: string;
  text: string;
  accent?: boolean;
  delay: number;
}) {
  return (
    <span
      data-io
      className={cn(
        "io-chip absolute block max-w-[13rem] rounded-xl border bg-card px-3.5 py-3 text-sm font-medium shadow-lg",
        accent
          ? "border-brand-teal/50 text-foreground"
          : "border-border/70 text-muted-foreground",
      )}
      style={{ left: x, top: y, ["--chip-delay" as string]: `${delay}s` }}
    >
      {text}
    </span>
  );
}

// ─── Hours spent like this (X list + scatter) ────────────────────────────────

const hourChips: Chip[] = [
  { label: "Robotics club", x: "60%", y: "32%", rot: "-3deg" },
  { label: "Volunteers at a hospital", x: "82%", y: "22%", rot: "2deg" },
  { label: "Key Club", x: "90%", y: "44%", rot: "-2deg" },
  { label: "Model UN", x: "54%", y: "54%", rot: "3deg" },
  { label: "Essay: what soccer taught me", x: "70%", y: "60%", rot: "-2deg" },
  { label: "Why Michigan: beautiful campus", x: "84%", y: "72%", rot: "3deg" },
  { label: "SAT 1480 (third try)", x: "20%", y: "74%", rot: "-3deg" },
  { label: "4.0 GPA", x: "44%", y: "80%", rot: "2deg" },
  { label: "National Honor Society", x: "6%", y: "88%", rot: "-2deg" },
  { label: "Volunteered 40 hours", x: "74%", y: "90%", rot: "2deg" },
];

function HoursSpent() {
  const items = [
    "Chasing one more point on the SAT.",
    "Joining clubs that don't connect.",
    "Writing essays anyone could have written.",
  ];
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <Paper />
      <div className="relative mx-auto min-h-[520px] max-w-6xl">
        <div data-io className="io-reveal max-w-xl">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            So most students spend
            <br /> their hours like this:
          </h2>
          <ul className="mt-6 space-y-3">
            {items.map((t) => (
              <li
                key={t}
                className="flex items-center gap-3 text-lg text-foreground"
              >
                <X className="size-5 shrink-0 text-brand-teal" />
                {t}
              </li>
            ))}
          </ul>
        </div>
        <FloatingChips chips={hourChips} />
      </div>
    </section>
  );
}

// ─── Layered bands: sticky scrollytelling (two headings cross-fade) ──────────

const bands = [
  {
    label: "Story",
    sub1: "About three months of essays, senior fall",
    sub2: "How it all adds up to one person",
    color: "var(--color-brand-teal)",
    bg: "oklch(0.93 0.05 200)",
  },
  {
    label: "Impact",
    sub1: "Four years of clubs, sports, and awards",
    sub2: "What you've won, built, and led",
    color: "oklch(0.55 0.13 70)",
    bg: "oklch(0.9 0.06 75)",
  },
  {
    label: "Numbers",
    sub1: "Four years of classes and tests",
    sub2: "GPA and test scores",
    color: "var(--color-brand-dark)",
    bg: "oklch(0.88 0.03 240)",
  },
];

function LayeredBands() {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      setPhase(p > 0.5 ? 1 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <section ref={ref} className="relative h-[220vh]">
      <div className="sticky top-0 flex h-screen flex-col justify-center overflow-hidden">
        <div className="relative mx-auto w-full max-w-5xl px-6">
          <div className="relative h-[7.5rem]">
            <h2
              className="absolute inset-0 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground transition-opacity duration-500 sm:text-5xl"
              style={{ opacity: phase === 0 ? 1 : 0 }}
            >
              All three matter equally.
              <br /> They don&rsquo;t get equal time.
            </h2>
            <h2
              className="absolute inset-0 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground transition-opacity duration-500 sm:text-5xl"
              style={{ opacity: phase === 1 ? 1 : 0 }}
            >
              Every application
              <br /> has three layers.
            </h2>
          </div>
        </div>

        <div className="mt-10 flex flex-col">
          {bands.map((b, i) => (
            <div
              key={b.label}
              className="relative px-6 py-8 transition-all duration-500"
              style={{
                background: b.bg,
                marginTop: i === 0 ? 0 : "-1px",
              }}
            >
              {/* wavy top edge */}
              {i > 0 && (
                <svg
                  className="absolute -top-3 left-0 h-4 w-full"
                  viewBox="0 0 1200 24"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M0 24 Q150 4 300 14 T600 14 T900 14 T1200 14 V24 Z"
                    fill={b.bg}
                  />
                </svg>
              )}
              <div className="mx-auto max-w-5xl">
                <p
                  className="font-display text-2xl font-extrabold tracking-tight"
                  style={{ color: b.color }}
                >
                  {b.label}
                </p>
                <p
                  className="mt-1 text-sm font-medium"
                  style={{ color: b.color, opacity: 0.85 }}
                >
                  {phase === 0 ? b.sub1 : b.sub2}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Document grid fill (two beats) ──────────────────────────────────────────

function DocTile({ muted }: { muted?: boolean }) {
  return (
    <div className="relative">
      <div className="aspect-[3/4] w-full rounded-lg border border-border/60 bg-card/80 p-2 shadow-sm">
        <div className="size-2.5 rounded-full bg-muted-foreground/20" />
        <div className="mt-2 space-y-1.5">
          <div className="h-1 w-5/6 rounded bg-muted-foreground/15" />
          <div className="h-1 w-2/3 rounded bg-muted-foreground/15" />
          <div className="h-1 w-3/4 rounded bg-muted-foreground/15" />
        </div>
      </div>
      <span
        className={cn(
          "doc-check absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full text-white shadow",
          muted ? "bg-brand-teal/40" : "bg-brand-teal",
        )}
      >
        <Check className="size-3" strokeWidth={3} />
      </span>
    </div>
  );
}

function DocGridSection({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
}) {
  const tiles = Array.from({ length: 48 });
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <Paper />
      {/* grid behind */}
      <div
        data-io
        className="io-doc pointer-events-none absolute inset-0 grid grid-cols-6 gap-3 p-6 opacity-70 sm:grid-cols-10 lg:grid-cols-12"
        aria-hidden="true"
      >
        {tiles.map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: decorative fixed grid
          <DocTile key={i} muted={i % 5 === 0} />
        ))}
      </div>

      <div className="relative mx-auto max-w-2xl">
        <div
          data-io
          className="io-reveal rounded-3xl bg-background/70 p-2 backdrop-blur-[2px]"
        >
          <Eyebrow>{eyebrow}</Eyebrow>
          <h2 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground sm:text-5xl">
            {title}
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            {body}
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA + footer ───────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section className="px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <div
          data-io
          className="io-reveal relative overflow-hidden rounded-3xl bg-brand-dark px-8 py-16 text-center sm:px-16 sm:py-20"
        >
          <h2 className="font-display text-4xl font-extrabold tracking-[-0.03em] text-white sm:text-5xl">
            Ready to see where you stand?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-lg text-white/60">
            Takes a few minutes. Free to get started.
          </p>
          <div className="mt-9">
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Get started
                <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function MiniFooter() {
  return (
    <footer className="border-t border-border bg-muted/50 px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2.5">
          <AppGapLogo className="h-6 w-auto" />
          <span className="font-display text-sm font-extrabold tracking-tight text-foreground">
            AppGap
          </span>
        </div>
        <p className="text-sm text-muted-foreground" style={hand}>
          college admissions, finally clear.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          © 2026 AppGap · An independent student-led project.
        </p>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PreviewPage() {
  useScrollReveal();
  return (
    <main className={cn(caveat.variable)}>
      <Hero />
      <LogoMarquee />
      <Showcase />
      <CoachRow />
      <Founder />
      <WhyBuilt />
      <StoryNotes />
      <HoursSpent />
      <LayeredBands />
      <DocGridSection
        eyebrow="The odds"
        title={
          <>
            At the most selective schools,
            <br /> fewer than 5 in 100 get in.
          </>
        }
        body="So the default answer is no. Unless something in your file makes the reader stop, it goes in the pile. Qualified isn't the bar — memorable is."
      />
      <DocGridSection
        eyebrow="The hard truth"
        title={
          <>
            Most students who get
            <br /> rejected were qualified.
          </>
        }
        body="Every year, top schools turn away thousands of applicants with great grades and impressive activities. AppGap's job is to make sure yours is the file they remember."
      />
      <FinalCTA />
      <MiniFooter />
    </main>
  );
}
