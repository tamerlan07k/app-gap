/**
 * A friendly AppGap character: the real AppGap "A" logo (kept intact, not
 * distorted) with thin stick arms and legs and a little face. The right arm is
 * raised in a welcoming wave. Themes from brand tokens; eyes/mouth stay white
 * so they read on the dark "A".
 */
export function AppGapMascot({ className }: { className?: string }) {
  const dark = "var(--color-brand-dark)";
  const teal = "var(--color-brand-teal)";
  const limb = "var(--color-muted-foreground)";

  return (
    <svg
      viewBox="0 0 160 170"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AppGap mascot"
      role="img"
    >
      {/* Stick legs (behind the body) */}
      <g stroke={limb} strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M58 122 Q52 140 49 153" />
        <path d="M94 122 Q100 140 103 153" />
      </g>
      <ellipse cx="46" cy="154" rx="7" ry="3.5" fill={limb} />
      <ellipse cx="106" cy="154" rx="7" ry="3.5" fill={limb} />

      {/* Stick arms (behind the body) */}
      <g stroke={limb} strokeWidth="3" strokeLinecap="round" fill="none">
        {/* Left arm — relaxed, slight curve */}
        <path d="M53 82 Q40 90 31 99" />
        {/* Right arm — raised in a wave */}
        <path d="M98 76 Q112 62 121 45" />
      </g>
      <circle cx="29" cy="100" r="4.5" fill={limb} />
      <circle cx="123" cy="43" r="5" fill={limb} />
      {/* wave marks */}
      <g stroke={teal} strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M131 38 Q135 40 133 45" />
        <path d="M135 31 Q141 34 138 42" />
      </g>

      {/* The AppGap "A" — exact logo, kept intact */}
      <g transform="translate(29 13) scale(2.6)">
        <path
          d="M17 7 Q18 2 19 7 L34.5 43 L26 43 L19 27 Q18 24 17 27 L10 43 L1.5 43 Z"
          fill={dark}
        />
        <rect x="10" y="33" width="6" height="6" rx="1.5" fill={teal} />
        <rect x="20" y="33" width="6" height="6" rx="1.5" fill={teal} />
        <line
          x1="16"
          y1="36"
          x2="20"
          y2="36"
          stroke={teal}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* Face (on top of the A) */}
      <circle cx="70" cy="55" r="5.5" fill="#ffffff" />
      <circle cx="86" cy="55" r="5.5" fill="#ffffff" />
      <circle cx="71" cy="56" r="2.6" fill={dark} />
      <circle cx="87" cy="56" r="2.6" fill={dark} />
      <path
        d="M71 67 Q78 72 85 67"
        stroke="#ffffff"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
