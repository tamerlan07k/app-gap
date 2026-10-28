"use client";

// Full-screen generation animation for My Roadmap. Adapted from the provided
// Roadmap Loader: a single trunk grows from an origin node and fans into the four
// labeled branches, which draw on and expand outward with popping endpoints and
// fading labels, over a cycling status line. Recolored entirely to AppGap's
// design tokens (teal trunk + four harmonized branch hues). It renders as a fixed
// overlay so the page shows ONLY the animation while generating. Honors
// prefers-reduced-motion.

import { createPortal } from "react-dom";
import { BRANCH_COLOR_VARS } from "./roadmap-graph";

const STATUS_LINES = [
  "Mapping your application",
  "Separating it into Academics, Essays, Awards & Activities",
  "Personalizing your path",
];

export function RoadmapLoader() {
  // Portal to <body> so the overlay escapes any ancestor that establishes a
  // containing block for fixed elements and reliably covers the full viewport.
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label="Generating your roadmap"
    >
      {/* Scoped styles — the `rml-` prefix keeps these from colliding with the app. */}
      <style>{`
        .rml-stage{width:min(92vw,720px);display:flex;flex-direction:column;align-items:center;gap:28px}
        .rml-viz{width:100%;height:auto;display:block;overflow:visible}

        .rml-branch{
          fill:none;stroke-width:5;stroke-linecap:round;
          stroke-dasharray:var(--len);stroke-dashoffset:var(--len);
          animation:rml-draw 3.2s ease-in-out infinite;
        }
        .rml-trunk{
          fill:none;stroke:var(--color-brand-teal);stroke-width:6;stroke-linecap:round;
          stroke-dasharray:200;stroke-dashoffset:200;
          animation:rml-draw-trunk 3.2s ease-in-out infinite;
          filter:drop-shadow(0 2px 8px color-mix(in oklch, var(--color-brand-teal) 45%, transparent));
        }
        .rml-b-acad{stroke:var(--rm-acad)}
        .rml-b-essay{stroke:var(--rm-essay)}
        .rml-b-award{stroke:var(--rm-award)}
        .rml-b-activ{stroke:var(--rm-activ)}

        @keyframes rml-draw-trunk{
          0%{stroke-dashoffset:200}18%{stroke-dashoffset:0}100%{stroke-dashoffset:0}
        }
        @keyframes rml-draw{
          0%,15%{stroke-dashoffset:var(--len)}
          60%{stroke-dashoffset:0}100%{stroke-dashoffset:0}
        }

        .rml-spark{fill:#fff;opacity:0;animation:rml-spark 3.2s ease-in-out infinite}
        @keyframes rml-spark{0%,15%{opacity:0}24%{opacity:.95}60%{opacity:.95}72%{opacity:0}100%{opacity:0}}

        .rml-node{fill:var(--color-card);stroke:var(--color-border);stroke-width:2}
        .rml-core{animation:rml-core 3.2s ease-in-out infinite}
        @keyframes rml-core{0%,100%{opacity:.6}50%{opacity:1}}

        .rml-end{transform-box:fill-box;transform-origin:center;opacity:0;animation:rml-end 3.2s ease-out infinite}
        @keyframes rml-end{0%,50%{opacity:0;transform:scale(.2)}64%{opacity:1;transform:scale(1)}92%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.2)}}

        .rml-chip{opacity:0;animation:rml-chip 3.2s ease-out infinite}
        @keyframes rml-chip{
          0%,40%{opacity:0;transform:translateY(4px) scale(.96)}
          62%{opacity:1;transform:translateY(0) scale(1)}
          92%{opacity:1;transform:translateY(0) scale(1)}
          100%{opacity:0;transform:translateY(0) scale(.96)}
        }
        .rml-chip-rect{fill:var(--color-card);stroke:var(--color-border);stroke-width:1.5}
        .rml-chip-text{font-size:15px;font-weight:600;letter-spacing:.2px;dominant-baseline:middle;text-anchor:middle}

        .rml-status{position:relative;height:1.7em;width:100%;text-align:center}
        .rml-status span{
          position:absolute;inset:0;font-size:clamp(14px,2.4vw,18px);font-weight:500;
          color:var(--color-muted-foreground);opacity:0;animation:rml-cycle 9.6s ease-in-out infinite;
        }
        .rml-status span:nth-child(1){animation-delay:0s}
        .rml-status span:nth-child(2){animation-delay:3.2s}
        .rml-status span:nth-child(3){animation-delay:6.4s}
        @keyframes rml-cycle{
          0%{opacity:0;transform:translateY(6px)}
          8%{opacity:1;transform:translateY(0)}
          28%{opacity:1;transform:translateY(0)}
          36%{opacity:0;transform:translateY(-6px)}
          100%{opacity:0;transform:translateY(-6px)}
        }
        .rml-dots::after{content:"";animation:rml-dots 1.5s steps(4,end) infinite}
        @keyframes rml-dots{0%{content:""}25%{content:"."}50%{content:".."}75%{content:"..."}}

        @media (prefers-reduced-motion:reduce){
          .rml-branch{stroke-dashoffset:0;animation:none}
          .rml-trunk{stroke-dashoffset:0;animation:none}
          .rml-spark,.rml-chip,.rml-end,.rml-core,.rml-status span{animation-duration:.01ms;animation-iteration-count:1}
          .rml-chip,.rml-end{opacity:1}
          .rml-status span:nth-child(1){opacity:1}
        }
      `}</style>

      <div className="rml-stage" style={BRANCH_COLOR_VARS}>
        <svg className="rml-viz" viewBox="0 0 760 360" aria-hidden="true">
          {/* Trunk */}
          <path className="rml-trunk" d="M 120 180 H 300" />

          {/* Origin + junction nodes */}
          <circle className="rml-node" cx="120" cy="180" r="26" />
          <circle
            className="rml-core"
            cx="120"
            cy="180"
            r="14"
            fill="var(--color-brand-teal)"
          />
          <circle className="rml-node" cx="300" cy="180" r="20" />
          <circle
            className="rml-core"
            cx="300"
            cy="180"
            r="9"
            fill="var(--color-brand-teal)"
          />

          {/* Four branches fanning out */}
          <path
            id="rml-p-acad"
            className="rml-branch rml-b-acad"
            style={{ ["--len" as string]: "360" }}
            d="M 300 180 C 400 180, 420 60, 560 60"
          />
          <path
            id="rml-p-essay"
            className="rml-branch rml-b-essay"
            style={{ ["--len" as string]: "330" }}
            d="M 300 180 C 400 180, 420 120, 560 130"
          />
          <path
            id="rml-p-award"
            className="rml-branch rml-b-award"
            style={{ ["--len" as string]: "330" }}
            d="M 300 180 C 400 180, 420 240, 560 230"
          />
          <path
            id="rml-p-activ"
            className="rml-branch rml-b-activ"
            style={{ ["--len" as string]: "360" }}
            d="M 300 180 C 400 180, 420 300, 560 300"
          />

          {/* Travelling light pulses */}
          {["rml-p-acad", "rml-p-essay", "rml-p-award", "rml-p-activ"].map(
            (id) => (
              <circle key={id} className="rml-spark" r="4">
                <animateMotion
                  dur="3.2s"
                  repeatCount="indefinite"
                  keyPoints="0;0;1;1"
                  keyTimes="0;0.18;0.6;1"
                  calcMode="linear"
                >
                  <mpath href={`#${id}`} />
                </animateMotion>
              </circle>
            ),
          )}

          {/* Endpoints */}
          <circle
            className="rml-end"
            cx="560"
            cy="60"
            r="7"
            fill="var(--rm-acad)"
          />
          <circle
            className="rml-end"
            cx="560"
            cy="130"
            r="7"
            fill="var(--rm-essay)"
          />
          <circle
            className="rml-end"
            cx="560"
            cy="230"
            r="7"
            fill="var(--rm-award)"
          />
          <circle
            className="rml-end"
            cx="560"
            cy="300"
            r="7"
            fill="var(--rm-activ)"
          />

          {/* Branch labels */}
          <g className="rml-chip">
            <rect
              className="rml-chip-rect"
              x="582"
              y="42"
              width="156"
              height="36"
              rx="18"
            />
            <text
              className="rml-chip-text"
              x="660"
              y="61"
              fill="var(--rm-acad)"
            >
              Academics
            </text>
          </g>
          <g className="rml-chip">
            <rect
              className="rml-chip-rect"
              x="582"
              y="112"
              width="156"
              height="36"
              rx="18"
            />
            <text
              className="rml-chip-text"
              x="660"
              y="131"
              fill="var(--rm-essay)"
            >
              Essays
            </text>
          </g>
          <g className="rml-chip">
            <rect
              className="rml-chip-rect"
              x="582"
              y="212"
              width="156"
              height="36"
              rx="18"
            />
            <text
              className="rml-chip-text"
              x="660"
              y="231"
              fill="var(--rm-award)"
            >
              Awards
            </text>
          </g>
          <g className="rml-chip">
            <rect
              className="rml-chip-rect"
              x="582"
              y="282"
              width="156"
              height="36"
              rx="18"
            />
            <text
              className="rml-chip-text"
              x="660"
              y="301"
              fill="var(--rm-activ)"
            >
              Activities
            </text>
          </g>
        </svg>

        <div className="rml-status">
          <span className="rml-dots">{STATUS_LINES[0]}</span>
          <span>{STATUS_LINES[1]}</span>
          <span className="rml-dots">{STATUS_LINES[2]}</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
