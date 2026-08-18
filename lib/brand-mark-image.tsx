import {
  BRAND_RED,
  BRAND_RED_DARK,
  BRAND_RED_LIGHT,
  MARK_FRAME,
  MARK_PLAY,
} from "@/lib/brand-mark-paths";

/** Flat ReelWalia play mark — same geometry as FlatReelWaliaMarkSvg. */
export function BrandMarkSvg({
  width,
  height,
  premium = false,
}: {
  width: number;
  height: number;
  premium?: boolean;
}) {
  const { x, y, width: fw, height: fh, rx } = MARK_FRAME;

  if (!premium) {
    return (
      <svg
        width={width}
        height={height}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect x={x} y={y} width={fw} height={fh} rx={rx} fill={BRAND_RED} />
        <path d={MARK_PLAY} fill="#FFFFFF" />
      </svg>
    );
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="mark-body" x1="24" y1={y} x2="24" y2={y + fh}>
          <stop offset="0%" stopColor={BRAND_RED_LIGHT} />
          <stop offset="42%" stopColor={BRAND_RED} />
          <stop offset="100%" stopColor={BRAND_RED_DARK} />
        </linearGradient>
        <linearGradient id="mark-shine" x1="24" y1={y} x2="24" y2={y + fh * 0.55}>
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="mark-play" x1="18" y1="14" x2="36" y2="34">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E2E2" />
        </linearGradient>
      </defs>
      <rect x={x} y={y} width={fw} height={fh} rx={rx} fill="url(#mark-body)" />
      <rect x={x} y={y} width={fw} height={fh} rx={rx} fill="url(#mark-shine)" />
      <path d={MARK_PLAY} fill="url(#mark-play)" />
    </svg>
  );
}
