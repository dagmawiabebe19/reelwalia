import { ImageResponse } from "next/og";

export const alt = "ReelWalia — Stories That Move You";
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
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <svg
            width="96"
            height="96"
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect x="14" y="5" width="20" height="38" rx="5" stroke="#FFFFFF" strokeWidth="2.75" />
            <path d="M21 17V31L33 24L21 17Z" fill="#E03C2F" />
            <path d="M19 9H25" stroke="#E03C2F" strokeWidth="2.75" strokeLinecap="round" />
          </svg>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              Reel
            </span>
            <span
              style={{
                fontSize: 68,
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                lineHeight: 1,
                color: "#E03C2F",
              }}
            >
              Walia
            </span>
          </div>
        </div>
        <p
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 22,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#A1A1AA",
          }}
        >
          Stories That Move You
        </p>
      </div>
    ),
    { ...size }
  );
}
