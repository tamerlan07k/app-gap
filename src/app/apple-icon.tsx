import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        background: "white",
        borderRadius: 36,
      }}
    >
      <svg viewBox="0 0 36 44" width={110} height={134} fill="none" role="img" aria-label="AppGap logo">
        <path
          d="M17 7 Q18 2 19 7 L34.5 43 L26 43 L19 27 Q18 24 17 27 L10 43 L1.5 43 Z"
          fill="#1e3a4a"
        />
        <rect x="10" y="33" width="6" height="6" rx="1.5" fill="#4a90a4" />
        <rect x="20" y="33" width="6" height="6" rx="1.5" fill="#4a90a4" />
        <line
          x1="16"
          y1="36"
          x2="20"
          y2="36"
          stroke="#4a90a4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>,
    { ...size },
  );
}
