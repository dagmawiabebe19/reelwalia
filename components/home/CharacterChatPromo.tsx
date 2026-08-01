import Link from "next/link";
import { CharacterAvatar } from "@/components/chat/CharacterAvatar";

export type PromoCharacter = {
  id: string;
  name: string;
  avatar_url: string | null;
  seriesSlug: string;
  seriesTitle: string;
  /** EP1-safe voice line for the promo teaser bubble */
  teaser: string | null;
};

function chatHref(character: PromoCharacter): string {
  return `/chat/${character.id}?episode=1&from=${encodeURIComponent(character.seriesSlug)}`;
}

function attributedWaitingLine(characters: PromoCharacter[]): string {
  if (characters.length === 1) {
    const c = characters[0];
    return `${c.name} from ${c.seriesTitle} is waiting. Say something.`;
  }
  const names = characters
    .slice(0, 3)
    .map((c) => `${c.name} from ${c.seriesTitle}`)
    .join(" · ");
  return `${names} are waiting. Say something.`;
}

export function CharacterChatPromo({
  characters,
  isAuthenticated,
  /** Total active published characters — decides picker vs direct chat. */
  activeCharacterCount,
}: {
  characters: PromoCharacter[];
  isAuthenticated: boolean;
  activeCharacterCount?: number;
}) {
  if (!characters.length) return null;

  const primary = characters[0];
  const totalActive = activeCharacterCount ?? characters.length;
  const browseDest = totalActive <= 1 ? chatHref(primary) : "/chat";
  const startChattingHref = isAuthenticated
    ? browseDest
    : `/auth/sign-in?next=${encodeURIComponent(browseDest)}`;

  const supporting = attributedWaitingLine(characters);
  const teaser = primary.teaser;

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
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center sm:gap-4">
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <div className="flex -space-x-3">
              {characters.slice(0, 3).map((character, index) => (
                <Link
                  key={character.id}
                  href={startChattingHref}
                  className="relative transition hover:-translate-y-0.5"
                  style={{ zIndex: 3 - index }}
                  aria-label={
                    totalActive > 1
                      ? "Choose a character to chat with"
                      : `Chat with ${character.name}`
                  }
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
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-400/90">
              Online now
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-display text-lg uppercase leading-tight tracking-wide text-white sm:text-xl">
              The characters are online.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {supporting}
            </p>
            {teaser && (
              <p className="mt-2 max-w-xl border-l-2 border-obsidian-red/50 pl-3 text-sm italic leading-snug text-zinc-400">
                &ldquo;{teaser}&rdquo;
              </p>
            )}
          </div>
        </div>

        <Link
          href={startChattingHref}
          className="rw-btn-primary inline-flex w-full shrink-0 justify-center px-5 text-sm sm:w-auto"
        >
          Start chatting
        </Link>
      </div>
    </section>
  );
}
