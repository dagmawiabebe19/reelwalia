import Link from "next/link";
import { CharacterAvatar } from "@/components/chat/CharacterAvatar";

export type PromoCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
  seriesSlug: string;
  seriesTitle: string;
};

function chatHref(character: PromoCharacter): string {
  return `/chat/${character.id}?episode=1&from=${encodeURIComponent(character.seriesSlug)}`;
}

function gatedHref(character: PromoCharacter, isAuthenticated: boolean): string {
  const dest = chatHref(character);
  if (isAuthenticated) return dest;
  return `/auth/sign-in?next=${encodeURIComponent(dest)}`;
}

export function CharacterChatPromo({
  characters,
  isAuthenticated,
}: {
  characters: PromoCharacter[];
  isAuthenticated: boolean;
}) {
  if (!characters.length) return null;

  const primary = characters[0];
  const ctaHref = gatedHref(primary, isAuthenticated);
  const supporting =
    characters.length === 1
      ? `${primary.name}'s story isn't over — talk to her.`
      : "Their stories aren't over — talk to them.";

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-obsidian-red/25 bg-gradient-to-r from-obsidian-red/15 via-zinc-950 to-black px-4 py-4 sm:px-6 sm:py-5"
      aria-label="Chat with characters"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full bg-obsidian-red/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-amber-500/10 blur-3xl"
        aria-hidden
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
          <div className="flex shrink-0 -space-x-3">
            {characters.slice(0, 3).map((character, index) => (
              <Link
                key={character.id}
                href={gatedHref(character, isAuthenticated)}
                className="relative transition hover:-translate-y-0.5"
                style={{ zIndex: 3 - index }}
                aria-label={`Chat with ${character.name}`}
              >
                <CharacterAvatar
                  name={character.name}
                  avatarUrl={character.avatar_url}
                  sizeClass="h-12 w-12 sm:h-14 sm:w-14"
                  textClass="text-base sm:text-lg"
                  online
                />
              </Link>
            ))}
          </div>

          <div className="min-w-0">
            <p className="font-display text-lg uppercase leading-tight tracking-wide text-white sm:text-xl">
              The characters are online.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {supporting}
            </p>
          </div>
        </div>

        <Link
          href={ctaHref}
          className="rw-btn-primary inline-flex w-full shrink-0 justify-center px-5 text-sm sm:w-auto"
        >
          Start chatting
        </Link>
      </div>
    </section>
  );
}
