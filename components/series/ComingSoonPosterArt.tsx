import { ComingSoonBadge } from "@/components/series/ComingSoonBadge";
import {
  formatGenreLabel,
  getComingSoonPosterClass,
  getPrimaryGenrePillClass,
} from "@/lib/coming-soon-poster";

interface ComingSoonPosterArtProps {
  title: string;
  genres: string[];
  badgeSize?: "sm" | "md";
  titleClassName?: string;
  badgeClassName?: string;
}

export function ComingSoonPosterArt({
  title,
  genres,
  badgeSize = "sm",
  titleClassName = "text-base sm:text-lg",
  badgeClassName = "absolute left-2 top-2 z-10",
}: ComingSoonPosterArtProps) {
  return (
    <div
      className={`relative flex h-full w-full flex-col ${getComingSoonPosterClass(genres)}`}
    >
      <ComingSoonBadge
        size={badgeSize}
        className={badgeClassName}
      />
      <div className="flex flex-1 items-center justify-center px-4 py-6">
        <p
          className={`text-center font-display uppercase leading-tight tracking-wide text-white ${titleClassName}`}
        >
          {title}
        </p>
      </div>
      <div className="p-3 pt-0">
        <span
          className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${getPrimaryGenrePillClass(genres)}`}
        >
          {formatGenreLabel(genres)}
        </span>
      </div>
    </div>
  );
}
