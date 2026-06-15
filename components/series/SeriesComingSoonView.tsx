import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import {
  formatGenreLabel,
  getComingSoonPosterClass,
} from "@/lib/coming-soon-poster";
import type { Series } from "@/lib/types/database";

interface SeriesComingSoonViewProps {
  series: Pick<
    Series,
    "title" | "slug" | "description" | "genre" | "poster_url"
  >;
}

export function SeriesComingSoonView({ series }: SeriesComingSoonViewProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center px-4 py-10 text-center sm:px-6 sm:py-14">
        <div
          className={`relative aspect-[9/16] w-full max-w-xs overflow-hidden rounded-xl border border-white/10 ${series.poster_url ? "" : getComingSoonPosterClass(series.genre)}`}
        >
          {series.poster_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={series.poster_url}
              alt=""
              className="h-full w-full object-cover opacity-90"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center p-6">
              <p className="font-display text-2xl uppercase leading-tight tracking-wide text-white">
                {series.title}
              </p>
            </div>
          )}
          <span className="absolute right-3 top-3 rounded-full bg-obsidian-red px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
            Coming Soon
          </span>
        </div>

        <p className="mt-6 text-xs uppercase tracking-wide text-obsidian-red">
          {formatGenreLabel(series.genre)}
        </p>
        <h1 className="mt-2 font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
          {series.title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-gray-300">
          Coming soon to ReelWalia. This series is in development at Walia Studios.
        </p>
        {series.description && (
          <p className="mt-4 max-w-md text-sm leading-relaxed text-gray-400">
            {series.description}
          </p>
        )}
        <Link
          href="/"
          className="rw-btn-secondary mt-8 inline-flex min-h-11 items-center"
        >
          Back to Home
        </Link>
      </main>
      <Footer />
    </div>
  );
}
