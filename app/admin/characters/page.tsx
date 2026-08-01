import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  CharactersTable,
  type CharacterListRow,
} from "@/components/admin/CharactersTable";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminCharactersPage({
  searchParams,
}: {
  searchParams?: { series?: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();
  const seriesFilter = searchParams?.series?.trim() || "";

  let charactersQuery = admin
    .from("characters")
    .select(
      "id, name, series_id, is_active, avatar_url, created_at, series:series_id(title, slug), bible:character_bible(character_id, speech_examples, catchphrases, episode_knowledge)"
    )
    .order("created_at", { ascending: false });

  if (seriesFilter) {
    charactersQuery = charactersQuery.eq("series_id", seriesFilter);
  }

  const [{ data: characters }, { data: series }] = await Promise.all([
    charactersQuery,
    admin.from("series").select("id, title").order("title", { ascending: true }),
  ]);

  type SeriesJoin = { title: string; slug: string };
  type BibleJoin = {
    character_id: string;
    speech_examples: unknown;
    catchphrases: unknown;
    episode_knowledge: unknown;
  } | null;

  function bibleHasContent(bible: BibleJoin): boolean {
    if (!bible) return false;
    const speech = Array.isArray(bible.speech_examples)
      ? bible.speech_examples.length
      : 0;
    const phrases = Array.isArray(bible.catchphrases)
      ? bible.catchphrases.length
      : 0;
    const knowledge =
      bible.episode_knowledge &&
      typeof bible.episode_knowledge === "object" &&
      !Array.isArray(bible.episode_knowledge)
        ? Object.keys(bible.episode_knowledge as object).length
        : 0;
    return speech > 0 || phrases > 0 || knowledge > 0;
  }

  const rows: CharacterListRow[] =
    characters?.map((row) => {
      const seriesJoin = row.series as unknown as SeriesJoin | SeriesJoin[] | null;
      const s = Array.isArray(seriesJoin) ? seriesJoin[0] : seriesJoin;
      const bibleRaw = row.bible as unknown as BibleJoin | BibleJoin[] | null;
      const bible = Array.isArray(bibleRaw) ? bibleRaw[0] : bibleRaw;

      return {
        id: row.id as string,
        name: row.name as string,
        series_id: row.series_id as string,
        seriesTitle: s?.title ?? "Unknown series",
        seriesSlug: s?.slug ?? "",
        is_active: !!row.is_active,
        has_bible: bibleHasContent(bible ?? null),
        avatar_url: (row.avatar_url as string | null) ?? null,
        created_at: row.created_at as string,
      };
    }) ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Characters"
        subtitle="Manage AI chat characters, bibles, and active status across series."
        action={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/world"
              className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
            >
              World bibles
            </Link>
            <Link href="/admin/characters/new" className="rw-btn-primary">
              Add character
            </Link>
          </div>
        }
      />

      <CharactersTable
        rows={rows}
        seriesOptions={series ?? []}
        selectedSeriesId={seriesFilter}
      />
    </div>
  );
}
