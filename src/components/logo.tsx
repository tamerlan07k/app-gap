export function AppGapLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AppGap logo"
    >
      {/* Arch body — rounded outer peak, rounded inner V */}
      <path
        d="M17 7 Q18 2 19 7 L34.5 43 L26 43 L19 27 Q18 24 17 27 L10 43 L1.5 43 Z"
        style={{ fill: "var(--color-brand-dark)" }}
      />
      {/* Gap block — left */}
      <rect
        x="10"
        y="33"
        width="6"
        height="6"
        rx="1.5"
        style={{ fill: "var(--color-brand-teal)" }}
      />
      {/* Gap block — right */}
      <rect
        x="20"
        y="33"
        width="6"
        height="6"
        rx="1.5"
        style={{ fill: "var(--color-brand-teal)" }}
      />
      {/* Gap connector bar */}
      <line
        x1="16"
        y1="36"
        x2="20"
        y2="36"
        style={{ stroke: "var(--color-brand-teal)" }}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
