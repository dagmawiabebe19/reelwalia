import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminSeriesListPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select("id, title, slug, status, total_episodes, is_featured, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl uppercase">Series</h1>
        <Link href="/admin/series/new" className="rw-btn-primary">
          Add Series
        </Link>
      </div>

      {!series?.length ? (
        <p className="text-sm text-gray-400">No series yet. Create your first one.</p>
      ) : (
        <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08]">
          {series.map((s) => (
            <li key={s.id}>
              <Link
                href={`/admin/series/${s.id}`}
                className="flex items-center justify-between px-4 py-3 transition hover:bg-white/[0.03]"
              >
                <div>
                  <p className="font-medium">{s.title}</p>
                  <p className="text-xs text-gray-400">
                    /{s.slug} · {s.total_episodes} eps · {s.status}
                  </p>
                </div>
                {s.is_featured && (
                  <span className="text-xs uppercase text-obsidian-red">Featured</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
