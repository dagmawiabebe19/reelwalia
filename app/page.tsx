import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { ComingSoon } from "@/components/home/ComingSoon";
import { ComingSoonRow } from "@/components/home/ComingSoonRow";
import { CharacterChatPromo } from "@/components/home/CharacterChatPromo";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { SeriesRow } from "@/components/home/SeriesRow";
import { SubtitlesPromoStrip } from "@/components/home/SubtitlesPromoStrip";
import { filterPublishedCatalogRows } from "@/lib/coming-soon";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Prefer EP1-safe voice lines; skip later-episode name-drops. */
function pickPromoTeaser(
  speechExamples: unknown,
  catchphrases: unknown
): string | null {
  const spoilerHint =
    /\b(rhys|morwenna|throne|seraphine|episode\s*[2-9]|ep\s*[2-9])\b/i;

  type SpeechExample = { register?: string; line?: string };
  const examples = Array.isArray(speechExamples)
    ? (speechExamples as SpeechExample[])
        .map((e) => ({
          register: typeof e?.register === "string" ? e.register : "",
          line: typeof e?.line === "string" ? e.line.trim() : "",
        }))
        .filter((e) => e.line && !spoilerHint.test(e.line))
    : [];

  const byRegister = (...patterns: RegExp[]) =>
    examples.find((e) => patterns.some((p) => p.test(e.register)));

  // Prefer intrigue over polite court register for the homepage tease
  const preferred =
    byRegister(/private|confiding/i) ??
    byRegister(/blade/i) ??
    byRegister(/court|perfect bride/i) ??
    examples[0];

  let line: string | null = preferred?.line ?? null;
  if (!line && Array.isArray(catchphrases)) {
    const phrase = catchphrases.find(
      (p): p is string => typeof p === "string" && !!p.trim() && !spoilerHint.test(p)
    );
    line = phrase ? phrase.trim() : null;
  }
  if (!line) return null;

  // First sentence only — punchy promo length
  const firstSentence = line.split(/(?<=[.!?])\s+/)[0]?.trim() ?? line;
  // Soften long knife metaphor to the hook the visitor will feel
  const knifeHook = firstSentence.match(/^(Every smile in this room is a knife)\b/i);
  if (knifeHook) return knifeHook[1];

  return firstSentence.length > 110
    ? `${firstSentence.slice(0, 107).trimEnd()}…`
    : firstSentence.replace(/\.$/, "");
}

async function getChatPromoCharacters() {
  try {
    // Service role: homepage must tease characters for signed-out visitors
    // (characters table is authenticated-only via RLS).
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("characters")
      .select(
        "id, name, avatar_url, is_active, series:series_id!inner(title, slug, status), bible:character_bible(speech_examples, catchphrases)"
      )
      .eq("is_active", true)
      .eq("series.status", "published")
      .order("name", { ascending: true })
      .limit(6);

    if (error || !data?.length) return [];

    type SeriesJoin = { title: string; slug: string; status: string };
    type BibleJoin = {
      speech_examples: unknown;
      catchphrases: unknown;
    };
    const mapped = data
      .map((row) => {
        const series = row.series as unknown as SeriesJoin | SeriesJoin[] | null;
        const s = Array.isArray(series) ? series[0] : series;
        if (!s || s.status !== "published") return null;
        const bibleRaw = row.bible as unknown as BibleJoin | BibleJoin[] | null;
        const bible = Array.isArray(bibleRaw) ? bibleRaw[0] : bibleRaw;
        return {
          id: row.id as string,
          name: row.name as string,
          avatar_url: (row.avatar_url as string | null) ?? null,
          seriesSlug: s.slug,
          seriesTitle: s.title,
          teaser: pickPromoTeaser(
            bible?.speech_examples,
            bible?.catchphrases
          ),
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);

    // Prefer characters with real avatars first, cap at 3
    return mapped
      .sort((a, b) => {
        const aHas = a.avatar_url && !a.avatar_url.includes("<PLACEHOLDER") ? 0 : 1;
        const bHas = b.avatar_url && !b.avatar_url.includes("<PLACEHOLDER") ? 0 : 1;
        return aHas - bHas;
      })
      .slice(0, 3);
  } catch (err) {
    console.error("getChatPromoCharacters:", err);
    return [];
  }
}

async function getCatalog() {
  const supabase = createClient();

  const [
    { data: featured },
    { data: recent },
    { data: trending },
    { data: comingSoon },
    {
      data: { user },
    },
    promoCharacters,
  ] = await Promise.all([
    supabase
      .from("series")
      .select(
        "id, title, slug, tagline, description, banner_url, poster_url, genre"
      )
      // Admin-controlled order: /admin/featured writes featured_order (ASC, nulls last).
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
    supabase.auth.getUser(),
    getChatPromoCharacters(),
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
    promoCharacters,
    isAuthenticated: !!user,
  };
}

export default async function HomePage() {
  const {
    featuredWithEpisodes,
    newSeries,
    trendingSeries,
    comingSoon,
    isEmpty,
    promoCharacters,
    isAuthenticated,
  } = await getCatalog();

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav />
      <main className="mx-auto w-full max-w-7xl flex-1 space-y-7 px-4 py-5 sm:space-y-10 sm:px-6 sm:py-8">
        {isEmpty ? (
          <>
            <ComingSoon />
            {comingSoon.length > 0 && <ComingSoonRow series={comingSoon} />}
            {promoCharacters.length > 0 && (
              <CharacterChatPromo
                characters={promoCharacters}
                isAuthenticated={isAuthenticated}
              />
            )}
          </>
        ) : (
          <>
            {/* Catalog order: Hero → Chat promo → Trending Now → Coming Soon → New Series */}
            <div className="space-y-3 sm:space-y-4">
              {featuredWithEpisodes.length > 0 && (
                <HeroCarousel items={featuredWithEpisodes} />
              )}
              <SubtitlesPromoStrip />
            </div>
            {promoCharacters.length > 0 && (
              <CharacterChatPromo
                characters={promoCharacters}
                isAuthenticated={isAuthenticated}
              />
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
