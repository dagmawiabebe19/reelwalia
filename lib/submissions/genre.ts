export const CUSTOM_GENRE_MAX_LENGTH = 100;

export function isOtherSubmissionGenre(genre: string): boolean {
  return genre === "Other";
}

export function formatSubmissionGenreDisplay(
  genre: string,
  customGenre: string | null | undefined
): string {
  if (isOtherSubmissionGenre(genre) && customGenre?.trim()) {
    return `Other (${customGenre.trim()})`;
  }
  return genre;
}
