export type PaywallCatalogPoster = {
  id: string;
  title: string;
  posterUrl: string;
};

export const PAYWALL_CATALOG_LIMIT = 8;

type CatalogRow = {
  id: string;
  title: string;
  poster_url: string | null;
  status?: string | null;
  is_featured?: boolean | null;
  featured_order?: number | null;
  view_count?: number | null;
};

/** Published titles with artwork only — never invents posters or unpublished shows. */
export function mapPaywallCatalogPosters(rows: CatalogRow[]): PaywallCatalogPoster[] {
  const published = rows.filter(
    (row) => row.status === "published" && typeof row.poster_url === "string" && row.poster_url.length > 0
  );

  published.sort((a, b) => {
    const aFeat = a.is_featured ? 1 : 0;
    const bFeat = b.is_featured ? 1 : 0;
    if (aFeat !== bFeat) return bFeat - aFeat;
    const aOrder = a.featured_order ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.featured_order ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (b.view_count ?? 0) - (a.view_count ?? 0);
  });

  return published.slice(0, PAYWALL_CATALOG_LIMIT).map((row) => ({
    id: row.id,
    title: row.title,
    posterUrl: row.poster_url as string,
  }));
}
