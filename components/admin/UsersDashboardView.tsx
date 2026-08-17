import { AdminPageHeader } from "@/components/admin/admin-ui";
import { AdminDateRangeForm } from "@/components/admin/AdminDateRangeForm";
import { AdminTimeSeriesChart } from "@/components/admin/AdminTimeSeriesChart";
import {
  UsersPagination,
  UsersSearchForm,
  UsersTable,
} from "@/components/admin/UsersTable";
import type { AdminUsersResult } from "@/lib/admin/users-list";
import type { DatePreset } from "@/lib/admin/analytics-range";

function StatCard({ label, value, meta }: { label: string; value: string | number; meta?: string }) {
  return (
    <div className="rw-admin-stat-card">
      <p className="rw-admin-stat-label">{label}</p>
      <p className="rw-admin-stat-value">{value}</p>
      {meta && <p className="rw-admin-stat-meta">{meta}</p>}
    </div>
  );
}

export function UsersDashboardView({
  result,
  preset,
  from,
  to,
}: {
  result: AdminUsersResult;
  preset: DatePreset;
  from: string;
  to: string;
}) {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Users"
        subtitle={`Signups and accounts · ${result.range.label} (UTC)`}
      />

      <AdminDateRangeForm preset={preset} from={from} to={to} />

      <div className="rw-admin-panel border-sky-500/20 bg-sky-500/[0.04]">
        <p className="text-sm text-sky-100/90">
          Country is derived from Vercel geo headers (first visit) or Stripe billing on
          payment — ISO code only, never IP or city. Legacy accounts show Unknown until migration{" "}
          <code>030_country_geo.sql</code> is applied and new traffic arrives.
        </p>
      </div>

      <div className="rw-admin-stat-grid">
        <StatCard
          label="Signups in range"
          value={result.signupsInRange}
          meta={result.range.label}
        />
        <StatCard
          label="Listed below"
          value={result.total}
          meta={
            result.search
              ? `Matches search in ${result.range.label.toLowerCase()}`
              : `Accounts joined in ${result.range.label.toLowerCase()}`
          }
        />
      </div>

      <AdminTimeSeriesChart
        title="Signups"
        bucket={result.chartBucket}
        rangeLabel={result.range.label}
        points={result.signupSeries}
      />

      <UsersSearchForm
        search={result.search}
        page={result.page}
        preset={preset}
        from={from}
        to={to}
        country={result.countryFilter}
      />

      {!result.users.length ? (
        <div className="rw-admin-panel">
          <p className="text-sm text-zinc-400">
            {result.search
              ? "No users match your search in this date range."
              : "No signups in this date range."}
          </p>
        </div>
      ) : (
        <>
          <UsersTable users={result.users} />
          <UsersPagination
            page={result.page}
            totalPages={result.totalPages}
            search={result.search}
            preset={preset}
            from={from}
            to={to}
            country={result.countryFilter}
          />
        </>
      )}
    </div>
  );
}
