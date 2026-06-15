/** Gradient placeholder art for Coming Soon series without posters. */
export function getComingSoonPosterClass(genres: string[]): string {
  const primary = (genres[0] ?? "Drama").toLowerCase();

  if (primary.includes("thriller")) {
    return "bg-gradient-to-br from-zinc-950 via-red-950/80 to-black";
  }
  if (primary.includes("romance")) {
    return "bg-gradient-to-br from-rose-950/90 via-zinc-950 to-black";
  }
  if (primary.includes("historical")) {
    return "bg-gradient-to-br from-amber-950/70 via-zinc-950 to-black";
  }
  return "bg-gradient-to-br from-zinc-900 via-zinc-950 to-black";
}

export function formatGenreLabel(genres: string[]): string {
  if (!genres.length) return "Drama";
  return genres.join(" · ");
}
