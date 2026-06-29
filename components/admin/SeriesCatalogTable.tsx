import Image from "next/image";
import Link from "next/link";
import { SeriesStatusPill } from "@/components/admin/admin-ui";
import type { SeriesStatus } from "@/lib/types/database";

export type SeriesCatalogRow = {
  id: string;
  title: string;
  slug: string;
  status: SeriesStatus;
  total_episodes: number;
  poster_url: string | null;
  is_featured: boolean;
  featured_order: number | null;
};

function SeriesCover({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  if (posterUrl) {
    return (
      <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md border border-white/[0.08] bg-zinc-900">
        <Image
          src={posterUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="40px"
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-10 shrink-0 items-center justify-center rounded-md border border-white/[0.08] bg-white/[0.04] text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
      RW
    </div>
  );
}

export function SeriesCatalogTable({ rows }: { rows: SeriesCatalogRow[] }) {
  return (
    <div className="rw-admin-table-wrap hidden md:block">
      <table className="rw-admin-table">
        <thead>
          <tr>
            <th className="w-16">Cover</th>
            <th>Series</th>
            <th>Status</th>
            <th>Episodes</th>
            <th>Position</th>
            <th>Featured</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>
                <Link href={`/admin/series/${row.id}`} className="block">
                  <SeriesCover title={row.title} posterUrl={row.poster_url} />
                </Link>
              </td>
              <td>
                <Link href={`/admin/series/${row.id}`} className="group block">
                  <p className="font-medium text-white transition group-hover:text-obsidian-red">
                    {row.title}
                  </p>
                  <p className="text-xs text-zinc-500">/{row.slug}</p>
                </Link>
              </td>
              <td>
                <SeriesStatusPill status={row.status} />
              </td>
              <td className="text-zinc-300">{row.total_episodes}</td>
              <td className="text-zinc-400">
                {row.featured_order != null ? `#${row.featured_order}` : "—"}
              </td>
              <td>
                {row.is_featured ? (
                  <span className="rw-admin-pill-red">Featured</span>
                ) : (
                  <span className="text-zinc-600">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SeriesCatalogMobileList({ rows }: { rows: SeriesCatalogRow[] }) {
  return (
    <ul className="divide-y divide-white/[0.08] rounded-xl border border-white/[0.08] md:hidden">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/admin/series/${row.id}`}
            className="flex items-center gap-3 px-4 py-4 transition hover:bg-white/[0.03]"
          >
            <SeriesCover title={row.title} posterUrl={row.poster_url} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{row.title}</p>
              <p className="text-xs text-zinc-500">
                /{row.slug} · {row.total_episodes} eps
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <SeriesStatusPill status={row.status} />
                {row.is_featured && <span className="rw-admin-pill-red">Featured</span>}
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
