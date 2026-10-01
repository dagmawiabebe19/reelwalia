import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { evaluateAccess, type AccessDecision, type EntitlementRow } from "@/lib/payments/access-rules";

export type ViewerAccess = AccessDecision;

const NO_ACCESS: ViewerAccess = evaluateAccess({ profileStatus: null, rows: [] });

/**
 * Single decision point for paid access, regardless of provider. Reads with the
 * service-role client so it cannot be influenced by client state. Rules live in
 * lib/payments/access-rules.ts.
 *
 * Expiry is check-on-read: Chapa rows past their end are flipped to 'expired'
 * here. A scheduled job can run the same UPDATE in bulk later.
 */
export async function getViewerAccess(userId: string | null | undefined): Promise<ViewerAccess> {
  if (!userId) return NO_ACCESS;
  const admin = createAdminClient();

  const [{ data: profile }, { data: rows, error }] = await Promise.all([
    admin.from("profiles").select("subscription_status").eq("id", userId).maybeSingle(),
    admin
      .from("subscriptions")
      .select("id, provider, status, plan, current_period_end")
      .eq("user_id", userId),
  ]);

  if (error) {
    console.error("[access] entitlement read failed:", error.message);
  }

  const decision = evaluateAccess({
    profileStatus: profile?.subscription_status ?? null,
    rows: (rows ?? []) as EntitlementRow[],
  });

  if (decision.chapaRowsToExpire.length > 0) {
    const { error: expireError } = await admin
      .from("subscriptions")
      .update({ status: "expired" })
      .in("id", decision.chapaRowsToExpire)
      .eq("provider", "chapa")
      .eq("status", "active");
    if (expireError) {
      console.warn("[access] lazy expire failed:", expireError.message);
    }
  }

  return decision;
}

export async function hasActiveAccess(userId: string | null | undefined): Promise<boolean> {
  return (await getViewerAccess(userId)).active;
}
