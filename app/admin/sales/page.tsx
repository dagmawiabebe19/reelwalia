import { requireAdmin } from "@/lib/admin";

export default async function AdminSalesPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="rw-admin-page-title">Sales</h1>
      <p className="rw-admin-page-subtitle">Revenue dashboard coming in the next phase.</p>
    </div>
  );
}
