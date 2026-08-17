import Link from "next/link";
import { AdminDateRangeHiddenFields } from "@/components/admin/AdminDateRangeForm";
import type { DatePreset } from "@/lib/admin/analytics-range";
import type { AdminUserRow } from "@/lib/admin/users-list";

function UserAvatar({ row }: { row: AdminUserRow }) {
  const initial = (row.displayName ?? row.email).charAt(0).toUpperCase();

  if (row.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={row.avatarUrl}
        alt=""
        className="h-10 w-10 shrink-0 rounded-full border border-white/[0.08] object-cover"
      />
    );
  }

  return (
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-sm font-semibold text-zinc-300">
      {initial}
    </span>
  );
}

function formatJoinDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  return (
    <div className="rw-admin-table-wrap">
      <table className="rw-admin-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Email</th>
            <th>User ID</th>
            <th>Joined</th>
            <th>Role</th>
            <th>Payment</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((row) => (
            <tr key={row.id}>
              <td>
                <div className="flex items-center gap-3">
                  <UserAvatar row={row} />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-white">
                      {row.displayName ?? "—"}
                    </p>
                    <p className="truncate text-xs text-zinc-500">{row.subscriptionPlan}</p>
                  </div>
                </div>
              </td>
              <td className="max-w-[12rem] truncate text-zinc-300">{row.email}</td>
              <td className="font-mono text-xs text-zinc-500">{row.id.slice(0, 8)}…</td>
              <td className="text-zinc-400">{formatJoinDate(row.createdAt)}</td>
              <td>
                {row.isAdmin ? (
                  <span className="rw-admin-pill-red">Admin</span>
                ) : (
                  <span className="rw-admin-pill-zinc">User</span>
                )}
              </td>
              <td>
                {row.paymentLabel === "Paid" ? (
                  <span className="rw-admin-pill-green">Paid</span>
                ) : (
                  <span className="rw-admin-pill-zinc">No payment</span>
                )}
              </td>
              <td>
                {row.activeLabel === "Active" ? (
                  <span className="rw-admin-pill-green">Active</span>
                ) : (
                  <span className="rw-admin-pill-zinc">Inactive</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UsersSearchForm({
  search,
  page,
  preset,
  from,
  to,
}: {
  search: string;
  page: number;
  preset: DatePreset;
  from: string;
  to: string;
}) {
  return (
    <form className="rw-admin-panel flex flex-wrap items-end gap-3" method="get">
      <label className="min-w-[16rem] flex-1 space-y-1.5">
        <span className="text-xs uppercase tracking-wide text-zinc-500">Search</span>
        <input
          type="search"
          name="q"
          defaultValue={search}
          placeholder="Email or user ID"
          className="rw-form-input py-2 text-sm"
        />
      </label>
      <AdminDateRangeHiddenFields preset={preset} from={from} to={to} />
      <input type="hidden" name="page" value="1" />
      <button type="submit" className="rw-btn-primary min-h-10 px-4 py-2 text-sm">
        Search
      </button>
      {search && (
        <Link
          href={`/admin/users?preset=${encodeURIComponent(preset)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
          className="rw-btn-secondary min-h-10 px-4 py-2 text-sm"
        >
          Clear search
        </Link>
      )}
      {!search && page > 1 && <input type="hidden" name="page" value={String(page)} />}
    </form>
  );
}

export function UsersPagination({
  page,
  totalPages,
  search,
  preset,
  from,
  to,
}: {
  page: number;
  totalPages: number;
  search: string;
  preset: DatePreset;
  from: string;
  to: string;
}) {
  if (totalPages <= 1) return null;

  const prev = Math.max(1, page - 1);
  const next = Math.min(totalPages, page + 1);
  const base = new URLSearchParams();
  base.set("preset", preset);
  base.set("from", from);
  base.set("to", to);
  if (search) base.set("q", search);

  const prevParams = new URLSearchParams(base);
  prevParams.set("page", String(prev));
  const nextParams = new URLSearchParams(base);
  nextParams.set("page", String(next));

  return (
    <div className="flex items-center justify-between text-sm text-zinc-500">
      <span>
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Link
          href={`/admin/users?${prevParams.toString()}`}
          className={`rw-btn-secondary min-h-9 px-3 py-1.5 text-xs ${page <= 1 ? "pointer-events-none opacity-40" : ""}`}
        >
          Previous
        </Link>
        <Link
          href={`/admin/users?${nextParams.toString()}`}
          className={`rw-btn-secondary min-h-9 px-3 py-1.5 text-xs ${page >= totalPages ? "pointer-events-none opacity-40" : ""}`}
        >
          Next
        </Link>
      </div>
    </div>
  );
}
