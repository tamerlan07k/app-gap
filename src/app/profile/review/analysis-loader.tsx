"use client";

import { useEffect, useRef } from "react";

// ─── AnalysisLoader ────────────────────────────────────────────────────────
//
// Full-screen motion-graphics overlay shown while the onboarding analysis is
// generating (the ~10–20s POST to /api/analyze-profile). A 3D orbit of the
// student's profile signals (GPA, SAT, APs, Activities, Awards, Essay, Major)
// feeds a glowing core that reads as a graduation cap, while a scan ring tracks
// progress and the status line steps through the real analysis stages.
//
// Progress is honest: it eases toward ~95% and lingers on the final stage
// rather than claiming completion — the page navigates away once the real
// request resolves, which unmounts this overlay.

type Signal = {
  label: string;
  rad: number;
  tilt: number;
  speed: number;
  phase: number;
  trail: { x: number; y: number }[];
};

const SIGNALS: Omit<Signal, "trail">[] = [
  { label: "GPA", rad: 0.78, tilt: 1.15, speed: 0.34, phase: 0.0 },
  { label: "SAT / ACT", rad: 1.08, tilt: 0.42, speed: -0.26, phase: 1.1 },
  { label: "AP Courses", rad: 0.92, tilt: 1.38, speed: 0.3, phase: 2.3 },
  { label: "Activities", rad: 1.15, tilt: 0.78, speed: -0.22, phase: 3.0 },
  { label: "Awards", rad: 0.7, tilt: 0.3, speed: 0.4, phase: 4.2 },
  { label: "Essay", rad: 1.02, tilt: 1.05, speed: 0.24, phase: 5.0 },
  { label: "Major", rad: 0.86, tilt: 0.6, speed: -0.32, phase: 5.9 },
];

const PHASES = [
  { at: 0.0, text: "Reading your academic profile" },
  { at: 0.2, text: "Weighing your activities & awards" },
  { at: 0.42, text: "Mapping your college fit" },
  { at: 0.64, text: "Measuring your gap" },
  { at: 0.84, text: "Building your roadmap" },
];

function lightPalette() {
  return {
    teal: "oklch(0.58 0.11 203)",
    core: "oklch(0.68 0.13 201)",
    line: "oklch(0.55 0.1 204)",
    label: "oklch(0.46 0.03 210)",
  };
}
function darkPalette() {
  return {
    teal: "oklch(0.7 0.13 201)",
    core: "oklch(0.82 0.13 199)",
    line: "oklch(0.7 0.12 201)",
    label: "oklch(0.78 0.02 210)",
  };
}

function withAlpha(oklch: string, a: number) {
  // oklch(L C H) -> oklch(L C H / a)
  return oklch.replace(/\)$/, ` / ${a.toFixed(3)})`);
}
function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function AnalysisLoader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const capRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const rootEl = rootRef.current;
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    const capEl = capRef.current;
    const statusEl = statusRef.current;
    const barEl = barRef.current;
    if (!canvas || !stage) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const fontFamily =
      getComputedStyle(document.body).fontFamily ||
      "Inter, ui-sans-serif, system-ui, sans-serif";

    const signals: Signal[] = SIGNALS.map((s) => ({ ...s, trail: [] }));

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
      if (a === 0) return; // transparent — keep previous reading
      const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      dark = lum < 0.45;
    }
    function isDark() {
      return dark;
    }

    function resize() {
      if (!canvas || !stage || !ctx || !capEl) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth;
      H = stage.clientHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W / 2;
      cy = H / 2;
      R = Math.min(W, H) * 0.3;
      const cs = Math.max(0.65, Math.min(1.25, R / 150));
      capEl.style.width = `${72 * cs}px`;
      capEl.style.height = `${72 * cs}px`;
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
        { duration: 500, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
      );
    }

    function project(s: Signal, ang: number, sysRot: number, focal: number) {
      const r = s.rad * R;
      const x = Math.cos(ang) * r;
      const yp = Math.sin(ang) * r;
      const y = yp * Math.cos(s.tilt);
      const z = yp * Math.sin(s.tilt);
      const x2 = x * Math.cos(sysRot) + z * Math.sin(sysRot);
      const z2 = -x * Math.sin(sysRot) + z * Math.cos(sysRot);
      const scale = focal / (focal + z2);
      return { x: cx + x2 * scale, y: cy + y * scale, z: z2, scale };
    }

    function drawStaticFrame() {
      if (!ctx || !capEl || !barEl) return;
      const pal = isDark() ? darkPalette() : lightPalette();
      const focal = R * 2.6;
      ctx.clearRect(0, 0, W, H);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      g.addColorStop(0, withAlpha(pal.core, 0.4));
      g.addColorStop(0.5, withAlpha(pal.teal, 0.1));
      g.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = withAlpha(pal.teal, 0.14);
      ctx.lineWidth = Math.max(2, R * 0.012);
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.3, 0, Math.PI * 2);
      ctx.stroke();
      for (const s of signals) {
        const pr = project(s, s.phase, 0.5, focal);
        ctx.strokeStyle = withAlpha(pal.line, 0.18);
        ctx.lineWidth = Math.max(1, R * 0.006);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pr.x, pr.y);
        ctx.stroke();
        ctx.fillStyle = pal.teal;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, Math.max(3, R * 0.03), 0, Math.PI * 2);
        ctx.fill();
        ctx.font = `600 ${Math.round(Math.max(10, R * 0.075))}px ${fontFamily}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = withAlpha(pal.label, 0.8);
        ctx.fillText(s.label, pr.x + R * 0.045, pr.y);
      }
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.22);
      cg.addColorStop(0, "#fff");
      cg.addColorStop(0.4, pal.core);
      cg.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 0.22, 0, Math.PI * 2);
      ctx.fill();
      capEl.style.opacity = "0.85";
      capEl.style.transform = "translate(-50%, -50%) scale(1)";
      barEl.style.width = "60%";
      if (statusEl) statusEl.textContent = "Analyzing your profile";
    }

    function frame(now: number) {
      if (!ctx || !capEl || !barEl) return;
      if (!start) start = now;
      const elapsed = now - start;

      // Honest, asymptotic progress — eases toward ~95% and holds.
      const prog = (1 - Math.exp(-elapsed / 5200)) * 0.95;

      // Phase text steps through the real analysis stages, lingering on the last.
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
      // Gentle ambient "inhale" — never a completion claim.
      const converge = 0.06 * (0.5 + 0.5 * Math.sin(tsec * 0.55));

      // Cap: steady glow with a slow pulse, brightening slightly as it settles.
      const capO = 0.26 + (prog / 0.95) * 0.3 + Math.sin(tsec * 2) * 0.04;
      const capS = 0.92 + converge * 0.4 + Math.sin(tsec * 2) * 0.015;
      capEl.style.opacity = Math.min(capO, 0.95).toFixed(3);
      capEl.style.transform = `translate(-50%, -50%) scale(${capS.toFixed(3)})`;

      ctx.clearRect(0, 0, W, H);

      // Background core glow
      const coreR = R * 0.2 + Math.sin(tsec * 2.2) * R * 0.012;
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.4);
      g.addColorStop(0, withAlpha(pal.core, 0.33));
      g.addColorStop(0.5, withAlpha(pal.teal, 0.1));
      g.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.4, 0, Math.PI * 2);
      ctx.fill();

      // Scan ring (progress sweep)
      const ringR = R * 1.3;
      ctx.lineWidth = Math.max(2, R * 0.012);
      ctx.strokeStyle = withAlpha(pal.teal, 0.14);
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

      // Node positions, depth-sorted
      const nodes = signals.map((s) => {
        const ang = s.phase + tsec * s.speed;
        const pr = project(s, ang, sysRot, focal);
        if (converge > 0) {
          pr.x = pr.x + (cx - pr.x) * converge;
          pr.y = pr.y + (cy - pr.y) * converge;
        }
        return { s, p: pr };
      });
      nodes.sort((a, b) => b.p.z - a.p.z);

      // Connective "feed" lines
      for (const n of nodes) {
        const depth = clamp((n.p.scale - 0.55) / 0.7, 0, 1);
        const pulse =
          0.12 + 0.12 * (0.5 + 0.5 * Math.sin(tsec * 2.5 + n.s.phase));
        ctx.strokeStyle = withAlpha(pal.line, (0.1 + pulse) * depth);
        ctx.lineWidth = Math.max(1, R * 0.006) * depth;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(n.p.x, n.p.y);
        ctx.stroke();
      }

      // Nodes + trails + labels
      for (const n of nodes) {
        const depth = clamp((n.p.scale - 0.5) / 0.75, 0, 1);
        const alpha = 0.35 + 0.65 * depth;
        const dotR = Math.max(2.2, R * 0.03 * n.p.scale);

        n.s.trail.push({ x: n.p.x, y: n.p.y });
        if (n.s.trail.length > 12) n.s.trail.shift();
        ctx.lineCap = "round";
        for (let t = 1; t < n.s.trail.length; t++) {
          const ta = (t / n.s.trail.length) * alpha * 0.5;
          ctx.strokeStyle = withAlpha(pal.teal, ta);
          ctx.lineWidth = dotR * (t / n.s.trail.length) * 0.9;
          ctx.beginPath();
          ctx.moveTo(n.s.trail[t - 1].x, n.s.trail[t - 1].y);
          ctx.lineTo(n.s.trail[t].x, n.s.trail[t].y);
          ctx.stroke();
        }

        ctx.shadowColor = pal.teal;
        ctx.shadowBlur = 12 * depth;
        ctx.fillStyle = withAlpha(pal.core, alpha);
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, dotR, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = withAlpha(pal.teal, alpha);
        ctx.beginPath();
        ctx.arc(n.p.x, n.p.y, dotR * 0.5, 0, Math.PI * 2);
        ctx.fill();

        const la = clamp((depth - 0.25) / 0.75, 0, 1);
        if (la > 0.02) {
          ctx.font = `600 ${Math.round(Math.max(10, R * 0.075))}px ${fontFamily}`;
          ctx.textAlign = "left";
          ctx.textBaseline = "middle";
          ctx.fillStyle = withAlpha(pal.label, la);
          ctx.fillText(n.s.label, n.p.x + dotR + 6, n.p.y);
        }
      }

      // Bright core on top
      ctx.shadowColor = pal.core;
      ctx.shadowBlur = 24;
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR);
      cg.addColorStop(0, "#fff");
      cg.addColorStop(0.35, pal.core);
      cg.addColorStop(1, withAlpha(pal.teal, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      rafId = requestAnimationFrame(frame);
    }

    computeDark();
    resize();
    const ro = new ResizeObserver(() => {
      resize();
      if (reduce) drawStaticFrame();
    });
    ro.observe(stage);

    // Re-read the palette if the theme class changes mid-generation.
    const mo = new MutationObserver(() => {
      computeDark();
      if (reduce) drawStaticFrame();
    });
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Lock background scroll while the overlay is up.
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

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-50 flex flex-col bg-background"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Generating your AppGap analysis"
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
        {/* Graduation cap that forms inside the core */}
        <div
          ref={capRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-[2] size-[72px] text-white opacity-20 drop-shadow-[0_2px_10px_oklch(0.55_0.1_204_/_0.55)]"
          style={{ transform: "translate(-50%, -50%) scale(0.9)" }}
        >
          <svg
            viewBox="0 0 64 64"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="block size-full"
            aria-hidden="true"
          >
            <title>Graduation cap</title>
            <path d="M32 12 60 24 32 36 4 24 32 12Z" fill="currentColor" />
            <path
              d="M16 30v9c0 4.4 7.2 8 16 8s16-3.6 16-8v-9"
              fill="none"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M60 24v11"
              stroke="currentColor"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            <circle cx="60" cy="37.5" r="2.6" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Caption */}
      <div className="relative z-10 flex flex-col items-center gap-2.5 px-6 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
        <p
          ref={statusRef}
          className="min-h-[1.3em] font-display text-xl font-bold tracking-tight sm:text-2xl"
        >
          Reading your academic profile
        </p>
        <p className="text-sm text-muted-foreground">
          This usually takes 10–20 seconds. Please don&apos;t close this page.
        </p>
        <div className="mt-1 h-[5px] w-[min(340px,78vw)] overflow-hidden rounded-full bg-muted">
          <span
            ref={barRef}
            className="block h-full w-0 rounded-full bg-brand-teal shadow-[0_0_12px_oklch(0.6_0.12_202)]"
          />
        </div>
      </div>
    </div>
  );
}
