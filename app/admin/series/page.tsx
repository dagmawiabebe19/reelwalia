import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  SeriesCatalogMobileList,
  SeriesCatalogTable,
} from "@/components/admin/SeriesCatalogTable";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SeriesStatus } from "@/lib/types/database";

export default async function AdminSeriesListPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select(
      "id, title, slug, status, total_episodes, poster_url, genre, is_featured, featured_order, created_at"
    )
    .order("featured_order", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  const rows =
    series?.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status as SeriesStatus,
      total_episodes: item.total_episodes,
      poster_url: item.poster_url,
      genre: item.genre ?? [],
      is_featured: item.is_featured,
      featured_order: item.featured_order,
    })) ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Series"
        subtitle="Catalog overview — thumbnails, status, and featured placement."
        action={
          <Link href="/admin/series/new" className="rw-btn-primary">
            Add Series
          </Link>
        }
      />

      {!rows.length ? (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">No series yet. Create your first one.</p>
        </div>
      ) : (
        <>
          <SeriesCatalogTable rows={rows} />
          <SeriesCatalogMobileList rows={rows} />
        </>
      )}
    </div>
  );
}
