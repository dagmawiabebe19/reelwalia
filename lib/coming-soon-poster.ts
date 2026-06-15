/** Genre-based gradient for Coming Soon placeholder posters. */
export function getComingSoonPosterClass(genres: string[]): string {
  const joined = genres.join(" ").toLowerCase();

  if (joined.includes("thriller")) {
    return "bg-gradient-to-br from-slate-950 via-blue-950/90 to-black";
  }
  if (joined.includes("romance")) {
    return "bg-gradient-to-br from-fuchsia-950 via-purple-950/90 to-black";
  }
  if (joined.includes("historical")) {
    return "bg-gradient-to-br from-amber-900/80 via-zinc-950 to-black";
  }
  return "bg-gradient-to-br from-red-950 via-zinc-950 to-black";
}

export function formatGenreLabel(genres: string[]): string {
  if (!genres.length) return "Drama";
  return genres.join(" · ");
}

export function getPrimaryGenrePillClass(genres: string[]): string {
  const joined = genres.join(" ").toLowerCase();

  if (joined.includes("thriller")) {
    return "border-blue-400/30 bg-blue-950/50 text-blue-200";
  }
  if (joined.includes("romance")) {
    return "border-fuchsia-400/30 bg-fuchsia-950/50 text-fuchsia-200";
  }
  if (joined.includes("historical")) {
    return "border-amber-400/30 bg-amber-950/50 text-amber-200";
  }
  return "border-red-400/30 bg-red-950/50 text-red-200";
}
