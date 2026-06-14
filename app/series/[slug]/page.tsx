import Link from "next/link";
import { notFound } from "next/navigation";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { WatchlistButton } from "@/components/series/WatchlistButton";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { canWatchEpisode } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

interface SeriesPageProps {
  params: { slug: string };
}

async function getSeries(slug: string) {
  const supabase = createClient();

  const { data: series } = await supabase
    .from("series")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();

  if (!series) return null;

  const { data: episodes } = await supabase
    .from("episodes")
    .select("id, episode_number, title, thumbnail_url, duration_seconds, is_free")
    .eq("series_id", series.id)
    .order("episode_number", { ascending: true });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  let inWatchlist = false;

  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = p;

    const { data: wl } = await supabase
      .from("watchlist")
      .select("id")
      .eq("user_id", user.id)
      .eq("series_id", series.id)
      .maybeSingle();
    inWatchlist = !!wl;
  }

  const freeCount = series.free_episode_count ?? 5;
  const episodesWithLock = (episodes ?? []).map((ep) => ({
    ...ep,
    locked: !canWatchEpisode(ep.episode_number, freeCount, profile),
    is_free: ep.episode_number <= freeCount,
  }));

  return {
    series,
    episodes: episodesWithLock,
    inWatchlist,
  };
}

export default async function SeriesPage({ params }: SeriesPageProps) {
  const { slug } = params;
  const data = await getSeries(slug);

  if (!data) notFound();

  const { series, episodes, inWatchlist } = data;
  const firstEpisode = episodes[0];

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-x-hidden px-4 py-8 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <Card className="mx-auto aspect-[2/3] w-full max-w-xs overflow-hidden lg:max-w-none">
            {series.poster_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={series.poster_url}
                alt={series.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-end bg-gradient-to-b from-zinc-900 to-black p-4">
                <p className="font-display text-2xl uppercase">{series.title}</p>
              </div>
            )}
          </Card>

          <div>
            {series.genre?.length > 0 && (
              <p className="text-xs font-medium uppercase tracking-widest text-obsidian-red">
                {series.genre.join(" · ")}
              </p>
            )}
            <h1 className="mt-2 font-display text-3xl uppercase sm:text-5xl">
              {series.title}
            </h1>
            {series.tagline && (
              <p className="mt-2 text-base text-gray-400 sm:text-lg">{series.tagline}</p>
            )}
            {series.description && (
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-400">
                {series.description}
              </p>
            )}
            <p className="mt-2 text-sm text-gray-500">
              {series.view_count.toLocaleString()} views
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              {firstEpisode && (
                <Button href={`/watch/${firstEpisode.id}`}>Watch Now</Button>
              )}
              <WatchlistButton seriesId={series.id} initialInWatchlist={inWatchlist} />
            </div>

            <section className="mt-10">
              <h2 className="font-display text-xl uppercase">Episodes</h2>
              {!episodes.length ? (
                <p className="mt-4 text-sm text-gray-400">No episodes yet.</p>
              ) : (
                <ul className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {episodes.map((ep) => (
                    <li key={ep.id}>
                      <Link
                        href={`/watch/${ep.id}`}
                        className="group block min-h-11 transition hover:opacity-90"
                      >
                        <div className="relative aspect-[9/16] overflow-hidden rounded-lg border border-white/[0.08] bg-zinc-900">
                          {ep.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={ep.thumbnail_url}
                              alt={`Episode ${ep.episode_number}`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-lg font-semibold text-gray-500">
                              {ep.episode_number}
                            </div>
                          )}
                          <span className="absolute left-2 top-2 rounded-full bg-black/75 px-2 py-0.5 text-xs font-semibold text-white">
                            {ep.episode_number}
                          </span>
                          {ep.is_free ? (
                            <span className="absolute right-2 top-2 text-xs font-medium uppercase text-obsidian-red">
                              Free
                            </span>
                          ) : ep.locked ? (
                            <span className="absolute right-2 top-2 rounded bg-black/70 p-1">
                              <svg
                                viewBox="0 0 16 16"
                                className="h-3 w-3 text-gray-300"
                                fill="currentColor"
                              >
                                <path d="M11 7V5a3 3 0 00-6 0v2H4a1 1 0 00-1 1v5a1 1 0 001 1h8a1 1 0 001-1V8a1 1 0 00-1-1h-1zm-2 0H7V5a1.5 1.5 0 013 0v2z" />
                              </svg>
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1.5 text-xs text-gray-400">
                          Episode {ep.episode_number}
                        </p>
                        <p className="line-clamp-2 text-sm font-medium">{ep.title}</p>
                        {ep.duration_seconds != null && ep.duration_seconds > 0 && (
                          <p className="text-xs text-gray-500">
                            {Math.floor(ep.duration_seconds / 60)}:
                            {String(ep.duration_seconds % 60).padStart(2, "0")}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
