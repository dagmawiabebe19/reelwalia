import { requireAdmin } from "@/lib/admin";

export default async function AdminUsersPage() {
  await requireAdmin();

  return (
    <div>
      <h1 className="rw-admin-page-title">Users</h1>
      <p className="rw-admin-page-subtitle">User management view coming in the next phase.</p>
    </div>
  );
}
