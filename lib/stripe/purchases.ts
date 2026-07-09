import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Grant a one-time series unlock. Called ONLY from the Stripe webhook after a
 * verified `checkout.session.completed` (mode=payment). Idempotent on
 * (user_id, series_id) so webhook retries never double-insert.
 */
export async function grantSeriesPurchase(params: {
  userId: string;
  seriesId: string;
  customerId?: string | null;
  sessionId?: string | null;
  paymentIntentId?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
}): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from("series_purchases").upsert(
    {
      user_id: params.userId,
      series_id: params.seriesId,
      stripe_customer_id: params.customerId ?? null,
      stripe_session_id: params.sessionId ?? null,
      stripe_payment_intent_id: params.paymentIntentId ?? null,
      amount_total: params.amountTotal ?? null,
      currency: params.currency ?? null,
    },
    { onConflict: "user_id,series_id", ignoreDuplicates: true }
  );

  if (error) {
    throw new Error(`grantSeriesPurchase failed: ${error.message}`);
  }
}

/** Whether a signed-in user has bought a one-time unlock for a series. */
export async function userOwnsSeries(
  supabase: SupabaseClient,
  userId: string,
  seriesId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("series_purchases")
    .select("id")
    .eq("user_id", userId)
    .eq("series_id", seriesId)
    .maybeSingle();
  if (error) {
    // Table not migrated yet — treat as no purchase until 020 is applied.
    if (error.code === "42P01" || error.message.includes("series_purchases")) {
      return false;
    }
    throw new Error(`userOwnsSeries failed: ${error.message}`);
  }
  return !!data;
}
