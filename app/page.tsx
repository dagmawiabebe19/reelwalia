import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ComingSoon } from "@/components/home/ComingSoon";
import { ComingSoonRow } from "@/components/home/ComingSoonRow";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SeriesRow } from "@/components/home/SeriesRow";
import { filterPublishedCatalogRows } from "@/lib/coming-soon";
import { createClient } from "@/lib/supabase/server";

async function getCatalog() {
  const supabase = createClient();

  const [{ data: featured }, { data: recent }, { data: trending }, { data: comingSoon }] =
    await Promise.all([
      supabase
        .from("series")
        .select(
          "id, title, slug, tagline, description, banner_url, poster_url, genre"
        )
        .eq("status", "published")
        .eq("is_featured", true)
        .order("featured_order", { ascending: true, nullsFirst: false })
        .limit(3),
      supabase
        .from("series")
        .select("id, title, slug, tagline, poster_url, genre, status")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(12),
      supabase
        .from("series")
        .select("id, title, slug, tagline, poster_url, genre, status")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(12),
      supabase
        .from("series")
        .select("id, title, slug, description, poster_url, genre, status, created_at")
        .eq("status", "coming_soon")
        .order("created_at", { ascending: false }),
    ]);

  // Featured query is already constrained to published + is_featured.
  // Avoid applying the coming-soon slug fallback filter here, which can
  // incorrectly hide valid published featured series (e.g. crown-of-ashes).
  const featuredItems = featured ?? [];
  const newSeries = filterPublishedCatalogRows(recent ?? []);
  const trendingSeries = filterPublishedCatalogRows(trending ?? []);
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

  const comingSoonList = comingSoon ?? [];

  return {
    featuredWithEpisodes,
    newSeries,
    trendingSeries,
    comingSoon: comingSoonList,
    isEmpty,
  };
}

export default async function HomePage() {
  const { featuredWithEpisodes, newSeries, trendingSeries, comingSoon, isEmpty } =
    await getCatalog();

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
            {/* Catalog order: Hero → Trending Now → Coming Soon → New Series */}
            {featuredWithEpisodes.length > 0 && (
              <HeroCarousel items={featuredWithEpisodes} />
            )}
            {trendingSeries.length > 0 && (
              <SeriesRow title="Trending Now" series={trendingSeries} />
            )}
            {comingSoon.length > 0 && <ComingSoonRow series={comingSoon} />}
            {newSeries.length > 0 && (
              <SeriesRow title="New Series" series={newSeries} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
