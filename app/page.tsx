import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SeriesRow } from "@/components/home/SeriesRow";
import { createClient } from "@/lib/supabase/server";
import { PLACEHOLDER_SERIES } from "@/lib/types/database";

async function getCatalog() {
  const supabase = createClient();

  const [{ data: featured }, { data: recent }, { data: trending }] =
    await Promise.all([
      supabase
        .from("series")
        .select("id, title, slug, tagline, banner_url, poster_url, genre")
        .eq("status", "published")
        .eq("is_featured", true)
        .order("featured_order", { ascending: true })
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

  const featuredItems =
    featured && featured.length > 0 ? featured : PLACEHOLDER_SERIES.slice(0, 3);
  const newSeries =
    recent && recent.length > 0 ? recent : PLACEHOLDER_SERIES.slice(0, 6);
  const trendingSeries =
    trending && trending.length > 0 ? trending : PLACEHOLDER_SERIES.slice(3, 9);

  return { featuredItems, newSeries, trendingSeries };
}

export default async function HomePage() {
  const { featuredItems, newSeries, trendingSeries } = await getCatalog();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-12 px-4 py-8 sm:px-6">
        <HeroCarousel items={featuredItems} />
        <SeriesRow title="New Series" series={newSeries} />
        <SeriesRow title="Trending" series={trendingSeries} />
      </main>
      <Footer />
    </div>
  );
}
