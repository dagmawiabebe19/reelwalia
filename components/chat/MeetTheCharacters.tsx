"use client";

import Link from "next/link";

export type CharacterCardData = {
  id: string;
  name: string;
  short_bio: string | null;
  personality_summary: string | null;
  avatar_url: string | null;
};

export function MeetTheCharacters({
  characters,
  seriesSlug,
  episodeNumber,
  isAuthenticated,
}: {
  characters: CharacterCardData[];
  seriesSlug: string;
  episodeNumber: number;
  isAuthenticated: boolean;
}) {
  if (!characters.length) return null;

  return (
    <section className="w-full space-y-4">
      <div>
        <h2 className="rw-section-title text-base sm:text-sm">Meet the Characters</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Chat with them about what you&apos;ve watched so far — no spoilers ahead.
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {characters.map((character) => {
          const chatHref = isAuthenticated
            ? `/chat/${character.id}?episode=${episodeNumber}&from=${encodeURIComponent(seriesSlug)}`
            : `/auth/sign-in?next=${encodeURIComponent(
                `/chat/${character.id}?episode=${episodeNumber}&from=${encodeURIComponent(seriesSlug)}`
              )}`;

          return (
            <li
              key={character.id}
              className="flex gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-zinc-900">
                {character.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={character.avatar_url}
                    alt={character.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-display text-lg text-obsidian-red">
                    {character.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-sm uppercase tracking-wide text-white">
                  {character.name}
                </p>
                {character.short_bio && (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
                    {character.short_bio}
                  </p>
                )}
                {character.personality_summary && (
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                    {character.personality_summary}
                  </p>
                )}
                <Link
                  href={chatHref}
                  className="rw-btn-primary mt-3 inline-flex min-h-10 px-4 text-xs"
                >
                  Chat
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
