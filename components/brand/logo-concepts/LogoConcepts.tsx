import type { LogoConcept, LogoConceptId } from "@/lib/brand-mark-paths";
import {
  BRAND_RED,
  MARK_FRAME,
  MARK_PLAY,
} from "@/lib/brand-mark-paths";
import { PremiumReelWaliaMarkSvg } from "@/components/brand/ReelWaliaMarkSvg";

const R = BRAND_RED;
const W = "#FFFFFF";

function PhoneStroke(props: { x: number; y: number; w: number; h: number; rx: number }) {
  const { x, y, w, h, rx } = props;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      fill="none"
      stroke={W}
      strokeWidth="2.5"
    />
  );
}

function PhoneFill(props: {
  x: number;
  y: number;
  w: number;
  h: number;
  rx: number;
  fill?: string;
  opacity?: number;
}) {
  const { x, y, w, h, rx, fill = W, opacity } = props;
  return (
    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={rx}
      fill={fill}
      opacity={opacity}
    />
  );
}

function Play(props: { d: string; fill?: string }) {
  return <path d={props.d} fill={props.fill ?? R} />;
}

function WhitePlay(props: { d: string }) {
  return <path d={props.d} fill={W} />;
}

export const HERO_PLAY = MARK_PLAY;

export const LOGO_CONCEPTS: LogoConcept[] = [
  {
    id: "wireframe-v1",
    label: "01 · Wireframe (previous)",
    description: "Stroke-only phone — reads as placeholder icon.",
  },
  {
    id: "hero-play-frame",
    label: "02 · Hero Play Frame",
    description: "Filled white device, oversized red play.",
  },
  {
    id: "red-stream-pod",
    label: "03 · Red Stream Pod Premium ★",
    description: "Glossy 3D capsule, hero play, metallic depth — production mark.",
    selected: true,
  },
  {
    id: "play-cutout",
    label: "04 · Play Cutout",
    description: "White phone with play punched through to black.",
  },
  {
    id: "play-body",
    label: "05 · Play Body",
    description: "Play triangle dominates; thin frame whispers phone.",
  },
  {
    id: "continuous-silhouette",
    label: "06 · Continuous Silhouette",
    description: "Single merged phone + play shape.",
  },
  {
    id: "floating-premium",
    label: "07 · Floating Premium",
    description: "Dark device slab, vivid play floating inside.",
  },
  {
    id: "minimal-ios",
    label: "08 · Minimal iOS",
    description: "Squircle device, home-indicator dot, bold play.",
  },
  {
    id: "film-hybrid",
    label: "09 · Film + Phone",
    description: "Vertical frame with subtle reel perforations.",
  },
  {
    id: "thick-frame",
    label: "10 · Thick Frame",
    description: "Bold white ring, red play center — vertical video frame.",
  },
  {
    id: "layered-depth",
    label: "11 · Layered Depth",
    description: "Offset white ghost + red device for dimension.",
  },
  {
    id: "squircle-device",
    label: "12 · Squircle Device",
    description: "Apple-like continuous curve, centered play.",
  },
  {
    id: "play-first",
    label: "13 · Play First",
    description: "Giant play; phone implied by vertical red backing.",
  },
  {
    id: "split-tone",
    label: "14 · Split Tone",
    description: "Half white device face, half red play energy.",
  },
  {
    id: "cinema-vertical",
    label: "15 · Cinema Vertical",
    description: "Letterbox bars + centered play — streaming cue.",
  },
];

function renderConcept(id: LogoConceptId) {
  switch (id) {
    case "wireframe-v1":
      return (
        <>
          <PhoneStroke x={14} y={5} w={20} h={38} rx={5} />
          <Play d="M21 17L21 31L33 24Z" />
          <path d="M19 9H25" stroke={R} strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "hero-play-frame":
      return (
        <>
          <PhoneFill x={10} y={2} w={28} h={44} rx={8} />
          <Play d="M18 12L18 36L38 24Z" />
        </>
      );
    case "red-stream-pod":
      return (
        <>
          <PhoneFill
            x={MARK_FRAME.x}
            y={MARK_FRAME.y}
            w={MARK_FRAME.width}
            h={MARK_FRAME.height}
            rx={MARK_FRAME.rx}
            fill={R}
          />
          <WhitePlay d={MARK_PLAY} />
        </>
      );
    case "play-cutout":
      return (
        <>
          <PhoneFill x={11} y={2} w={26} h={44} rx={8} />
          <path d="M19 13L19 35L37 24Z" fill="#000000" />
        </>
      );
    case "play-body":
      return (
        <>
          <PhoneStroke x={12} y={3} w={24} h={42} rx={7} />
          <Play d="M16 10L16 38L40 24Z" />
        </>
      );
    case "continuous-silhouette":
      return (
        <path
          d="M24 2C15 2 11 6 11 14V34C11 42 15 46 24 46C33 46 37 42 37 34V14C37 6 33 2 24 2ZM20 14L20 34L34 24L20 14Z"
          fill={R}
        />
      );
    case "floating-premium":
      return (
        <>
          <PhoneFill x={11} y={3} w={26} h={42} rx={8} fill="#1A1A1A" />
          <rect x={13} y={5} width={22} height={38} rx={6} fill="#0A0A0A" />
          <Play d="M19 14L19 34L36 24Z" />
        </>
      );
    case "minimal-ios":
      return (
        <>
          <PhoneFill x={11} y={2} w={26} h={44} rx={10} />
          <Play d="M19 13L19 35L37 24Z" />
          <rect x={21} y={40} width={6} height={2} rx={1} fill="#000000" opacity={0.2} />
        </>
      );
    case "film-hybrid":
      return (
        <>
          <PhoneFill x={12} y={2} w={24} h={44} rx={6} fill="#111" />
          <rect x={9} y={8} width={3} height={4} rx={0.5} fill={W} opacity={0.35} />
          <rect x={9} y={16} width={3} height={4} rx={0.5} fill={W} opacity={0.35} />
          <rect x={36} y={8} width={3} height={4} rx={0.5} fill={W} opacity={0.35} />
          <rect x={36} y={16} width={3} height={4} rx={0.5} fill={W} opacity={0.35} />
          <Play d="M19 14L19 34L35 24Z" />
        </>
      );
    case "thick-frame":
      return (
        <>
          <rect x={9} y={1} width={30} height={46} rx={9} fill={W} />
          <rect x={13} y={5} width={22} height={38} rx={6} fill="#000" />
          <Play d="M19 14L19 34L35 24Z" />
        </>
      );
    case "layered-depth":
      return (
        <>
          <PhoneFill x={13} y={4} w={26} h={44} rx={8} fill={W} opacity={0.25} />
          <PhoneFill x={10} y={2} w={26} h={44} rx={8} fill={R} />
          <WhitePlay d="M18 13L18 35L36 24Z" />
        </>
      );
    case "squircle-device":
      return (
        <>
          <rect x={10} y={2} width={28} height={44} rx={12} fill={W} />
          <Play d="M19 13L19 35L37 24Z" />
        </>
      );
    case "play-first":
      return (
        <>
          <rect x={14} y={6} width={20} height={36} rx={10} fill={R} opacity={0.35} />
          <WhitePlay d="M17 11L17 37L41 24Z" />
        </>
      );
    case "split-tone":
      return (
        <>
          <defs>
            <clipPath id="split-left">
              <rect x={11} y={2} width={13} height={44} rx={8} />
            </clipPath>
          </defs>
          <PhoneFill x={11} y={2} w={26} h={44} rx={8} fill="#222" />
          <g clipPath="url(#split-left)">
            <PhoneFill x={11} y={2} w={26} h={44} rx={8} />
          </g>
          <Play d="M22 13L22 35L38 24Z" />
        </>
      );
    case "cinema-vertical":
      return (
        <>
          <rect x={8} y={0} width={32} height={48} fill="#111" />
          <rect x={11} y={6} width={26} height={36} rx={4} fill="#000" />
          <Play d="M19 16L19 32L33 24Z" />
          <rect x={8} y={0} width={32} height={5} fill={W} opacity={0.12} />
          <rect x={8} y={43} width={32} height={5} fill={W} opacity={0.12} />
        </>
      );
    default:
      return null;
  }
}

export function ConceptMark({
  concept,
  size,
  className = "",
}: {
  concept: LogoConcept;
  size: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={concept.label}
      shapeRendering="geometricPrecision"
    >
      {renderConcept(concept.id)}
    </svg>
  );
}

export function ProductionMarkSvg({
  className = "",
  title = "ReelWalia",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <PremiumReelWaliaMarkSvg className={className} title={title} />
  );
}
