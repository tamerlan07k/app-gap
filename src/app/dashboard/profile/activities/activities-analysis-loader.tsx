"use client";

import {
  Dumbbell,
  Flag,
  FlaskConical,
  HeartHandshake,
  type LucideIcon,
  Music,
  Palette,
  Users,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── ActivitiesAnalysisLoader ──────────────────────────────────────────────
//
// Full-screen motion-graphics overlay shown while the activities analysis is
// generating (the POST to /api/analyze-activities). A 3D orbit of the
// student's activity categories (Research, Service, Music, Sports, Leadership,
// Arts, Clubs) streams into a central "assessment core" — a concentric target
// that brightens as it works — echoing how the feature reads each activity two
// ways (how strong it is and how well it fits). A scan ring tracks progress and
// the status line steps through the real analysis stages.
//
// Progress is honest: it eases toward ~95% and lingers on the final stage
// rather than claiming completion — the workspace unmounts this overlay once
// the real request resolves. A sibling to the onboarding AnalysisLoader; same
// teal palette, type, and luminance-probed theming.

type Node = {
  label: string;
  icon: LucideIcon;
  rad: number;
  tilt: number;
  speed: number;
  phase: number;
};

const NODES: Node[] = [
  {
    label: "Research",
    icon: FlaskConical,
    rad: 0.78,
    tilt: 1.15,
    speed: 0.34,
    phase: 0.0,
  },
  {
    label: "Service",
    icon: HeartHandshake,
    rad: 1.08,
    tilt: 0.42,
    speed: -0.26,
    phase: 1.1,
  },
  {
    label: "Music",
    icon: Music,
    rad: 0.92,
    tilt: 1.38,
    speed: 0.3,
    phase: 2.3,
  },
  {
    label: "Sports",
    icon: Dumbbell,
    rad: 1.15,
    tilt: 0.78,
    speed: -0.22,
    phase: 3.0,
  },
  {
    label: "Leadership",
    icon: Flag,
    rad: 0.7,
    tilt: 0.3,
    speed: 0.4,
    phase: 4.2,
  },
  {
    label: "Arts",
    icon: Palette,
    rad: 1.02,
    tilt: 1.05,
    speed: 0.24,
    phase: 5.0,
  },
  {
    label: "Clubs",
    icon: Users,
    rad: 0.86,
    tilt: 0.6,
    speed: -0.32,
    phase: 5.9,
  },
];

const PHASES = [
  { at: 0.0, text: "Reading your activities" },
  { at: 0.22, text: "Weighing strength & impact" },
  { at: 0.44, text: "Checking fit to your field" },
  { at: 0.66, text: "Continue, deepen, or let go?" },
  { at: 0.84, text: "Finding what to explore next" },
];

function lightPalette() {
  return {
    teal: "oklch(0.58 0.11 203)",
    core: "oklch(0.68 0.13 201)",
    line: "oklch(0.55 0.1 204)",
  };
}
function darkPalette() {
  return {
    teal: "oklch(0.7 0.13 201)",
    core: "oklch(0.82 0.13 199)",
    line: "oklch(0.7 0.12 201)",
  };
}

function withAlpha(oklch: string, a: number) {
  return oklch.replace(/\)$/, ` / ${a.toFixed(3)})`);
}
function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function ActivitiesAnalysisLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coreRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const chipRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const rootEl = rootRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const coreEl = coreRef.current;
    const statusEl = statusRef.current;
    const barEl = barRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const trails: { x: number; y: number }[][] = NODES.map(() => []);

    let W = 0;
    let H = 0;
    let cx = 0;
    let cy = 0;
    let R = 0;
    let rafId = 0;
    let start = 0;
    let curPhase = -1;

    // Pick the palette from the overlay's ACTUAL background luminance rather
    // than the theme class: this app's token utilities (via @theme inline)
    // don't all flip with `.dark`, so the real rendered background is the
    // reliable signal — and this stays correct if the tokens change later.
    const probe = document.createElement("canvas");
    probe.width = 1;
    probe.height = 1;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    let dark = false;
    function computeDark() {
      const root = rootEl ?? document.body;
      const bg = getComputedStyle(root).backgroundColor;
      if (!pctx || !bg) return;
      pctx.clearRect(0, 0, 1, 1);
      pctx.fillStyle = "#ffffff";
      pctx.fillStyle = bg;
      pctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = pctx.getImageData(0, 0, 1, 1).data;
      if (a === 0) return;
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      dark = lum < 0.45;
    }
    function isDark() {
      return dark;
    }

    function resize() {
      if (!canvas || !stage || !ctx || !coreEl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth;
      H = stage.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      R = Math.min(W, H) * 0.3;
      const cs = clamp(R / 150, 0.7, 1.3);
      coreEl.style.width = `${86 * cs}px`;
      coreEl.style.height = `${86 * cs}px`;
    }

    function setStatus(text: string) {
      if (!statusEl) return;
      statusEl.textContent = text;
      if (reduce) return;
      statusEl.animate(
        [
          { opacity: 0, transform: "translateY(9px)", filter: "blur(3px)" },
          { opacity: 1, transform: "translateY(0)", filter: "blur(0)" },
        ],
        { duration: 460, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }

    function project(n: Node, ang: number, sysRot: number, focal: number) {
      const r = n.rad * R;
      const x = Math.cos(ang) * r;
      const yp = Math.sin(ang) * r;
      const y = yp * Math.cos(n.tilt);
      const z = yp * Math.sin(n.tilt);
      const x2 = x * Math.cos(sysRot) + z * Math.sin(sysRot);
      const z2 = -x * Math.sin(sysRot) + z * Math.cos(sysRot);
      const scale = focal / (focal + z2);
      return { x: cx + x2 * scale, y: cy + y * scale, z: z2, scale };
    }

    function placeChip(
      i: number,
      x: number,
      y: number,
      scale: number,
      z: number,
    ) {
      const el = chipRefs.current[i];
      if (!el) return;
      const d = clamp((scale - 0.72) / 0.5, 0, 1);
      const cs = clamp(scale, 0.78, 1.22);
      el.style.transform = `translate(-50%, -50%) translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${cs.toFixed(3)})`;
      el.style.opacity = (0.5 + 0.5 * d).toFixed(3);
      el.style.filter =
        d < 0.85 ? `blur(${((1 - d) * 1.3).toFixed(2)}px)` : "none";
      el.style.zIndex = z < 0 ? "120" : "80";
    }

    function drawStaticFrame() {
      if (!ctx || !coreEl || !barEl) return;
      const pal = isDark() ? darkPalette() : lightPalette();
      const prog = 0.6;
      const focal = R * 2.6;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.45);
      g.addColorStop(0, withAlpha(pal.core, 0.3));
      g.addColorStop(0.5, withAlpha(pal.teal, 0.09));
      g.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
      ctx.fill();
      const ringR = R * 1.32;
      ctx.lineWidth = Math.max(2, R * 0.012);
      ctx.strokeStyle = withAlpha(pal.teal, 0.13);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = pal.core;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2);
      ctx.stroke();
      NODES.forEach((n, i) => {
        const pr = project(n, n.phase, 0.5, focal);
        ctx.strokeStyle = withAlpha(pal.line, 0.2);
        ctx.lineWidth = Math.max(1, R * 0.006);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        placeChip(i, pr.x, pr.y, pr.scale, pr.z);
        const el = chipRefs.current[i];
        if (el) {
          el.style.opacity = "0.95";
          el.style.filter = "none";
        }
      });
      const coreR = R * 0.19;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, "#fff");
      cg.addColorStop(0.35, pal.core);
      cg.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      coreEl.style.opacity = "0.75";
      barEl.style.width = "60%";
      if (statusEl) statusEl.textContent = "Checking fit to your field";
    }

    function frame(now: number) {
      if (!ctx || !coreEl || !barEl) return;
      if (!start) start = now;
      const elapsed = now - start;

      // Honest, asymptotic progress — eases toward ~95% and holds.
      const prog = (1 - Math.exp(-elapsed / 5200)) * 0.95;

      let pi = 0;
      for (let i = 0; i < PHASES.length; i++) {
        if (prog / 0.95 >= PHASES[i].at) pi = i;
      }
      if (pi !== curPhase) {
        curPhase = pi;
        setStatus(PHASES[pi].text);
      }

      barEl.style.width = `${(prog * 100).toFixed(1)}%`;

      const pal = isDark() ? darkPalette() : lightPalette();
      const focal = R * 2.6;
      const sysRot = (elapsed / 1000) * 0.25;
      const tsec = elapsed / 1000;
      const converge = 0.06 * (0.5 + 0.5 * Math.sin(tsec * 0.55));

      // Core mark brightness follows progress, with a slow pulse + rotation.
      const capO = 0.22 + (prog / 0.95) * 0.34 + Math.sin(tsec * 2) * 0.03;
      const capS = 0.9 + converge * 0.5 + Math.sin(tsec * 2) * 0.015;
      coreEl.style.opacity = Math.min(capO, 0.95).toFixed(3);
      coreEl.style.transform = `translate(-50%, -50%) scale(${capS.toFixed(3)}) rotate(${(tsec * 10).toFixed(2)}deg)`;

      ctx.clearRect(0, 0, W, H);

      // Ambient core glow
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.45);
      g.addColorStop(0, withAlpha(pal.core, 0.3));
      g.addColorStop(0.5, withAlpha(pal.teal, 0.09));
      g.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.45, 0, Math.PI * 2);
      ctx.fill();

      // Scan ring (progress sweep)
      const ringR = R * 1.32;
      ctx.lineWidth = Math.max(2, R * 0.012);
      ctx.strokeStyle = withAlpha(pal.teal, 0.13);
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, 0, Math.PI * 2);
      ctx.stroke();
      const a0 = -Math.PI / 2;
      const a1 = a0 + prog * Math.PI * 2;
      const grad = ctx.createLinearGradient(cx - ringR, cy, cx + ringR, cy);
      grad.addColorStop(0, withAlpha(pal.teal, 0.2));
      grad.addColorStop(1, pal.core);
      ctx.strokeStyle = grad;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.arc(cx, cy, ringR, a0, a1);
      ctx.stroke();
      const hx = cx + Math.cos(a1) * ringR;
      const hy = cy + Math.sin(a1) * ringR;
      ctx.fillStyle = pal.core;
      ctx.shadowColor = pal.core;
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(hx, hy, Math.max(3, R * 0.022), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Project nodes (with gentle inward "inhale"), depth-sorted
      const nodes = NODES.map((n, i) => {
        const ang = n.phase + tsec * n.speed;
        const pr = project(n, ang, sysRot, focal);
        pr.x += (cx - pr.x) * converge;
        pr.y += (cy - pr.y) * converge;
        return { i, n, p: pr };
      });
      nodes.sort((a, b) => b.p.z - a.p.z);

      // Feed lines + travelling energy dots + trails
      for (const node of nodes) {
        const depth = clamp((node.p.scale - 0.72) / 0.5, 0, 1);
        const pulse =
          0.12 + 0.12 * (0.5 + 0.5 * Math.sin(tsec * 2.5 + node.n.phase));
        ctx.strokeStyle = withAlpha(
          pal.line,
          (0.08 + pulse) * (0.35 + 0.65 * depth),
        );
        ctx.lineWidth = Math.max(1, R * 0.006) * (0.5 + 0.5 * depth);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(node.p.x, node.p.y);
        ctx.stroke();

        const u = (tsec * 0.6 + node.n.phase * 0.3) % 1;
        const ex = node.p.x + (cx - node.p.x) * u;
        const ey = node.p.y + (cy - node.p.y) * u;
        ctx.fillStyle = withAlpha(
          pal.core,
          (1 - u) * 0.7 * (0.4 + 0.6 * depth),
        );
        ctx.beginPath();
        ctx.arc(
          ex,
          ey,
          Math.max(1.6, R * 0.014) * (1 - u * 0.4),
          0,
          Math.PI * 2,
        );
        ctx.fill();

        const tr = trails[node.i];
        tr.push({ x: node.p.x, y: node.p.y });
        if (tr.length > 10) tr.shift();
        ctx.lineCap = "round";
        for (let t = 1; t < tr.length; t++) {
          ctx.strokeStyle = withAlpha(pal.teal, (t / tr.length) * 0.28 * depth);
          ctx.lineWidth = Math.max(1.5, R * 0.02) * (t / tr.length);
          ctx.beginPath();
          ctx.moveTo(tr[t - 1].x, tr[t - 1].y);
          ctx.lineTo(tr[t].x, tr[t].y);
          ctx.stroke();
        }
      }

      // Bright core nucleus on top
      const coreR = R * 0.19 + Math.sin(tsec * 2.2) * R * 0.012;
      ctx.shadowColor = pal.core;
      ctx.shadowBlur = 22;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, "#fff");
      cg.addColorStop(0.35, pal.core);
      cg.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Position chips over the canvas
      for (const node of nodes) {
        placeChip(node.i, node.p.x, node.p.y, node.p.scale, node.p.z);
      }

      rafId = requestAnimationFrame(frame);
    }

    computeDark();
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) drawStaticFrame();
    });
    ro.observe(stage);

    const mo = new MutationObserver(() => {
      computeDark();
      if (reduce) drawStaticFrame();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    if (reduce) {
      drawStaticFrame();
    } else {
      rafId = requestAnimationFrame(frame);
    }

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      mo.disconnect();
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // Portal to <body> so the overlay escapes any ancestor that establishes a
  // containing block for fixed elements (a transform/filter/contain/container
  // on a dashboard wrapper would otherwise clip it to that box) and reliably
  // covers the full viewport.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Analyzing your activities"
    >
      {/* Eyebrow */}
      <div className="pointer-events-none absolute inset-x-0 top-[18px] z-10 flex items-center justify-center gap-2.5">
        <span className="size-[7px] animate-pulse rounded-full bg-brand-teal shadow-[0_0_10px_oklch(0.6_0.12_202)]" />
        <span className="font-display text-[0.72rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
          AppGap
        </span>
      </div>

      {/* 3D stage */}
      <div ref={stageRef} className="relative min-h-0 flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 block size-full" />

        {/* Central assessment core: concentric target with a plotted point */}
        <div
          ref={coreRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[100] size-[86px] text-brand-teal opacity-20 drop-shadow-[0_2px_12px_oklch(0.55_0.1_204_/_0.55)]"
          style={{ transform: "translate(-50%, -50%) scale(0.9)" }}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block size-full"
            aria-hidden="true"
          >
            <title>Assessment core</title>
            <circle
              cx="32"
              cy="32"
              r="22"
              stroke="currentColor"
              strokeWidth="2.4"
              opacity="0.5"
            />
            <circle
              cx="32"
              cy="32"
              r="13"
              stroke="currentColor"
              strokeWidth="2.4"
              opacity="0.8"
            />
            <circle cx="32" cy="32" r="4.4" fill="currentColor" />
            <path
              d="M32 4v8M32 52v8M4 32h8M52 32h8"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              opacity="0.55"
            />
          </svg>
        </div>

        {/* Orbiting activity chips */}
        {NODES.map((n, i) => {
          const Icon = n.icon;
          return (
            <div
              key={n.label}
              ref={(el) => {
                chipRefs.current[i] = el;
              }}
              className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-[0_6px_18px_oklch(0.5_0.05_210_/_0.12)] backdrop-blur-sm will-change-transform"
              style={{ transform: "translate(-50%, -50%)" }}
            >
              <span className="flex size-[26px] items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
                <Icon className="size-[15px]" />
              </span>
              <span className="text-[0.78rem] font-semibold tracking-tight text-foreground/80">
                {n.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Caption */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p
          ref={statusRef}
          className="min-h-[1.3em] font-display text-xl font-bold tracking-tight sm:text-2xl"
        >
          Reading your activities
        </p>
        <p className="text-sm text-muted-foreground">
          This can take a little while. Please don&apos;t close this page.
        </p>
        <div className="mt-1 h-[5px] w-[min(340px,78vw)] overflow-hidden rounded-full bg-muted">
          <span
            ref={barRef}
            className="block h-full w-0 rounded-full bg-brand-teal shadow-[0_0_12px_oklch(0.6_0.12_202)]"
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
