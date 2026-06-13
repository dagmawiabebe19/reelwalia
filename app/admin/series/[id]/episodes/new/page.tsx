import { notFound } from "next/navigation";
import { EpisodeUploadForm } from "@/components/admin/EpisodeUploadForm";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

interface NewEpisodePageProps {
  params: { id: string };
}

export default async function NewEpisodePage({ params }: NewEpisodePageProps) {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select("id, title")
    .eq("id", params.id)
    .maybeSingle();

  if (!series) notFound();

  const { data: lastEp } = await admin
    .from("episodes")
    .select("episode_number")
    .eq("series_id", params.id)
    .order("episode_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextEpisodeNumber = lastEp ? lastEp.episode_number + 1 : 1;

  return (
    <EpisodeUploadForm
      seriesId={series.id}
      seriesTitle={series.title}
      nextEpisodeNumber={nextEpisodeNumber}
    />
  );
}
