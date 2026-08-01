import Link from "next/link";
import { redirect } from "next/navigation";
import { CharacterPicker, type PickerCharacter } from "@/components/chat/CharacterPicker";
import { Footer } from "@/components/layout/Footer";
import { TopNav } from "@/components/layout/TopNav";
import { createClient } from "@/lib/supabase/server";

export default async function ChatPickerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/auth/sign-in?next=${encodeURIComponent("/chat")}`);
  }

  const { data, error } = await supabase
    .from("characters")
    .select(
      "id, name, short_bio, personality_summary, avatar_url, is_active, series:series_id!inner(id, title, slug, poster_url, banner_url, status)"
    )
    .eq("is_active", true)
    .eq("series.status", "published")
    .order("name", { ascending: true });

  if (error) {
    console.error("ChatPickerPage:", error.message);
  }

  type SeriesJoin = {
    id: string;
    title: string;
    slug: string;
    poster_url: string | null;
    banner_url: string | null;
    status: string;
  };

  const characters: PickerCharacter[] = (data ?? [])
    .map((row) => {
      const series = row.series as unknown as SeriesJoin | SeriesJoin[] | null;
      const s = Array.isArray(series) ? series[0] : series;
      if (!s || s.status !== "published") return null;
      return {
        id: row.id as string,
        name: row.name as string,
        short_bio: (row.short_bio as string | null) ?? null,
        personality_summary: (row.personality_summary as string | null) ?? null,
        avatar_url: (row.avatar_url as string | null) ?? null,
        seriesId: s.id,
        seriesTitle: s.title,
        seriesSlug: s.slug,
        seriesPosterUrl: s.poster_url ?? s.banner_url ?? null,
      };
    })
    .filter((row): row is PickerCharacter => row != null)
    .sort((a, b) => {
      const seriesCmp = a.seriesTitle.localeCompare(b.seriesTitle);
      if (seriesCmp !== 0) return seriesCmp;
      return a.name.localeCompare(b.name);
    });

  // One active character → skip the picker
  if (characters.length === 1) {
    const only = characters[0];
    redirect(
      `/chat/${only.id}?episode=1&from=${encodeURIComponent(only.seriesSlug)}`
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-black">
      <TopNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 space-y-2">
          <Link
            href="/"
            className="inline-block text-sm text-zinc-500 transition hover:text-white"
          >
            ← Back home
          </Link>
          <h1 className="font-display text-2xl uppercase tracking-wide text-white sm:text-3xl">
            The characters are online.
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-zinc-400">
            Pick someone to talk to. They only know what you&apos;ve watched so
            far — no spoilers ahead.
          </p>
        </div>

        {!characters.length ? (
          <div className="rounded-2xl border border-white/[0.08] bg-zinc-950/80 px-4 py-8 text-center">
            <p className="text-sm text-zinc-400">
              No characters are available to chat with yet.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm text-obsidian-red hover:underline"
            >
              Back to home
            </Link>
          </div>
        ) : (
          <CharacterPicker characters={characters} />
        )}
      </main>
      <Footer />
    </div>
  );
}
