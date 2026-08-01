import Link from "next/link";
import { AdminPageHeader } from "@/components/admin/admin-ui";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminWorldListPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: series }, { data: worlds }] = await Promise.all([
    admin
      .from("series")
      .select("id, title, slug, status")
      .order("title", { ascending: true }),
    admin.from("world_bible").select("series_id"),
  ]);

  const withWorld = new Set((worlds ?? []).map((w) => w.series_id as string));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="World bibles"
        subtitle="Per-series world_rules, locations, and important_objects for character chat."
        action={
          <Link
            href="/admin/characters"
            className="rounded-lg border border-white/[0.12] px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-white/[0.06]"
          >
            Characters
          </Link>
        }
      />

      <div className="rw-admin-table-wrap">
        <table className="rw-admin-table">
          <thead>
            <tr>
              <th>Series</th>
              <th>Status</th>
              <th>World bible</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(series ?? []).map((row) => {
              const has = withWorld.has(row.id);
              return (
                <tr key={row.id}>
                  <td>
                    <p className="font-medium text-white">{row.title}</p>
                    <p className="text-xs text-zinc-500">/{row.slug}</p>
                  </td>
                  <td className="text-zinc-400">{row.status}</td>
                  <td>
                    {has ? (
                      <span className="rw-admin-pill-green">Configured</span>
                    ) : (
                      <span className="rw-admin-pill-zinc">Empty</span>
                    )}
                  </td>
                  <td className="text-right">
                    <Link
                      href={`/admin/world/${row.id}`}
                      className="text-sm text-zinc-400 hover:text-white"
                    >
                      Edit →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
