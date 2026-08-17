import { getAdminEmails, isAdminEmail } from "@/lib/admin";
import {
  chartBucketForRange,
  type DateRange,
} from "@/lib/admin/analytics-range";
import { buildTimeSeriesBuckets, type TimeSeriesPoint } from "@/lib/admin/chart-buckets";
import { COUNTRY_UNKNOWN, normalizeCountryCode } from "@/lib/country-geo";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Profile, SubscriptionStatus } from "@/lib/types/database";

export type AdminUserRow = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  subscriptionStatus: SubscriptionStatus | string;
  subscriptionPlan: string;
  isAdmin: boolean;
  paymentLabel: "Paid" | "No payment";
  activeLabel: "Active" | "Inactive";
  country: string | null;
};

export type AdminUsersResult = {
  users: AdminUserRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  search: string;
  countryFilter: string;
  range: DateRange;
  signupsInRange: number;
  signupSeries: TimeSeriesPoint[];
  chartBucket: ReturnType<typeof chartBucketForRange>;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function inRange(iso: string, range: DateRange): boolean {
  const created = new Date(iso);
  return created >= range.from && created < range.to;
}

function mapUserRow(
  authUser: { id: string; email?: string; created_at?: string },
  profile: Profile | undefined
): AdminUserRow {
  const status = profile?.subscription_status ?? "none";
  const hasPaidPlan = profile?.subscription_plan && profile.subscription_plan !== "free";
  const isActive = ACTIVE_STATUSES.has(status);

  return {
    id: authUser.id,
    email: authUser.email ?? "—",
    displayName: profile?.display_name ?? null,
    avatarUrl: profile?.avatar_url ?? null,
    createdAt: profile?.created_at ?? authUser.created_at ?? new Date(0).toISOString(),
    subscriptionStatus: status,
    subscriptionPlan: profile?.subscription_plan ?? "free",
    isAdmin: isAdminEmail(authUser.email),
    paymentLabel: hasPaidPlan && isActive ? "Paid" : "No payment",
    activeLabel: isActive ? "Active" : "Inactive",
    country: normalizeCountryCode(profile?.country) ?? profile?.country ?? null,
  };
}

function matchesCountryFilter(country: string | null, filter: string): boolean {
  if (!filter || filter === "all") return true;
  const normalized = normalizeCountryCode(country);
  if (filter === COUNTRY_UNKNOWN) {
    return !normalized || normalized === COUNTRY_UNKNOWN;
  }
  return normalized === filter.toUpperCase();
}

function profilesInRangeQuery(admin: ReturnType<typeof createAdminClient>, range: DateRange) {
  return admin
    .from("profiles")
    .select("*", { count: "exact" })
    .gte("created_at", range.from.toISOString())
    .lt("created_at", range.to.toISOString());
}

async function loadSignupSeries(
  range: DateRange
): Promise<{ signupsInRange: number; signupSeries: TimeSeriesPoint[] }> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("created_at")
    .gte("created_at", range.from.toISOString())
    .lt("created_at", range.to.toISOString());

  const timestamps = (data ?? []).map((row) => new Date(row.created_at));
  const chartBucket = chartBucketForRange(range);
  return {
    signupsInRange: timestamps.length,
    signupSeries: buildTimeSeriesBuckets(timestamps, range, chartBucket),
  };
}

async function authUserForProfile(profileId: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(profileId);
  return data.user;
}

async function rowsFromProfiles(profiles: Profile[]): Promise<AdminUserRow[]> {
  const rows: AdminUserRow[] = [];
  for (const profile of profiles) {
    const authUser = await authUserForProfile(profile.id);
    if (!authUser) continue;
    rows.push(
      mapUserRow(
        { id: authUser.id, email: authUser.email, created_at: authUser.created_at },
        profile
      )
    );
  }
  return rows;
}

export async function fetchAdminUsers(options: {
  page?: number;
  search?: string;
  perPage?: number;
  range: DateRange;
  country?: string;
}): Promise<AdminUsersResult> {
  const admin = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 25;
  const search = (options.search ?? "").trim().toLowerCase();
  const countryFilter = (options.country ?? "all").trim();
  const range = options.range;
  const chartBucket = chartBucketForRange(range);
  const signupMeta = await loadSignupSeries(range);

  const baseResult = {
    range,
    chartBucket,
    signupsInRange: signupMeta.signupsInRange,
    signupSeries: signupMeta.signupSeries,
    countryFilter,
  };

  if (search && isUuid(search)) {
    const { data: authData } = await admin.auth.admin.getUserById(search);
    const authUser = authData.user;
    if (!authUser) {
      return { users: [], page: 1, perPage, total: 0, totalPages: 0, search, ...baseResult };
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    const row = mapUserRow(
      { id: authUser.id, email: authUser.email, created_at: authUser.created_at },
      profile ?? undefined
    );

    if (!inRange(row.createdAt, range)) {
      return { users: [], page: 1, perPage, total: 0, totalPages: 0, search, ...baseResult };
    }
    if (!matchesCountryFilter(row.country, countryFilter)) {
      return { users: [], page: 1, perPage, total: 0, totalPages: 0, search, ...baseResult };
    }

    return {
      users: [row],
      page: 1,
      perPage,
      total: 1,
      totalPages: 1,
      search,
      ...baseResult,
    };
  }

  if (search) {
    const matched: AdminUserRow[] = [];
    let scanPage = 1;
    const scanPerPage = 200;
    const maxPages = 10;

    while (scanPage <= maxPages && matched.length < perPage * 3) {
      const { data: authPage, error } = await admin.auth.admin.listUsers({
        page: scanPage,
        perPage: scanPerPage,
      });
      if (error || !authPage.users.length) break;

      const ids = authPage.users.map((user) => user.id);
      const { data: profiles } = await admin
        .from("profiles")
        .select("*")
        .in("id", ids)
        .gte("created_at", range.from.toISOString())
        .lt("created_at", range.to.toISOString());
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      for (const authUser of authPage.users) {
        const profile = profileMap.get(authUser.id);
        if (!profile) continue;

        const email = authUser.email?.toLowerCase() ?? "";
        const idMatch = authUser.id.toLowerCase().includes(search);
        const emailMatch = email.includes(search);
        if (!idMatch && !emailMatch) continue;

        const row = mapUserRow(
          { id: authUser.id, email: authUser.email, created_at: authUser.created_at },
          profile
        );
        if (!matchesCountryFilter(row.country, countryFilter)) continue;

        matched.push(row);
      }

      if (authPage.users.length < scanPerPage) break;
      scanPage += 1;
    }

    const start = (page - 1) * perPage;
    const users = matched.slice(start, start + perPage);

    return {
      users,
      page,
      perPage,
      total: matched.length,
      totalPages: Math.max(1, Math.ceil(matched.length / perPage)),
      search,
      ...baseResult,
    };
  }

  const offset = (page - 1) * perPage;
  let profileQuery = profilesInRangeQuery(admin, range).order("created_at", {
    ascending: false,
  });

  if (countryFilter && countryFilter !== "all") {
    if (countryFilter === COUNTRY_UNKNOWN) {
      profileQuery = profileQuery.or("country.is.null,country.eq.unknown");
    } else {
      profileQuery = profileQuery.eq("country", countryFilter.toUpperCase());
    }
  }

  const { data: profiles, count, error } = await profileQuery.range(
    offset,
    offset + perPage - 1
  );

  if (error) {
    throw new Error(error.message);
  }

  const users = await rowsFromProfiles(profiles ?? []);
  const total = count ?? users.length;

  return {
    users,
    page,
    perPage,
    total,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
    search,
    ...baseResult,
  };
}

export function getAdminEmailsHint(): string {
  const emails = getAdminEmails();
  return emails.length ? emails.join(", ") : "Configured via ADMIN_EMAILS";
}
