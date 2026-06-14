import { BRAND_TAGLINE } from "@/lib/brand";
import { ReelWaliaMarkSvg } from "@/components/brand/ReelWaliaMarkSvg";

/** ReelWalia production mark — premium glossy stream pod. */
export function ReelWaliaMark({
  className = "h-8 w-8",
  title = "ReelWalia",
  mode = "premium",
}: {
  className?: string;
  title?: string;
  mode?: "premium" | "flat";
}) {
  return <ReelWaliaMarkSvg className={className} title={title} mode={mode} />;
}

export { PremiumReelWaliaMarkSvg, FlatReelWaliaMarkSvg } from "@/components/brand/ReelWaliaMarkSvg";

/** Horizontal cinematic wordmark: REEL (white) + WALIA (red). */
export function ReelWaliaWordmark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`rw-brand-wordmark font-display uppercase leading-[0.92] text-white ${className}`}
    >
      <span className="tracking-[0.045em]">Reel</span>
      <span className="text-obsidian-red tracking-[0.02em]"> Walia</span>
    </span>
  );
}

/** Premium tagline — readable tracking, sentence case. */
export function ReelWaliaTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`font-medium text-zinc-400 ${className}`}>{BRAND_TAGLINE}</p>
  );
}

/** Nav tagline — secondary to wordmark, sans-serif, light weight. */
export function ReelWaliaNavTagline({ className = "" }: { className?: string }) {
  return (
    <p className={`rw-brand-nav-tagline ${className}`}>{BRAND_TAGLINE}</p>
  );
}

export type BrandScale = "nav" | "footer" | "auth" | "loading";

const SCALE = {
  nav: {
    mark: "h-[3.4375rem] w-[3.4375rem] sm:h-[3.8125rem] sm:w-[3.8125rem]",
    wordmark: "text-[1.875rem] sm:text-[2.1875rem]",
    tagline: "text-[10px] sm:text-[11px]",
    lockupGap: "gap-3 sm:gap-3.5",
    stackedMarkGap: "mt-0",
    stackedWordmarkGap: "mt-0",
    stackedTaglineGap: "mt-0",
  },
  footer: {
    mark: "h-[4.5rem] w-[4.5rem] sm:h-[4.75rem] sm:w-[4.75rem]",
    wordmark: "text-[2rem] sm:text-[2.75rem] tracking-[0.02em]",
    tagline: "text-sm sm:text-base tracking-normal text-zinc-500",
    lockupGap: "gap-4 sm:gap-5",
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
    <div className={`rw-brand-lockup flex items-center ${s.lockupGap} ${className}`}>
      <ReelWaliaMark className={`${markSize} shrink-0`} />
      {scale === "nav" ? (
        <div className="rw-brand-lockup-text min-w-0">
          <ReelWaliaWordmark className={s.wordmark} />
          <ReelWaliaNavTagline className={s.tagline} />
        </div>
      ) : (
        <ReelWaliaWordmark className={s.wordmark} />
      )}
    </div>
  );
}
