import { ImageResponse } from "next/og";
import { BRAND_TAGLINE } from "@/lib/brand";

export const alt = "Reel Walia — Stories That Move You";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
        <div style={{ display: "flex", alignItems: "center", gap: 36 }}>
          <svg
            width="112"
            height="112"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="14" y="5" width="20" height="38" rx="5" stroke="#FFFFFF" strokeWidth="2.75" />
            <path d="M21 17V31L33 24L21 17Z" fill="#E03C2F" />
            <path d="M19 9H25" stroke="#E03C2F" strokeWidth="2.75" strokeLinecap="round" />
          </svg>
          <span
            style={{
              fontSize: 88,
              fontWeight: 900,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            Reel<span style={{ color: "#E03C2F" }}> Walia</span>
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
