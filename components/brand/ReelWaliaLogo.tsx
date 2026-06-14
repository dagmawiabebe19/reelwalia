import { BRAND_TAGLINE } from "@/lib/brand";

/** ReelWalia logo mark — concept #13: vertical frame + play triangle. */
export function ReelWaliaMark({
  className = "h-8 w-8",
  title = "ReelWalia",
}: {
  className?: string;
  title?: string;
}) {
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
      <rect
        x="14"
        y="5"
        width="20"
        height="38"
        rx="5"
        stroke="currentColor"
        strokeWidth="2.75"
        className="text-white"
      />
      <path d="M21 17V31L33 24L21 17Z" fill="#E03C2F" />
      <path
        d="M19 9H25"
        stroke="#E03C2F"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Horizontal cinematic wordmark: REEL (white) + WALIA (red). */
export function ReelWaliaWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`font-display uppercase leading-none text-white ${className}`}
    >
      Reel<span className="text-obsidian-red"> Walia</span>
    </span>
  );
}

/** Premium tagline — readable tracking, sentence case. */
export function ReelWaliaTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`font-medium text-zinc-400 ${className}`}>{BRAND_TAGLINE}</p>
  );
}

export type BrandScale = "nav" | "footer" | "auth" | "loading";

const SCALE = {
  nav: {
    mark: "h-11 w-11 sm:h-12 sm:w-12",
    wordmark: "text-[1.5rem] sm:text-[1.75rem] tracking-[0.03em]",
    tagline: "text-xs sm:text-sm tracking-normal",
    lockupGap: "gap-3 sm:gap-3.5",
    stackedMarkGap: "mt-0",
    stackedWordmarkGap: "mt-0",
    stackedTaglineGap: "mt-0",
  },
  footer: {
    mark: "h-[4.5rem] w-[4.5rem] sm:h-20 sm:w-20",
    wordmark: "text-[2rem] sm:text-[2.75rem] tracking-[0.025em]",
    tagline: "text-sm sm:text-base tracking-normal text-zinc-500",
    lockupGap: "gap-4",
    stackedMarkGap: "mt-0",
    stackedWordmarkGap: "mt-6 sm:mt-7",
    stackedTaglineGap: "mt-2.5 sm:mt-3",
  },
  auth: {
    mark: "h-14 w-14 sm:h-16 sm:w-16",
    wordmark: "text-[1.75rem] sm:text-[2.125rem] tracking-[0.03em]",
    tagline: "text-sm tracking-normal text-zinc-500",
    lockupGap: "gap-3.5",
    stackedMarkGap: "mt-0",
    stackedWordmarkGap: "mt-5 sm:mt-6",
    stackedTaglineGap: "mt-2 sm:mt-2.5",
  },
  loading: {
    mark: "h-12 w-12 sm:h-14 sm:w-14",
    wordmark: "text-xl sm:text-2xl tracking-[0.03em]",
    tagline: "text-sm tracking-normal text-zinc-500",
    lockupGap: "gap-3.5",
    stackedMarkGap: "mt-0",
    stackedWordmarkGap: "mt-4",
    stackedTaglineGap: "mt-2",
  },
} as const;

type LogoVariant = "mark" | "wordmark" | "lockup" | "stacked" | "lockup-tagline";

interface ReelWaliaLogoProps {
  variant?: LogoVariant;
  /** Preset sizing for nav, footer, auth screens, and loading states. */
  scale?: BrandScale;
  className?: string;
  /** Override mark size when needed. */
  markClassName?: string;
}

export function ReelWaliaLogo({
  variant = "lockup",
  scale = "nav",
  className = "",
  markClassName,
}: ReelWaliaLogoProps) {
  const s = SCALE[scale];
  const markSize = markClassName ?? s.mark;

  if (variant === "mark") {
    return <ReelWaliaMark className={markSize} />;
  }

  if (variant === "wordmark") {
    return (
      <ReelWaliaWordmark className={`${s.wordmark} ${className}`} />
    );
  }

  const stackedVariant = variant === "stacked" || variant === "lockup-tagline";

  if (stackedVariant) {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <ReelWaliaMark className={markSize} />
        <ReelWaliaWordmark
          className={`${s.wordmark} ${s.stackedWordmarkGap}`}
        />
        <ReelWaliaTagline
          className={`${s.tagline} ${s.stackedTaglineGap}`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center ${s.lockupGap} ${className}`}>
      <ReelWaliaMark className={`${markSize} shrink-0`} />
      <ReelWaliaWordmark className={s.wordmark} />
    </div>
  );
}
