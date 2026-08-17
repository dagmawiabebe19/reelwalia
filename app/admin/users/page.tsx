import { UsersDashboardView } from "@/components/admin/UsersDashboardView";
import { fetchAdminUsers } from "@/lib/admin/users-list";
import { requireAdmin } from "@/lib/admin";
import {
  formatRangeFormInputs,
  parseAnalyticsRange,
  type DatePreset,
} from "@/lib/admin/analytics-range";

type SearchParams = {
  q?: string;
  page?: string;
  preset?: string;
  from?: string;
  to?: string;
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  await requireAdmin();

  const search = searchParams?.q?.trim() ?? "";
  const page = Math.max(1, Number.parseInt(searchParams?.page ?? "1", 10) || 1);
  const range = parseAnalyticsRange(searchParams ?? {});
  const { from, to } = formatRangeFormInputs(range, searchParams);

  let result;
  try {
    result = await fetchAdminUsers({ page, search, range });
  } catch (error) {
    return (
      <div className="space-y-6">
        <div className="rw-admin-panel">
          <p className="text-sm text-red-300">
            {error instanceof Error ? error.message : "Could not load users."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <UsersDashboardView
      result={result}
      preset={range.preset as DatePreset}
      from={from}
      to={to}
    />
  );
}
