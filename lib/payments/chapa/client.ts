import "server-only";

const DEFAULT_BASE_URL = "https://api.chapa.co";

function getConfig() {
  const secretKey = process.env.CHAPA_SECRET_KEY?.trim();
  if (!secretKey) throw new Error("Missing CHAPA_SECRET_KEY");
  const baseUrl = (process.env.CHAPA_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/$/, "");
  return { secretKey, baseUrl };
}

export function isChapaConfigured(): boolean {
  return Boolean(process.env.CHAPA_SECRET_KEY?.trim());
}

export function isChapaTestMode(): boolean {
  return process.env.CHAPA_SECRET_KEY?.trim().startsWith("CHASECK_TEST-") ?? false;
}

export interface ChapaInitializeParams {
  amount: number;
  currency: "ETB";
  txRef: string;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  callbackUrl: string;
  returnUrl: string;
  title: string;
  description: string;
}

/** Chapa limits: title ≤ 16 chars; description letters/numbers/-/_/space/. only. */
function sanitizeCustomization(title: string, description: string) {
  const clean = (value: string) => value.replace(/[^A-Za-z0-9 ._-]/g, "").trim();
  return {
    title: clean(title).slice(0, 16) || "ReelWalia",
    description: clean(description).slice(0, 120) || "ReelWalia pass",
  };
}

export async function chapaInitialize(
  params: ChapaInitializeParams
): Promise<{ checkoutUrl: string }> {
  const { secretKey, baseUrl } = getConfig();
  const customization = sanitizeCustomization(params.title, params.description);

  const body: Record<string, unknown> = {
    amount: params.amount.toFixed(2),
    currency: params.currency,
    tx_ref: params.txRef,
    callback_url: params.callbackUrl,
    return_url: params.returnUrl,
    customization,
  };
  if (params.email) body.email = params.email;
  if (params.firstName) body.first_name = params.firstName;
  if (params.lastName) body.last_name = params.lastName;

  const res = await fetch(`${baseUrl}/v1/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = (await res.json().catch(() => null)) as {
    status?: string;
    message?: unknown;
    data?: { checkout_url?: string } | null;
  } | null;

  const checkoutUrl = json?.data?.checkout_url;
  if (!res.ok || json?.status !== "success" || !checkoutUrl) {
    throw new Error(
      `Chapa initialize failed (${res.status}): ${JSON.stringify(json?.message ?? json)}`
    );
  }
  return { checkoutUrl };
}

export interface ChapaVerifiedTransaction {
  status: string;
  txRef: string;
  amount: number;
  currency: string;
  reference: string | null;
  mode: string | null;
  raw: Record<string, unknown>;
}

export type ChapaVerifyResult =
  | { kind: "found"; tx: ChapaVerifiedTransaction }
  | { kind: "not_paid" }
  | { kind: "error"; message: string };

/** Source of truth for granting access. */
export async function chapaVerify(txRef: string): Promise<ChapaVerifyResult> {
  const { secretKey, baseUrl } = getConfig();

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/v1/transaction/verify/${encodeURIComponent(txRef)}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
      cache: "no-store",
    });
  } catch (err) {
    return { kind: "error", message: err instanceof Error ? err.message : "network error" };
  }

  const json = (await res.json().catch(() => null)) as {
    status?: string;
    message?: unknown;
    data?: Record<string, unknown> | null;
  } | null;

  if (res.status === 404) return { kind: "not_paid" };
  if (!res.ok || !json?.data) {
    return {
      kind: "error",
      message: `Chapa verify failed (${res.status}): ${JSON.stringify(json?.message ?? json)}`,
    };
  }

  const data = json.data;
  const amount = Number(data.amount);
  return {
    kind: "found",
    tx: {
      status: String(data.status ?? "").toLowerCase(),
      txRef: String(data.tx_ref ?? ""),
      amount: Number.isFinite(amount) ? amount : NaN,
      currency: String(data.currency ?? "").toUpperCase(),
      reference: data.reference != null ? String(data.reference) : null,
      mode: data.mode != null ? String(data.mode) : null,
      raw: data,
    },
  };
}
