export type PaywallCatalogPoster = {
  id: string;
  title: string;
  posterUrl: string;
};

/**
 * Paywall poster showcase — only these published titles, in this order.
 * Matched against live series rows (title or slug); never invents posters.
 */
export const PAYWALL_CATALOG_TITLES = [
  "Wedded to the Enemy",
  "The Algorithm Matched Me with My Ex",
  "Flying with My Boss",
] as const;

const PAYWALL_CATALOG_SLUGS = [
  "wedded-to-the-enemy",
  "the-algorithm-matched-me-with-my-ex",
  "flying-with-my-boss",
] as const;

type CatalogRow = {
  id: string;
  title: string;
  slug?: string | null;
  poster_url: string | null;
  status?: string | null;
};

function normalizeCatalogKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function catalogOrderIndex(row: CatalogRow): number {
  const titleKey = normalizeCatalogKey(row.title);
  const slugKey = (row.slug ?? "").toLowerCase();
  const titleIndex = PAYWALL_CATALOG_TITLES.findIndex(
    (title) => normalizeCatalogKey(title) === titleKey
  );
  if (titleIndex >= 0) return titleIndex;
  const slugIndex = PAYWALL_CATALOG_SLUGS.findIndex((slug) => slug === slugKey);
  return slugIndex;
}

/** Published titles with artwork only — never invents posters or unpublished shows. */
export function mapPaywallCatalogPosters(rows: CatalogRow[]): PaywallCatalogPoster[] {
  return rows
    .filter(
      (row) =>
        row.status === "published" &&
        typeof row.poster_url === "string" &&
        row.poster_url.length > 0 &&
        catalogOrderIndex(row) >= 0
    )
    .sort((a, b) => catalogOrderIndex(a) - catalogOrderIndex(b))
    .map((row) => ({
      id: row.id,
      title: row.title,
      posterUrl: row.poster_url as string,
    }));
}
