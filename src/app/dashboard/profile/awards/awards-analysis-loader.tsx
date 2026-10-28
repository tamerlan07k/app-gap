"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

// ─── AwardsAnalysisLoader ──────────────────────────────────────────────────
//
// Full-screen motion-graphics overlay shown while the recognition analysis is
// generating (the POST to /api/awards/recognition). A 3D orbit of recognition
// categories (Academic, National, STEM, Arts, Athletics, Leadership, Service)
// streams into a central award rosette — echoing how the feature reads a
// student's awards as a whole: the themes they demonstrate, their scope and
// selectivity, and the opportunities that could add something new.
//
// Progress is honest: it eases toward ~95% and lingers on the final stage
// rather than claiming completion — the workspace unmounts this overlay once
// the real request resolves. A sibling to the onboarding, activities, and
// coursework loaders; same teal palette, type, and luminance-probed theming.
//
// The chip glyphs are inline SVG (not lucide) so the award-specific set —
// rosette, laurel, certificate seal — matches the approved design exactly.

type IconKey =
  | "medal"
  | "certificate"
  | "trophy"
  | "star"
  | "laurel"
  | "shield"
  | "ribbon";

type Node = {
  label: string;
  icon: IconKey;
  rad: number;
  tilt: number;
  speed: number;
  phase: number;
};

const NODES: Node[] = [
  {
    label: "Academic",
    icon: "medal",
    rad: 0.78,
    tilt: 1.15,
    speed: 0.34,
    phase: 0.0,
  },
  {
    label: "National",
    icon: "certificate",
    rad: 1.08,
    tilt: 0.42,
    speed: -0.26,
    phase: 1.1,
  },
  {
    label: "STEM",
    icon: "trophy",
    rad: 0.92,
    tilt: 1.38,
    speed: 0.3,
    phase: 2.3,
  },
  {
    label: "Arts",
    icon: "star",
    rad: 1.15,
    tilt: 0.78,
    speed: -0.22,
    phase: 3.0,
  },
  {
    label: "Athletics",
    icon: "laurel",
    rad: 0.7,
    tilt: 0.3,
    speed: 0.4,
    phase: 4.2,
  },
  {
    label: "Leadership",
    icon: "shield",
    rad: 1.02,
    tilt: 1.05,
    speed: 0.24,
    phase: 5.0,
  },
  {
    label: "Service",
    icon: "ribbon",
    rad: 0.86,
    tilt: 0.6,
    speed: -0.32,
    phase: 5.9,
  },
];

const GLYPHS: Record<IconKey, ReactNode> = {
  medal: (
    <>
      <path d="M8 2l3.5 6.5M16 2l-3.5 6.5" />
      <circle cx="12" cy="15" r="6.5" />
      <path d="M12 11.6l1.2 2.4 2.6.3-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6L8.2 14.3l2.6-.3L12 11.6Z" />
    </>
  ),
  certificate: (
    <>
      <rect x="4" y="3" width="13" height="12" rx="1.5" />
      <path d="M7 7h7M7 10h4" />
      <circle cx="15.5" cy="17.5" r="3" />
      <path d="M13.6 19.8l-.9 3 2.8-1.6 2.8 1.6-.9-3" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 3h8v5a4 4 0 0 1-8 0V3Z" />
      <path d="M8 5H5v1a3 3 0 0 0 3 3M16 5h3v1a3 3 0 0 1-3 3" />
      <path d="M12 12v4M9 21h6M10.2 21c0-1.8.8-3 1.8-3s1.8 1.2 1.8 3" />
    </>
  ),
  star: (
    <path d="M12 3l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 22l-5.9-2.7 1.1-5.9L2.8 9.3l6-.8L12 3Z" />
  ),
  laurel: (
    <>
      <path d="M12 21c-4-1-7-4.2-7-9 0-3 1.4-6 4-8" />
      <path d="M12 21c4-1 7-4.2 7-9 0-3-1.4-6-4-8" />
      <path d="M8.3 9.5c1 .4 1.9 1.3 2.4 2.6M15.7 9.5c-1 .4-1.9 1.3-2.4 2.6M9.2 14.3c1 .4 1.7 1.2 2.1 2.3M14.8 14.3c-1 .4-1.7 1.2-2.1 2.3" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4-3 7-7 9-4-2-7-5-7-9V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  ribbon: (
    <>
      <circle cx="12" cy="9" r="5.2" />
      <path d="M8.6 13.2l-2 7 5.4-2.3 5.4 2.3-2-7" />
    </>
  ),
};

const PHASES = [
  { at: 0.0, text: "Reading your awards" },
  { at: 0.22, text: "Finding the themes" },
  { at: 0.44, text: "Weighing scope & selectivity" },
  { at: 0.66, text: "Seeing what your recognition adds" },
  { at: 0.84, text: "Spotting new opportunities" },
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

export function AwardsAnalysisLoader() {
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
      coreEl.style.width = `${96 * cs}px`;
      coreEl.style.height = `${96 * cs}px`;
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
      if (statusEl) statusEl.textContent = "Weighing scope & selectivity";
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

      // Core mark brightness follows progress, with a slow pulse.
      const capO = 0.22 + (prog / 0.95) * 0.34 + Math.sin(tsec * 2) * 0.03;
      const capS = 0.9 + converge * 0.5 + Math.sin(tsec * 2) * 0.015;
      coreEl.style.opacity = Math.min(capO, 0.95).toFixed(3);
      coreEl.style.transform = `translate(-50%, -50%) scale(${capS.toFixed(3)})`;

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
      aria-label="Analyzing your recognition"
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

        {/* Central motif: an award rosette / medallion with ribbon tails */}
        <div
          ref={coreRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[100] size-[96px] text-brand-teal opacity-20 drop-shadow-[0_2px_12px_oklch(0.55_0.1_204_/_0.55)]"
          style={{ transform: "translate(-50%, -50%) scale(0.9)" }}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block size-full"
            aria-hidden="true"
          >
            <title>Award rosette</title>
            <path
              d="M25 41l-2.5 17 9.5-5.5 9.5 5.5L39 41"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinejoin="round"
              opacity="0.65"
            />
            <circle
              cx="32"
              cy="30"
              r="14"
              stroke="currentColor"
              strokeWidth="2.4"
              opacity="0.85"
            />
            <circle
              cx="32"
              cy="30"
              r="8.5"
              stroke="currentColor"
              strokeWidth="2"
              opacity="0.5"
            />
            <path
              d="M32 23.5l2 4.1 4.5.6-3.3 3.1.8 4.5L32 37.7l-4 2.1.8-4.5-3.3-3.1 4.5-.6L32 23.5Z"
              fill="currentColor"
              opacity="0.9"
            />
          </svg>
        </div>

        {/* Orbiting recognition chips */}
        {NODES.map((n, i) => (
          <div
            key={n.label}
            ref={(el) => {
              chipRefs.current[i] = el;
            }}
            className="pointer-events-none absolute left-0 top-0 flex items-center gap-2 rounded-full border border-border bg-card/95 px-3 py-1.5 shadow-[0_6px_18px_oklch(0.5_0.05_210_/_0.12)] backdrop-blur-sm will-change-transform"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            <span className="flex size-[26px] items-center justify-center rounded-full bg-brand-teal/10 text-brand-teal">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-[15px]"
                aria-hidden="true"
              >
                {GLYPHS[n.icon]}
              </svg>
            </span>
            <span className="text-[0.78rem] font-semibold tracking-tight text-foreground/80">
              {n.label}
            </span>
          </div>
        ))}
      </div>

      {/* Caption */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p
          ref={statusRef}
          className="min-h-[1.3em] font-display text-xl font-bold tracking-tight sm:text-2xl"
        >
          Reading your awards
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
