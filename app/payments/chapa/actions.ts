"use server";

import { createClient } from "@/lib/supabase/server";
import { fulfillChapaPayment, loadChapaPayment } from "@/lib/payments/chapa/fulfill";

export type ConfirmChapaResult =
  | { status: "success"; redirectTo: string }
  | { status: "pending" }
  | { status: "failed" }
  | { status: "auth_required" }
  | { status: "not_found" };

const TX_REF_RE = /^[A-Za-z0-9._-]{1,100}$/;

/** Polled by the return page. Grants only after server-side verification. */
export async function confirmChapaPayment(txRef: string): Promise<ConfirmChapaResult> {
  if (typeof txRef !== "string" || !TX_REF_RE.test(txRef)) return { status: "not_found" };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "auth_required" };

  const payment = await loadChapaPayment(txRef);
  if (!payment || payment.user_id !== user.id) return { status: "not_found" };

  try {
    const result = await fulfillChapaPayment(txRef);
    if (result.status === "success") {
      return {
        status: "success",
        redirectTo: result.episodeId
          ? `/watch/${result.episodeId}?subscribed=true`
          : "/account?subscribed=true",
      };
    }
    if (result.status === "failed") return { status: "failed" };
    if (result.status === "not_found") return { status: "not_found" };
    return { status: "pending" };
  } catch (err) {
    console.error("[chapa] confirm error:", err);
    return { status: "pending" };
  }
}
