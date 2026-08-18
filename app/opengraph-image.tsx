import { ImageResponse } from "next/og";
import { BRAND_TAGLINE } from "@/lib/brand";
import { BRAND_RED } from "@/lib/brand-mark-paths";
import { BrandMarkSvg } from "@/lib/brand-mark-image";

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
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <BrandMarkSvg width={120} height={120} premium />
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
