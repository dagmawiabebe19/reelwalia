import { formatViewCount } from "@/lib/format";

interface WatchSeriesInfoProps {
  title: string;
  genres: string[];
  totalViews: number;
  description: string | null;
  className?: string;
}

export function WatchSeriesInfo({
  title,
  genres,
  totalViews,
  description,
  className = "",
}: WatchSeriesInfoProps) {
  const formattedTotal = formatViewCount(totalViews);

  return (
    <section className={`mt-6 w-full max-w-md space-y-3 lg:max-w-none ${className}`}>
      <h2 className="font-display text-2xl uppercase tracking-wide text-white">
        {title}
      </h2>

      {genres.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {genres.map((genre) => (
            <span
              key={genre}
              className="rounded-full border border-obsidian-red/40 px-2 py-0.5 text-xs uppercase tracking-wide text-obsidian-red"
            >
              {genre}
            </span>
          ))}
        </div>
      )}

      {formattedTotal && (
        <p className="text-sm text-gray-400">{formattedTotal} views</p>
      )}

      {description && (
        <p className="max-w-2xl text-sm leading-relaxed text-gray-300">
          {description}
        </p>
      )}
    </section>
  );
}
