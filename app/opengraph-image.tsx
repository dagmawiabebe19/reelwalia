import { ImageResponse } from "next/og";
import { BRAND_TAGLINE } from "@/lib/brand";
import {
  BRAND_RED,
  BRAND_RED_DARK,
  BRAND_RED_LIGHT,
  MARK_FRAME,
  MARK_PLAY,
} from "@/lib/brand-mark-paths";

export const alt = "Reel Walia — Stories That Move You";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  const { x, y, width, height, rx } = MARK_FRAME;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(165deg, #140606 0%, #000000 50%, #000000 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <svg
            width="120"
            height="120"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="og-body" x1="24" y1={y} x2="24" y2={y + height}>
                <stop offset="0%" stopColor={BRAND_RED_LIGHT} />
                <stop offset="42%" stopColor={BRAND_RED} />
                <stop offset="100%" stopColor={BRAND_RED_DARK} />
              </linearGradient>
              <linearGradient id="og-shine" x1="24" y1={y} x2="24" y2={y + height * 0.55}>
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="og-play" x1="18" y1="14" x2="36" y2="34">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E2E2E2" />
              </linearGradient>
            </defs>
            <ellipse cx="24" cy="46.8" rx="11" ry="1.3" fill="#000000" opacity="0.28" />
            <rect
              x={x - 0.75}
              y={y - 0.75}
              width={width + 1.5}
              height={height + 1.5}
              rx={rx + 0.75}
              fill="#120606"
            />
            <rect x={x} y={y} width={width} height={height} rx={rx} fill="url(#og-body)" />
            <rect x={x} y={y} width={width} height={height} rx={rx} fill="url(#og-shine)" />
            <path d={MARK_PLAY} fill="url(#og-play)" />
          </svg>
          <span
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: "0.025em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Reel<span style={{ color: BRAND_RED }}> Walia</span>
          </span>
        </div>
        <p
          style={{
            marginTop: 32,
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: "0.01em",
            color: "#A1A1AA",
          }}
        >
          {BRAND_TAGLINE}
        </p>
      </div>
    ),
    { ...size }
  );
}
