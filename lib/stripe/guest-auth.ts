import { createAdminClient } from "@/lib/supabase/admin";

export async function findUserIdByEmail(email: string): Promise<string | null> {
  const admin = createAdminClient();
  const normalized = email.trim().toLowerCase();

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });

  if (error || !data.user) return null;
  return data.user.id;
}

/** Create Supabase auth user for guest checkout, or return existing user id. */
export async function ensureUserFromEmail(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const existing = await findUserIdByEmail(normalized);
  if (existing) return existing;

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
  });

  if (error) {
    const fallback = await findUserIdByEmail(normalized);
    if (fallback) return fallback;
    throw error;
  }

  return data.user.id;
}
