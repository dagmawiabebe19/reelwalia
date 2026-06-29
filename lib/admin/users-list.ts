import { getAdminEmails, isAdminEmail } from "@/lib/admin";
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
};

export type AdminUsersResult = {
  users: AdminUserRow[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
  search: string;
};

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
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
  };
}

export async function fetchAdminUsers(options: {
  page?: number;
  search?: string;
  perPage?: number;
}): Promise<AdminUsersResult> {
  const admin = createAdminClient();
  const page = Math.max(1, options.page ?? 1);
  const perPage = options.perPage ?? 25;
  const search = (options.search ?? "").trim().toLowerCase();

  if (search && isUuid(search)) {
    const { data: authData } = await admin.auth.admin.getUserById(search);
    const authUser = authData.user;
    if (!authUser) {
      return { users: [], page: 1, perPage, total: 0, totalPages: 0, search };
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

    return {
      users: [row],
      page: 1,
      perPage,
      total: 1,
      totalPages: 1,
      search,
    };
  }

  if (search) {
    const matched: AdminUserRow[] = [];
    let scanPage = 1;
    const scanPerPage = 200;
    const maxPages = 10;

    while (scanPage <= maxPages && matched.length < perPage) {
      const { data: authPage, error } = await admin.auth.admin.listUsers({
        page: scanPage,
        perPage: scanPerPage,
      });
      if (error || !authPage.users.length) break;

      const ids = authPage.users.map((user) => user.id);
      const { data: profiles } = await admin.from("profiles").select("*").in("id", ids);
      const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

      for (const authUser of authPage.users) {
        const email = authUser.email?.toLowerCase() ?? "";
        const idMatch = authUser.id.toLowerCase().includes(search);
        const emailMatch = email.includes(search);
        if (!idMatch && !emailMatch) continue;

        matched.push(
          mapUserRow(
            { id: authUser.id, email: authUser.email, created_at: authUser.created_at },
            profileMap.get(authUser.id)
          )
        );
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
    };
  }

  const { data: authPage, error } = await admin.auth.admin.listUsers({ page, perPage });
  if (error) {
    throw new Error(error.message);
  }

  const authUsers = authPage.users;
  const ids = authUsers.map((user) => user.id);
  const { data: profiles } = ids.length
    ? await admin.from("profiles").select("*").in("id", ids)
    : { data: [] as Profile[] };

  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const users = authUsers.map((authUser) =>
    mapUserRow(
      { id: authUser.id, email: authUser.email, created_at: authUser.created_at },
      profileMap.get(authUser.id)
    )
  );

  return {
    users,
    page,
    perPage,
    total: authPage.total ?? users.length,
    totalPages: Math.max(1, Math.ceil((authPage.total ?? users.length) / perPage)),
    search,
  };
}

export function getAdminEmailsHint(): string {
  const emails = getAdminEmails();
  return emails.length ? emails.join(", ") : "Configured via ADMIN_EMAILS";
}
