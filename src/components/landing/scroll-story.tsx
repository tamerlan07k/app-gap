"use client";

import {
  Award,
  Compass,
  GraduationCap,
  PenLine,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";
import { useRef, useState } from "react";
import { DotPattern } from "~/components/ui/dot-pattern";
import { cn } from "~/lib/utils";

// ─── Story content ───────────────────────────────────────────────────────────
// Four beats, mirroring the 1609+ scrollytelling arc but told with AppGap's
// own product: profile → honest score → roadmap → where you stand.

type Beat = {
  eyebrow: string;
  title: string;
  body: string;
};

const BEATS: Beat[] = [
  {
    eyebrow: "01",
    title: "It starts with your profile",
    body: "Academics, activities, and awards — everything that makes up your application, gathered in one place.",
  },
  {
    eyebrow: "02",
    title: "AppGap reads it like an admissions officer",
    body: "Six categories, one honest score. No motivational fluff — just where you stand and exactly why.",
  },
  {
    eyebrow: "03",
    title: "Every gap becomes a move",
    body: "Your weak spots turn into a sequenced roadmap — ordered by impact and your real deadlines.",
  },
  {
    eyebrow: "04",
    title: "Then you know where you stand",
    body: "Real chances, school by school — matched against students who actually got in.",
  },
];

// ─── Mock product panels (one per beat) ──────────────────────────────────────

function ProfilePanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-full bg-brand-teal/20 font-display text-sm font-bold text-brand-teal ring-1 ring-brand-teal/30">
          JA
        </div>
        <div>
          <p className="font-display text-sm font-bold text-white">
            Sample profile
          </p>
          <p className="text-xs text-white/50">
            Computer Science · Class of 2027
          </p>
        </div>
        <span className="ml-auto rounded-full border border-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/60">
          Profile
        </span>
      </div>

      <div className="grid grid-cols-4 gap-px overflow-hidden rounded-xl bg-white/10">
        {[
          ["GPA", "3.9"],
          ["SAT", "1540"],
          ["APs", "11"],
          ["Awards", "5"],
        ].map(([label, value]) => (
          <div key={label} className="bg-brand-dark-surface px-3 py-3">
            <p className="text-[10px] uppercase tracking-wider text-white/40">
              {label}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-white">
              {value}
            </p>
          </div>
        ))}
      </div>

      <ul className="space-y-2.5">
        {[
          "Founder — student ML research collective",
          "National olympiad — mathematics, silver",
          "Robotics team captain — 2 years",
        ].map((line) => (
          <li
            key={line}
            className="flex items-start gap-2.5 text-sm text-white/75"
          >
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-teal" />
            {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

const CATEGORIES = [
  ["Academics", 92],
  ["Activities", 85],
  ["Leadership", 88],
  ["Awards", 79],
] as const;

function ScorePanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-5">
        {/* Radial score */}
        <div className="relative size-24 shrink-0">
          <svg
            viewBox="0 0 100 100"
            className="size-full -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="9"
              className="stroke-white/10"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              strokeWidth="9"
              strokeLinecap="round"
              className="stroke-brand-teal"
              strokeDasharray={2 * Math.PI * 42}
              strokeDashoffset={2 * Math.PI * 42 * (1 - 0.88)}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-2xl font-extrabold text-white">
              88
            </span>
            <span className="text-[10px] text-white/40">/ 100</span>
          </div>
        </div>
        <div>
          <p className="font-display text-base font-bold text-white">
            Excellent
          </p>
          <p className="mt-1 text-xs leading-relaxed text-white/55">
            A grounded read on where you stand — the same engine behind the
            dashboard and chances.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {CATEGORIES.map(([label, value]) => (
          <div key={label} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-white/60">{label}</span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-brand-teal"
                style={{ width: `${value}%` }}
              />
            </div>
            <span className="w-7 shrink-0 text-right font-display text-xs font-bold text-white">
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const MOVES = [
  {
    icon: Award,
    track: "Awards",
    text: "Enter two national competitions this cycle",
  },
  {
    icon: PenLine,
    track: "Writing",
    text: "Tighten activity descriptions to lead with impact",
  },
  {
    icon: Sparkles,
    track: "Essays",
    text: "Draft the Common App personal statement",
  },
  {
    icon: Compass,
    track: "Planning",
    text: "Lock a summer research placement",
  },
] as const;

function RoadmapPanel() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold text-white">
          Your roadmap
        </p>
        <span className="text-[10px] uppercase tracking-wider text-white/40">
          Ordered by impact
        </span>
      </div>
      {MOVES.map(({ icon: Icon, track, text }, i) => (
        <div
          key={track}
          className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3"
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-teal/15 font-display text-[11px] font-bold text-brand-teal">
            {i + 1}
          </span>
          <Icon className="size-4 shrink-0 text-brand-teal/80" />
          <p className="flex-1 text-sm text-white/80">{text}</p>
          <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
            {track}
          </span>
        </div>
      ))}
    </div>
  );
}

const CHANCES = [
  ["MIT", 34],
  ["Carnegie Mellon", 52],
  ["Georgia Tech", 71],
  ["UIUC", 83],
] as const;

function ChancesPanel() {
  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-brand-teal/20 ring-1 ring-brand-teal/30">
          <TrendingUp className="size-5 text-brand-teal" />
        </span>
        <div>
          <p className="font-display text-base font-bold text-white">
            You're in range
          </p>
          <p className="text-xs text-white/55">
            Chances from your real profile — no inflated guesses.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {CHANCES.map(([school, pct]) => (
          <div
            key={school}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5"
          >
            <GraduationCap className="size-4 shrink-0 text-white/40" />
            <span className="flex-1 text-sm text-white/85">{school}</span>
            <div className="hidden h-1.5 w-24 overflow-hidden rounded-full bg-white/10 sm:block">
              <div
                className="h-full rounded-full bg-brand-teal"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="w-9 shrink-0 text-right font-display text-sm font-bold text-brand-teal">
              {pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const PANELS = [ProfilePanel, ScorePanel, RoadmapPanel, ChancesPanel];

// ─── Framed product window (shared chrome) ───────────────────────────────────

function Window({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-white/10 bg-brand-dark-surface/80 shadow-2xl shadow-black/40 ring-1 ring-white/5 backdrop-blur-sm">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 hidden flex-1 rounded-md bg-white/5 px-3 py-1 text-xs text-white/40 sm:block">
          appgap.co/dashboard
        </span>
      </div>
      <div className="p-5 sm:p-7">{children}</div>
    </div>
  );
}

// ─── The scrollytelling section ──────────────────────────────────────────────

function Backdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="absolute -left-40 top-10 h-[460px] w-[460px] rounded-full bg-brand-teal/[0.14] blur-3xl" />
      <div className="absolute -right-40 bottom-0 h-[420px] w-[420px] rounded-full bg-brand-teal/[0.10] blur-3xl" />
      <DotPattern
        width={24}
        height={24}
        cr={1}
        className="text-white/[0.05] [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]"
      />
    </div>
  );
}

function Step({ beat, active }: { beat: Beat; active: boolean }) {
  return (
    <div
      className={cn(
        "transition-all duration-500",
        active ? "opacity-100" : "opacity-35",
      )}
    >
      <span
        className={cn(
          "font-display text-xs font-bold tracking-[0.2em] transition-colors duration-500",
          active ? "text-brand-teal" : "text-white/40",
        )}
      >
        {beat.eyebrow}
      </span>
      <h3 className="mt-2 font-display text-2xl font-extrabold leading-tight tracking-[-0.02em] text-white sm:text-3xl">
        {beat.title}
      </h3>
      <p
        className={cn(
          "mt-2 max-w-sm text-sm leading-relaxed text-white/60 transition-all duration-500 sm:text-base",
          active ? "max-h-40 opacity-100" : "max-h-0 overflow-hidden opacity-0",
        )}
      >
        {beat.body}
      </p>
    </div>
  );
}

/** Static, non-pinned fallback for reduced-motion / no-JS-friendly layout. */
function StaticStory() {
  return (
    <div className="relative mx-auto max-w-5xl space-y-12 px-6 py-24">
      <Backdrop />
      <div className="relative space-y-12">
        {BEATS.map((beat, i) => {
          const Panel = PANELS[i];
          return (
            <div
              key={beat.eyebrow}
              className="grid items-center gap-8 lg:grid-cols-2"
            >
              <div>
                <span className="font-display text-xs font-bold tracking-[0.2em] text-brand-teal">
                  {beat.eyebrow}
                </span>
                <h3 className="mt-2 font-display text-2xl font-extrabold tracking-[-0.02em] text-white sm:text-3xl">
                  {beat.title}
                </h3>
                <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/60 sm:text-base">
                  {beat.body}
                </p>
              </div>
              <Window>
                <Panel />
              </Window>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ScrollStory() {
  const ref = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  // Vertical progress rail fill.
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const next = Math.min(
      BEATS.length - 1,
      Math.max(0, Math.floor(p * BEATS.length)),
    );
    setActive(next);
  });

  if (prefersReduced) {
    return (
      <section className="relative overflow-hidden bg-brand-dark">
        <StaticStory />
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="relative bg-brand-dark"
      style={{ height: `${(BEATS.length + 1) * 100}vh` }}
    >
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <Backdrop />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-6 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          {/* Left: narrative steps with a progress rail */}
          <div className="flex gap-5 sm:gap-7">
            <div className="relative mt-2 hidden w-px shrink-0 bg-white/10 sm:block">
              <motion.div
                className="absolute inset-x-0 top-0 origin-top bg-brand-teal"
                style={{ height: "100%", scaleY: railScale }}
              />
            </div>
            <div className="space-y-6 sm:space-y-7">
              {BEATS.map((beat, i) => (
                <Step key={beat.eyebrow} beat={beat} active={i === active} />
              ))}
            </div>
          </div>

          {/* Right: morphing product window. All panels are mounted and
              cross-faded by opacity so rapid scrubbing (scrollbar drags,
              anchor jumps) never leaves the stage blank. */}
          <div className="relative min-h-[24rem]">
            {PANELS.map((Panel, i) => (
              <motion.div
                // biome-ignore lint/suspicious/noArrayIndexKey: fixed, ordered panel list
                key={i}
                className="absolute inset-0 flex items-center"
                initial={false}
                animate={{
                  opacity: i === active ? 1 : 0,
                  y: i === active ? 0 : i < active ? -14 : 14,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                style={{ pointerEvents: i === active ? "auto" : "none" }}
              >
                <Window>
                  <Panel />
                </Window>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
