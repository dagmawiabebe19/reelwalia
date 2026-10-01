import type { PlanKey } from "@/lib/payments/pricing";

export type StartChapaCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; authRequired: boolean; providerUnavailable: boolean; message: string };

/** Browser helper: asks the server to create a Chapa checkout. The server sets the price. */
export async function startChapaCheckout(
  plan: PlanKey,
  episodeId?: string | null
): Promise<StartChapaCheckoutResult> {
  try {
    const res = await fetch("/api/payments/chapa/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan, episodeId: episodeId ?? null }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
      code?: string;
    };
    if (res.ok && json.url) return { ok: true, url: json.url };
    return {
      ok: false,
      authRequired: res.status === 401 || json.code === "auth_required",
      providerUnavailable: json.code === "provider_unavailable",
      message: json.error ?? "Could not start payment. Please try again.",
    };
  } catch {
    return {
      ok: false,
      authRequired: false,
      providerUnavailable: false,
      message: "Network error. Please try again.",
    };
  }
}
