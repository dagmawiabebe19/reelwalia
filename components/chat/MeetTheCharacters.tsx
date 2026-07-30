"use client";

import Link from "next/link";
import { CharacterAvatar } from "@/components/chat/CharacterAvatar";

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
  seriesPosterUrl,
  seriesTitle,
  episodeNumber,
  isAuthenticated,
}: {
  characters: CharacterCardData[];
  seriesSlug: string;
  seriesPosterUrl: string | null;
  seriesTitle?: string;
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
            <li key={character.id}>
              <Link
                href={chatHref}
                className="group relative flex gap-4 overflow-hidden rounded-2xl border border-obsidian-red/20 bg-zinc-950/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-obsidian-red/45 hover:shadow-[0_12px_36px_rgba(224,60,47,0.18)] active:scale-[0.99]"
              >
                {seriesPosterUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={seriesPosterUrl}
                    alt=""
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-[0.22] transition duration-300 group-hover:opacity-[0.32] group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50" />

                <div className="relative shrink-0">
                  <CharacterAvatar
                    name={character.name}
                    avatarUrl={character.avatar_url}
                    sizeClass="h-20 w-20"
                    textClass="text-2xl"
                    online
                  />
                </div>

                <div className="relative min-w-0 flex-1">
                  {seriesTitle && (
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-obsidian-red/90">
                      {seriesTitle}
                    </p>
                  )}
                  <p className="mt-0.5 font-display text-base uppercase tracking-wide text-white">
                    {character.name}
                  </p>
                  {character.short_bio && (
                    <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-300">
                      {character.short_bio}
                    </p>
                  )}
                  {character.personality_summary && (
                    <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-zinc-500">
                      {character.personality_summary}
                    </p>
                  )}
                  <span className="rw-btn-primary mt-3 inline-flex min-h-10 px-5 text-xs shadow-obsidian-red/25 transition group-hover:brightness-110">
                    Chat with {character.name}
                  </span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
