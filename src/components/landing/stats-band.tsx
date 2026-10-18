"use client";

import { useEffect, useRef, useState } from "react";

// Real product facts only — no invented usage numbers.
const stats = [
  { value: 1540, suffix: "+", label: "Colleges analyzed" },
  { value: 6, suffix: "", label: "Profile categories scored" },
  { value: 5, suffix: "-step", label: "Guided onboarding" },
  { value: 100, suffix: "%", label: "Free to start" },
];

function useCountUp(target: number, run: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setValue(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, duration]);
  return value;
}

function Stat({
  value,
  suffix,
  label,
  run,
}: {
  value: number;
  suffix: string;
  label: string;
  run: boolean;
}) {
  const count = useCountUp(value, run);
  return (
    <div className="text-center">
      <p className="font-display text-5xl font-extrabold tracking-[-0.03em] text-white sm:text-6xl">
        {count.toLocaleString()}
        <span className="text-brand-teal">{suffix}</span>
      </p>
      <p className="mt-2 text-sm text-white/55">{label}</p>
    </div>
  );
}

export function StatsBand() {
  const ref = useRef<HTMLElement>(null);
  const [run, setRun] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRun(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} className="bg-brand-dark px-6 py-20">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-12 text-center font-display text-3xl font-extrabold tracking-[-0.03em] text-white sm:text-4xl">
          Built to close the gap
        </h2>
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-4">
          {stats.map((s) => (
            <Stat key={s.label} {...s} run={run} />
          ))}
        </div>
      </div>
    </section>
  );
}
