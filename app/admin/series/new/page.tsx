import { SeriesForm } from "@/components/admin/SeriesForm";
import { requireAdmin } from "@/lib/admin";

export default async function NewSeriesPage() {
  await requireAdmin();
  return <SeriesForm />;
}
