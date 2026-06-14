import { BRAND_TAGLINE_UPPER } from "@/lib/brand";

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
      {/* Vertical reel frame — optically centered with equal inset */}
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
      {/* Play triangle — slightly right of geometric center for optical balance */}
      <path
        d="M21 17V31L33 24L21 17Z"
        fill="#E03C2F"
      />
      {/* Reel accent notch — centered on frame top edge */}
      <path
        d="M19 9H25"
        stroke="#E03C2F"
        strokeWidth="2.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

type LogoVariant = "mark" | "wordmark" | "lockup" | "lockup-tagline";

interface ReelWaliaLogoProps {
  variant?: LogoVariant;
  className?: string;
  markClassName?: string;
}

function StackedWordmark({ compact = false }: { compact?: boolean }) {
  const size = compact
    ? "text-[0.8125rem] sm:text-[0.875rem]"
    : "text-[0.95rem] sm:text-base";

  return (
    <span
      className={`font-display uppercase leading-[0.88] tracking-[0.14em] text-white ${size}`}
    >
      <span className="block">Reel</span>
      <span className="block text-obsidian-red">Walia</span>
    </span>
  );
}

function Tagline({ className = "" }: { className?: string }) {
  return (
    <p
      className={`text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-400 sm:text-xs ${className}`}
    >
      {BRAND_TAGLINE_UPPER}
    </p>
  );
}

export function ReelWaliaLogo({
  variant = "lockup",
  className = "",
  markClassName = "h-9 w-9 shrink-0",
}: ReelWaliaLogoProps) {
  if (variant === "mark") {
    return <ReelWaliaMark className={markClassName} />;
  }

  if (variant === "wordmark") {
    return (
      <span className={className}>
        <StackedWordmark />
      </span>
    );
  }

  if (variant === "lockup-tagline") {
    return (
      <div className={`flex flex-col items-center gap-3 ${className}`}>
        <div className="flex items-center gap-3">
          <ReelWaliaMark className={markClassName} />
          <StackedWordmark />
        </div>
        <Tagline />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-2.5 ${className}`}>
      <ReelWaliaMark className={markClassName} />
      <StackedWordmark compact />
    </div>
  );
}
