/**
 * The single ReelWalia admin (Supabase auth user id in project joqibhmmegycfadipnki).
 * Every admin gate — middleware, pages, API routes, server actions, UI links — and
 * the RLS policies in migration 036 use this id. Client-safe: an id is not a secret,
 * and all enforcement happens server-side.
 */
export const ADMIN_USER_ID = "0102934e-8fa3-4b72-b70d-01d1334febaa";

export function isAdminUserId(userId: string | null | undefined): boolean {
  return userId === ADMIN_USER_ID;
}
