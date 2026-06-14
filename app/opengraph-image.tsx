import { ImageResponse } from "next/og";

export const alt = "ReelWalia — Vertical drama streaming";
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
          background: "linear-gradient(160deg, #1a0505 0%, #000000 45%, #000000 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 900,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <span>Reel</span>
          <span style={{ color: "#E03C2F" }}>Walia</span>
        </div>
        <p
          style={{
            display: "flex",
            marginTop: 24,
            fontSize: 28,
            color: "#9CA3AF",
            maxWidth: 720,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Bite-sized vertical dramas from Walia Studios
        </p>
      </div>
    ),
    { ...size }
  );
}
