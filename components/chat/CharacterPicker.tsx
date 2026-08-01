import Link from "next/link";
import { CharacterAvatar } from "@/components/chat/CharacterAvatar";

export type PickerCharacter = {
  id: string;
  name: string;
  short_bio: string | null;
  personality_summary: string | null;
  avatar_url: string | null;
  seriesId: string;
  seriesTitle: string;
  seriesSlug: string;
  seriesPosterUrl: string | null;
};

function chatHref(character: PickerCharacter): string {
  return `/chat/${character.id}?episode=1&from=${encodeURIComponent(character.seriesSlug)}`;
}

export function CharacterPicker({
  characters,
}: {
  characters: PickerCharacter[];
}) {
  const bySeries = new Map<string, PickerCharacter[]>();
  for (const character of characters) {
    const key = character.seriesId;
    const list = bySeries.get(key) ?? [];
    list.push(character);
    bySeries.set(key, list);
  }

  const groups = Array.from(bySeries.entries()).map(([, list]) => ({
    seriesId: list[0].seriesId,
    seriesTitle: list[0].seriesTitle,
    seriesSlug: list[0].seriesSlug,
    seriesPosterUrl: list[0].seriesPosterUrl,
    characters: list,
  }));

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.seriesId} className="space-y-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-obsidian-red">
              From the series
            </p>
            <h2 className="mt-1 font-display text-lg uppercase tracking-wide text-white">
              {group.seriesTitle}
            </h2>
          </div>

          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.characters.map((character) => (
              <li key={character.id}>
                <Link
                  href={chatHref(character)}
                  className="group relative flex gap-4 overflow-hidden rounded-2xl border border-obsidian-red/20 bg-zinc-950/80 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-obsidian-red/45 hover:shadow-[0_12px_36px_rgba(224,60,47,0.18)] active:scale-[0.99]"
                >
                  {group.seriesPosterUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={group.seriesPosterUrl}
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
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-obsidian-red/90">
                      {character.seriesTitle}
                    </p>
                    <p className="mt-0.5 font-display text-base uppercase tracking-wide text-white">
                      {character.name}
                    </p>
                    {character.short_bio && (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-zinc-300">
                        {character.short_bio}
                      </p>
                    )}
                    <span className="rw-btn-primary mt-3 inline-flex min-h-10 px-5 text-xs shadow-obsidian-red/25 transition group-hover:brightness-110">
                      Chat
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
