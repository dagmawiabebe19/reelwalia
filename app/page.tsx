import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ComingSoon } from "@/components/home/ComingSoon";
import { ComingSoonRow } from "@/components/home/ComingSoonRow";
import { ContinueWatchingRow } from "@/components/home/ContinueWatchingRow";
import type { ContinueWatchingItem } from "@/components/home/ContinueWatchingRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SeriesRow } from "@/components/home/SeriesRow";
import {
  COMING_SOON_SLUGS,
  filterPublishedCatalogRows,
  isComingSoonSeries,
} from "@/lib/coming-soon";
import { createClient } from "@/lib/supabase/server";

async function getCatalog() {
  const supabase = createClient();

  const [
    { data: featured },
    { data: recent },
    { data: trending },
    { data: editorsPicks },
    { data: allPublished },
    { data: comingSoon },
    {
      data: { user },
    },
  ] = await Promise.all([
    supabase
      .from("series")
      .select("id, title, slug, tagline, description, banner_url, poster_url, genre")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("featured_order", { ascending: true, nullsFirst: false })
      .limit(3),
    supabase
      .from("series")
      .select("id, title, slug, tagline, poster_url, genre")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("series")
      .select("id, title, slug, tagline, poster_url, genre")
      .eq("status", "published")
      .order("view_count", { ascending: false })
      .limit(12),
    supabase
      .from("series")
      .select("id, title, slug, tagline, poster_url, genre")
      .eq("status", "published")
      .eq("is_featured", true)
      .order("featured_order", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from("series")
      .select("id, title, slug, tagline, poster_url, genre")
      .eq("status", "published")
      .order("title", { ascending: true })
      .limit(12),
    supabase
      .from("series")
      .select("id, title, slug, description, poster_url, genre")
      .eq("status", "coming_soon")
      .order("title", { ascending: true }),
    supabase.auth.getUser(),
  ]);

  const featuredItems = filterPublishedCatalogRows(featured ?? []);
  const newSeries = filterPublishedCatalogRows(recent ?? []);
  const trendingSeries = filterPublishedCatalogRows(trending ?? []);
  const editorsPicksList = filterPublishedCatalogRows(editorsPicks ?? []);
  const allPublishedFiltered = filterPublishedCatalogRows(allPublished ?? []);

  const comingSoonByStatus = comingSoon ?? [];
  const { data: comingSoonBySlug } = await supabase
    .from("series")
    .select("id, title, slug, description, poster_url, genre, status")
    .in("slug", [...COMING_SOON_SLUGS]);

  const comingSoonMap = new Map<string, (typeof comingSoonByStatus)[number]>();
  for (const item of comingSoonByStatus) {
    comingSoonMap.set(item.slug, item);
  }
  for (const item of comingSoonBySlug ?? []) {
    if (isComingSoonSeries(item) && !comingSoonMap.has(item.slug)) {
      comingSoonMap.set(item.slug, item);
    }
  }
  const comingSoonList = Array.from(comingSoonMap.values()).sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  const isEmpty =
    featuredItems.length === 0 &&
    newSeries.length === 0 &&
    trendingSeries.length === 0;

  let featuredWithEpisodes = featuredItems.map((item) => ({
    ...item,
    firstEpisodeId: null as string | null,
  }));

  if (featuredItems.length > 0) {
    const { data: episodes } = await supabase
      .from("episodes")
      .select("id, series_id, episode_number")
      .in(
        "series_id",
        featuredItems.map((s) => s.id)
      )
      .order("episode_number", { ascending: true });

    const firstBySeries = new Map<string, string>();
    for (const ep of episodes ?? []) {
      if (!firstBySeries.has(ep.series_id)) {
        firstBySeries.set(ep.series_id, ep.id);
      }
    }

    featuredWithEpisodes = featuredItems.map((item) => ({
      ...item,
      firstEpisodeId: firstBySeries.get(item.id) ?? null,
    }));
  }

  let continueWatching: ContinueWatchingItem[] = [];

  if (user) {
    const { data: history } = await supabase
      .from("watch_history")
      .select(
        `
        progress_seconds,
        completed,
        last_watched_at,
        episodes (
          id,
          episode_number,
          thumbnail_url,
          duration_seconds,
          series (
            title,
            slug,
            poster_url
          )
        )
      `
      )
      .eq("user_id", user.id)
      .eq("completed", false)
      .order("last_watched_at", { ascending: false })
      .limit(12);

    const rows: ContinueWatchingItem[] = [];
    for (const row of history ?? []) {
      const rawEp = row.episodes;
      const epRecord = Array.isArray(rawEp) ? rawEp[0] : rawEp;
      if (!epRecord || typeof epRecord !== "object") continue;

      const rawSeries = (epRecord as { series?: unknown }).series;
      const seriesRecord = Array.isArray(rawSeries) ? rawSeries[0] : rawSeries;
      if (!seriesRecord || typeof seriesRecord !== "object") continue;

      const ep = epRecord as {
        id: string;
        episode_number: number;
        thumbnail_url: string | null;
        duration_seconds: number | null;
      };
      const series = seriesRecord as {
        title: string;
        slug: string;
        poster_url: string | null;
      };

      rows.push({
        episodeId: ep.id,
        episodeNumber: ep.episode_number,
        thumbnailUrl: ep.thumbnail_url,
        posterUrl: series.poster_url,
        seriesTitle: series.title,
        seriesSlug: series.slug,
        progressSeconds: row.progress_seconds ?? 0,
        durationSeconds: ep.duration_seconds,
      });
    }
    continueWatching = rows;
  }

  const recommended = [...allPublishedFiltered].reverse();

  return {
    featuredWithEpisodes,
    newSeries,
    trendingSeries,
    editorsPicks: editorsPicksList,
    recommended,
    comingSoon: comingSoonList,
    continueWatching,
    isEmpty,
  };
}

export default async function HomePage() {
  const {
    featuredWithEpisodes,
    newSeries,
    trendingSeries,
    editorsPicks,
    recommended,
    comingSoon,
    continueWatching,
    isEmpty,
  } = await getCatalog();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-11 px-4 py-6 sm:space-y-14 sm:px-6 sm:py-10">
        {isEmpty ? (
          <>
            <ComingSoon />
            {comingSoon.length > 0 && <ComingSoonRow series={comingSoon} />}
          </>
        ) : (
          <>
            {featuredWithEpisodes.length > 0 && (
              <HeroCarousel items={featuredWithEpisodes} />
            )}
            {comingSoon.length > 0 && <ComingSoonRow series={comingSoon} />}
            {continueWatching.length > 0 && (
              <ContinueWatchingRow items={continueWatching} />
            )}
            {trendingSeries.length > 0 && (
              <SeriesRow title="Trending Now" series={trendingSeries} />
            )}
            {editorsPicks.length > 0 && (
              <SeriesRow title="Editor's Picks" series={editorsPicks} />
            )}
            {newSeries.length > 0 && (
              <SeriesRow title="New Series" series={newSeries} />
            )}
            {recommended.length > 0 && (
              <SeriesRow title="Recommended For You" series={recommended} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
