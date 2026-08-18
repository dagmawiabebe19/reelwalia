import { ImageResponse } from "next/og";
import { BrandMarkSvg } from "@/lib/brand-mark-image";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#000000",
        }}
      >
        <BrandMarkSvg width={28} height={28} />
      </div>
    ),
    { ...size }
  );
}
