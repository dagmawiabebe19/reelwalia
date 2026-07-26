import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  FeaturedOrderManager,
  type FeaturedCandidate,
  type FeaturedOrderRow,
} from "@/components/admin/FeaturedOrderManager";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SeriesStatus } from "@/lib/types/database";

export default async function AdminFeaturedPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: featured }, { data: others }] = await Promise.all([
    admin
      .from("series")
      .select("id, title, slug, status, poster_url, genre, featured_order")
      .eq("is_featured", true)
      .order("featured_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    admin
      .from("series")
      .select("id, title, slug, status, poster_url, genre")
      .eq("is_featured", false)
      .order("title", { ascending: true }),
  ]);

  const featuredRows: FeaturedOrderRow[] =
    featured?.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status as SeriesStatus,
      poster_url: item.poster_url,
      genre: item.genre ?? [],
      featured_order: item.featured_order,
    })) ?? [];

  const candidates: FeaturedCandidate[] =
    others?.map((item) => ({
      id: item.id,
      title: item.title,
      slug: item.slug,
      status: item.status as SeriesStatus,
      poster_url: item.poster_url,
      genre: item.genre ?? [],
    })) ?? [];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Featured order"
        subtitle="Control which titles appear in the homepage Featured hero and in what order."
      />
      <FeaturedOrderManager
        key={featuredRows.map((r) => `${r.id}:${r.featured_order}`).join("|")}
        initialFeatured={featuredRows}
        candidates={candidates}
      />
    </div>
  );
}
