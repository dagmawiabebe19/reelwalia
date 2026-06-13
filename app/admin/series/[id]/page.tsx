import Link from "next/link";
import { notFound } from "next/navigation";
import { SeriesForm } from "@/components/admin/SeriesForm";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface AdminSeriesEditPageProps {
  params: { id: string };
}

export default async function AdminSeriesEditPage({ params }: AdminSeriesEditPageProps) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!series) notFound();

  const { data: episodes } = await admin
    .from("episodes")
    .select("id, episode_number, title, bunny_video_id, video_url, created_at")
    .eq("series_id", params.id)
    .order("episode_number", { ascending: true });

  const nextEpisodeNumber =
    episodes && episodes.length > 0
      ? Math.max(...episodes.map((e) => e.episode_number)) + 1
      : 1;

  return (
    <div className="space-y-10">
      <SeriesForm initial={series} />

      <section className="mx-auto max-w-2xl space-y-4 border-t border-white/[0.08] pt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl uppercase">Episodes</h2>
          <Link
            href={`/admin/series/${params.id}/episodes/new`}
            className="rw-btn-secondary text-sm"
          >
            Upload Episode
          </Link>
        </div>

        {!episodes?.length ? (
          <p className="text-sm text-gray-400">No episodes uploaded yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.08] rounded-lg border border-white/[0.08]">
            {episodes.map((ep) => (
              <li
                key={ep.id}
                className="flex items-center justify-between px-4 py-3 text-sm"
              >
                <span>
                  {ep.episode_number}. {ep.title}
                </span>
                <span className="text-xs text-gray-500">
                  {ep.bunny_video_id ? "Bunny" : "No video"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-gray-500">
          Next episode number: {nextEpisodeNumber}
        </p>
      </section>
    </div>
  );
}
