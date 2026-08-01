import { notFound } from "next/navigation";
import { WorldBibleForm } from "@/components/admin/WorldBibleForm";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminWorldEditPage({
  params,
}: {
  params: { seriesId: string };
}) {
  await requireAdmin();
  const admin = createAdminClient();

  const [{ data: series }, { data: world }] = await Promise.all([
    admin
      .from("series")
      .select("id, title")
      .eq("id", params.seriesId)
      .maybeSingle(),
    admin
      .from("world_bible")
      .select("*")
      .eq("series_id", params.seriesId)
      .maybeSingle(),
  ]);

  if (!series) notFound();

  return (
    <WorldBibleForm
      seriesId={series.id}
      seriesTitle={series.title}
      initial={world}
    />
  );
}
