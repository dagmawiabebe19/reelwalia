import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanPricing, isPlanKey } from "@/lib/payments/pricing";
import { chapaVerify } from "@/lib/payments/chapa/client";

export type ChapaFulfillStatus = "success" | "pending" | "failed" | "not_found";

export interface ChapaFulfillResult {
  status: ChapaFulfillStatus;
  /** True only on the call that actually granted access. */
  granted: boolean;
  userId: string | null;
  episodeId: string | null;
}

type PaymentRow = {
  id: string;
  user_id: string | null;
  plan: string;
  amount_minor: number;
  currency: string;
  period_days: number | null;
  status: string;
  episode_id: string | null;
};

const PAYMENT_COLUMNS =
  "id, user_id, plan, amount_minor, currency, period_days, status, episode_id";

export async function loadChapaPayment(txRef: string): Promise<PaymentRow | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("payments")
    .select(PAYMENT_COLUMNS)
    .eq("provider", "chapa")
    .eq("provider_tx_ref", txRef)
    .maybeSingle();
  if (error) {
    console.error("[chapa] payment lookup failed:", error.message);
    return null;
  }
  return (data as PaymentRow | null) ?? null;
}

async function markPayment(
  paymentId: string,
  status: "failed" | "canceled",
  reason: string,
  raw?: Record<string, unknown>
) {
  const admin = createAdminClient();
  await admin
    .from("payments")
    .update({
      status,
      failure_reason: reason.slice(0, 500),
      ...(raw ? { raw_event: raw } : {}),
    })
    .eq("id", paymentId)
    .eq("status", "pending");
}

/**
 * Verify-then-grant. Shared by the webhook, the server-to-server callback, and
 * the return-page server action. Idempotent: the DB function flips
 * pending → success exactly once, so only one caller ever grants.
 */
export async function fulfillChapaPayment(
  txRef: string,
  opts?: { rawEvent?: Record<string, unknown> }
): Promise<ChapaFulfillResult> {
  const payment = await loadChapaPayment(txRef);
  if (!payment) {
    return { status: "not_found", granted: false, userId: null, episodeId: null };
  }

  const base = { userId: payment.user_id, episodeId: payment.episode_id };

  if (payment.status === "success") {
    return { status: "success", granted: false, ...base };
  }
  if (payment.status === "refunded" || payment.status === "reversed") {
    return { status: "failed", granted: false, ...base };
  }

  if (!isPlanKey(payment.plan)) {
    console.error("[chapa] payment has unknown plan", { txRef, plan: payment.plan });
    await markPayment(payment.id, "failed", "unknown plan");
    return { status: "failed", granted: false, ...base };
  }

  const verify = await chapaVerify(txRef);
  if (verify.kind === "not_paid") return { status: "pending", granted: false, ...base };
  if (verify.kind === "error") {
    console.error("[chapa] verify error", { txRef, message: verify.message });
    return { status: "pending", granted: false, ...base };
  }

  const tx = verify.tx;
  if (tx.status === "pending") return { status: "pending", granted: false, ...base };
  if (tx.status !== "success") {
    await markPayment(
      payment.id,
      tx.status.includes("cancel") ? "canceled" : "failed",
      `chapa status: ${tx.status}`,
      tx.raw
    );
    return { status: "failed", granted: false, ...base };
  }

  // Amount / currency / reference must match what we stored at checkout.
  const paidMinor = Math.round(tx.amount * 100);
  const config = getPlanPricing("chapa", payment.plan);
  const mismatch =
    tx.txRef !== txRef ||
    tx.currency !== payment.currency.toUpperCase() ||
    paidMinor !== payment.amount_minor ||
    !payment.period_days;
  if (mismatch) {
    console.error("[chapa] verify mismatch — not granting", {
      txRef,
      expected: { amountMinor: payment.amount_minor, currency: payment.currency },
      got: { amountMinor: paidMinor, currency: tx.currency, txRef: tx.txRef },
    });
    await markPayment(payment.id, "failed", "verify mismatch", tx.raw);
    return { status: "failed", granted: false, ...base };
  }
  if (config.amountMinor !== payment.amount_minor) {
    // Price changed after checkout — honour the amount the user actually agreed to and paid.
    console.warn("[chapa] config price differs from checkout price", {
      txRef,
      checkout: payment.amount_minor,
      current: config.amountMinor,
    });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("grant_chapa_entitlement", {
    p_payment_id: payment.id,
    p_provider_payment_id: tx.reference,
    p_raw_event: opts?.rawEvent ?? tx.raw,
  });
  if (error) {
    console.error("[chapa] grant_chapa_entitlement failed", { txRef, error: error.message });
    return { status: "pending", granted: false, ...base };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const granted = Boolean((row as { granted?: boolean } | null)?.granted);
  if (granted) {
    console.info("[chapa] entitlement granted", {
      txRef,
      userId: payment.user_id,
      periodEnd: (row as { period_end?: string } | null)?.period_end,
    });
  }
  return { status: "success", granted, ...base };
}

/** Webhook refund/reversal: mark the payment and end the pass it funded. */
export async function revokeChapaPayment(
  txRef: string,
  status: "refunded" | "reversed",
  raw: Record<string, unknown>
): Promise<void> {
  const admin = createAdminClient();
  const payment = await loadChapaPayment(txRef);
  if (!payment || payment.status === status) return;
  const wasGranted = payment.status === "success";

  await admin
    .from("payments")
    .update({ status, raw_event: raw, failure_reason: `chapa ${status}` })
    .eq("id", payment.id);

  if (!wasGranted || !payment.user_id || !payment.period_days) return;

  // Remove the days this payment added (it may not be the most recent top-up).
  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("user_id", payment.user_id)
    .eq("provider", "chapa")
    .maybeSingle();
  if (!sub?.current_period_end) return;

  const newEnd = new Date(
    Date.parse(sub.current_period_end) - payment.period_days * 24 * 60 * 60 * 1000
  );
  const ended = newEnd.getTime() <= Date.now();
  const { error } = await admin
    .from("subscriptions")
    .update({
      current_period_end: newEnd.toISOString(),
      ...(ended ? { status: "canceled" } : {}),
    })
    .eq("id", sub.id);
  if (error) {
    console.error("[chapa] revoke entitlement update failed", { txRef, error: error.message });
  } else {
    console.info("[chapa] entitlement reduced after", status, { txRef, ended });
  }
}
