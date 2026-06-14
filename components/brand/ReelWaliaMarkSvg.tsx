"use client";

import { useId } from "react";
import {
  BRAND_RED,
  BRAND_RED_DARK,
  BRAND_RED_LIGHT,
  MARK_FRAME,
  MARK_PLAY,
} from "@/lib/brand-mark-paths";

export type MarkRenderMode = "premium" | "flat";

interface MarkSvgProps {
  className?: string;
  title?: string;
}

/** Simplified flat mark for favicons and sub-40px rendering. */
export function FlatReelWaliaMarkSvg({
  className = "",
  title = "ReelWalia",
}: MarkSvgProps) {
  const { x, y, width, height, rx } = MARK_FRAME;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
    >
      <title>{title}</title>
      <rect x={x} y={y} width={width} height={height} rx={rx} fill={BRAND_RED} />
      <path d={MARK_PLAY} fill="#FFFFFF" />
    </svg>
  );
}

/** Premium glossy mark — depth, highlights, metallic red body. */
export function PremiumReelWaliaMarkSvg({
  className = "",
  title = "ReelWalia",
}: MarkSvgProps) {
  const uid = useId().replace(/:/g, "");
  const { x, y, width, height, rx } = MARK_FRAME;
  const clipId = `${uid}-clip`;
  const bodyId = `${uid}-body`;
  const shineId = `${uid}-shine`;
  const depthId = `${uid}-depth`;
  const playId = `${uid}-play`;
  const shadowId = `${uid}-shadow`;

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label={title}
      shapeRendering="geometricPrecision"
    >
      <title>{title}</title>
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} rx={rx} />
        </clipPath>
        <linearGradient
          id={bodyId}
          x1="24"
          y1={y}
          x2="24"
          y2={y + height}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={BRAND_RED_LIGHT} />
          <stop offset="42%" stopColor={BRAND_RED} />
          <stop offset="100%" stopColor={BRAND_RED_DARK} />
        </linearGradient>
        <linearGradient
          id={shineId}
          x1="24"
          y1={y}
          x2="24"
          y2={y + height * 0.5}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.05" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={depthId}
          x1="24"
          y1={y + height * 0.5}
          x2="24"
          y2={y + height}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#000000" stopOpacity="0" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.16" />
        </linearGradient>
        <linearGradient
          id={playId}
          x1="18"
          y1="14"
          x2="36"
          y2="34"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E2E2" />
        </linearGradient>
        <filter
          id={shadowId}
          x="-15%"
          y="-15%"
          width="130%"
          height="130%"
          colorInterpolationFilters="sRGB"
        >
          <feDropShadow
            dx="0"
            dy="0.75"
            stdDeviation="0.55"
            floodColor="#000000"
            floodOpacity="0.24"
          />
        </filter>
      </defs>

      <ellipse cx="24" cy="46.5" rx="9.5" ry="1.1" fill="#000000" opacity="0.2" />

      <rect
        x={x - 0.5}
        y={y - 0.5}
        width={width + 1}
        height={height + 1}
        rx={rx + 0.5}
        fill="#140808"
      />

      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rx}
        fill={`url(#${bodyId})`}
      />

      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={rx}
        fill={`url(#${shineId})`}
      />

      <g clipPath={`url(#${clipId})`}>
        <rect
          x={x}
          y={y + height * 0.52}
          width={width}
          height={height * 0.48}
          fill={`url(#${depthId})`}
        />
      </g>

      <rect
        x={x + 2.5}
        y={y + 6}
        width={1}
        height={height - 12}
        rx={0.5}
        fill="#FFFFFF"
        opacity="0.11"
      />

      <path d={MARK_PLAY} fill={`url(#${playId})`} filter={`url(#${shadowId})`} />

      <ellipse
        cx="24"
        cy={y + height - 4}
        rx="7.5"
        ry="0.9"
        fill="#FFFFFF"
        opacity="0.09"
      />
    </svg>
  );
}

export function ReelWaliaMarkSvg({
  className = "",
  title = "ReelWalia",
  mode = "premium",
}: MarkSvgProps & { mode?: MarkRenderMode }) {
  if (mode === "flat") {
    return <FlatReelWaliaMarkSvg className={className} title={title} />;
  }
  return <PremiumReelWaliaMarkSvg className={className} title={title} />;
}
