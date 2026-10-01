import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

export interface ViewerAccess {
  active: boolean;
  /** Which provider is currently granting access (Stripe wins if both). */
  provider: "stripe" | "chapa" | null;
  stripeActive: boolean;
  chapa: {
    active: boolean;
    periodEnd: string | null;
    plan: string | null;
  };
}

const NO_ACCESS: ViewerAccess = {
  active: false,
  provider: null,
  stripeActive: false,
  chapa: { active: false, periodEnd: null, plan: null },
};

function isMissingSchema(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message ?? "").toLowerCase();
  return error.code === "42703" || error.code === "42P01" || msg.includes("does not exist");
}

/**
 * Single decision point for paid access, regardless of provider. Reads with the
 * service-role client so it cannot be influenced by client state.
 *
 * Stripe: profiles.subscription_status (maintained by the Stripe webhook) — unchanged.
 * Chapa:  subscriptions row (provider='chapa') active with current_period_end > now.
 *
 * Expiry is check-on-read: an active Chapa row past its end is flipped to
 * 'expired' here. A scheduled job (Supabase cron / Vercel cron) can run the
 * same UPDATE in bulk later.
 */
export async function getViewerAccess(userId: string | null | undefined): Promise<ViewerAccess> {
  if (!userId) return NO_ACCESS;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("subscription_status")
    .eq("id", userId)
    .maybeSingle();
  const stripeActive =
    profile?.subscription_status === "active" || profile?.subscription_status === "trialing";

  let chapa: ViewerAccess["chapa"] = { active: false, periodEnd: null, plan: null };
  const { data: chapaRow, error } = await admin
    .from("subscriptions")
    .select("id, status, plan, current_period_end")
    .eq("user_id", userId)
    .eq("provider", "chapa")
    .maybeSingle();

  if (error && !isMissingSchema(error)) {
    console.error("[access] chapa entitlement read failed:", error.message);
  }

  if (chapaRow) {
    const endMs = chapaRow.current_period_end ? Date.parse(chapaRow.current_period_end) : NaN;
    const notExpired = Number.isFinite(endMs) && endMs > Date.now();
    const active = chapaRow.status === "active" && notExpired;

    if (chapaRow.status === "active" && !notExpired) {
      const { error: expireError } = await admin
        .from("subscriptions")
        .update({ status: "expired" })
        .eq("id", chapaRow.id)
        .eq("status", "active");
      if (expireError) {
        console.warn("[access] lazy expire failed:", expireError.message);
      }
    }

    chapa = {
      active,
      periodEnd: chapaRow.current_period_end ?? null,
      plan: chapaRow.plan ?? null,
    };
  }

  const active = stripeActive || chapa.active;
  return {
    active,
    provider: stripeActive ? "stripe" : chapa.active ? "chapa" : null,
    stripeActive,
    chapa,
  };
}

export async function hasActiveAccess(userId: string | null | undefined): Promise<boolean> {
  return (await getViewerAccess(userId)).active;
}
