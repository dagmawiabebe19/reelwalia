/** Known Coming Soon slate — used when DB status is out of sync. */
export const COMING_SOON_SLUGS = [
  "echoes-of-addis",
  "crown-of-ashes",
  "midnight-contract",
  "sheba-rising",
  "dessie-nights",
  "harlem-crown",
] as const;

export type ComingSoonSlug = (typeof COMING_SOON_SLUGS)[number];

export function isComingSoonSlug(slug: string): slug is ComingSoonSlug {
  return (COMING_SOON_SLUGS as readonly string[]).includes(slug);
}

export function isComingSoonSeries(series: {
  slug: string;
  status?: string | null;
}): boolean {
  if (series.status === "published") return false;
  return (
    series.status === "coming_soon" ||
    series.status === "in_development" ||
    isComingSoonSlug(series.slug)
  );
}

/** Exclude Coming Soon titles from published homepage rows. */
export function filterPublishedCatalogRows<
  T extends { slug: string; status?: string | null },
>(rows: T[]): T[] {
  return rows.filter((row) => {
    // Explicitly published content should always remain visible in catalog rows.
    if (row.status === "published") return true;

    return (
      row.status !== "coming_soon" &&
      row.status !== "in_development" &&
      !isComingSoonSlug(row.slug)
    );
  });
}
