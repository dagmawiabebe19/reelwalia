import { CharacterForm } from "@/components/admin/CharacterForm";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AdminNewCharacterPage() {
  await requireAdmin();
  const admin = createAdminClient();

  const { data: series } = await admin
    .from("series")
    .select("id, title, slug")
    .order("title", { ascending: true });

  return (
    <CharacterForm
      seriesOptions={series ?? []}
      initial={{ is_active: true }}
    />
  );
}
