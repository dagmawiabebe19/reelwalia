import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ComingSoon } from "@/components/home/ComingSoon";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SeriesRow } from "@/components/home/SeriesRow";
import { createClient } from "@/lib/supabase/server";

async function getCatalog() {
  const supabase = createClient();

  const [{ data: featured }, { data: recent }, { data: trending }] =
    await Promise.all([
      supabase
        .from("series")
        .select("id, title, slug, tagline, banner_url, poster_url, genre")
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
    ]);

  const featuredItems = featured ?? [];
  const newSeries = recent ?? [];
  const trendingSeries = trending ?? [];
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

  return { featuredWithEpisodes, newSeries, trendingSeries, isEmpty };
}

export default async function HomePage() {
  const { featuredWithEpisodes, newSeries, trendingSeries, isEmpty } =
    await getCatalog();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-12 px-4 py-8 sm:px-6">
        {isEmpty ? (
          <ComingSoon />
        ) : (
          <>
            {featuredWithEpisodes.length > 0 && (
              <HeroCarousel items={featuredWithEpisodes} />
            )}
            {newSeries.length > 0 && (
              <SeriesRow title="New Series" series={newSeries} />
            )}
            {trendingSeries.length > 0 && (
              <SeriesRow title="Trending" series={trendingSeries} />
            )}
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
