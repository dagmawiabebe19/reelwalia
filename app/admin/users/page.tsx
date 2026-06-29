import { AdminPageHeader } from "@/components/admin/admin-ui";
import {
  UsersPagination,
  UsersSearchForm,
  UsersTable,
} from "@/components/admin/UsersTable";
import { fetchAdminUsers } from "@/lib/admin/users-list";
import { requireAdmin } from "@/lib/admin";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { q?: string; page?: string };
}) {
  await requireAdmin();

  const search = searchParams?.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);

  let result;
  try {
    result = await fetchAdminUsers({ page, search });
  } catch (error) {
    return (
      <div className="space-y-6">
        <AdminPageHeader title="Users" subtitle="Profiles joined with subscription status." />
        <div className="rw-admin-panel">
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : "Could not load users."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle={`${result.total} account(s) · profiles + subscription status`}
      />

      <UsersSearchForm search={search} page={page} />

      {!result.users.length ? (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">No users match your search.</p>
        </div>
      ) : (
        <>
          <UsersTable users={result.users} />
          <UsersPagination page={result.page} totalPages={result.totalPages} search={search} />
        </>
      )}
    </div>
  );
}
