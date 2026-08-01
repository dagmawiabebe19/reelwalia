import { createAdminClient } from "@/lib/supabase/admin";

/** Easy-to-tune chat cost / abuse caps. */
export const CHAT_LIMITS = {
  /** Anti-hammer: max model calls per user per UTC minute. */
  perMinute: 20,
  /** Anti-hammer: max model calls per user per UTC hour. */
  perHour: 100,
  /** Cost control: free-tier daily model calls (UTC day). */
  dailyFree: 50,
  /**
   * Future premium daily cap. Use Number.POSITIVE_INFINITY (or a high int)
   * when wiring subscription tiers — getDailyCapForUser reads this.
   */
  dailyPremium: 500,
  /** Reject absurdly long inputs before they hit Anthropic. */
  maxMessageChars: 2000,
} as const;

export type ChatQuotaReason =
  | "per_minute"
  | "per_hour"
  | "daily"
  | "global_daily"
  | "invalid_user";

export type ChatQuotaResult =
  | { allowed: true }
  | { allowed: false; reason: ChatQuotaReason };

const FRIENDLY: Record<ChatQuotaReason, string> = {
  per_minute:
    "You're sending messages very fast — take a breath and try again in a moment.",
  per_hour:
    "You're sending messages very fast — take a breath and try again in a moment.",
  daily: "You've reached today's chat limit. Come back tomorrow.",
  global_daily: "Chat is taking a break, back soon.",
  invalid_user: "Unable to start chat right now. Please try again.",
};

export function friendlyQuotaMessage(reason: ChatQuotaReason): string {
  return FRIENDLY[reason] ?? FRIENDLY.invalid_user;
}

export function getGlobalDailyCap(): number {
  const raw = process.env.CHAT_GLOBAL_DAILY_CAP?.trim();
  if (!raw) return 0; // disabled until configured
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Resolve per-user daily cap. Structured for a future premium tier —
 * pass `isPremium` when subscription gating is wired.
 */
export function getDailyCapForUser(options?: { isPremium?: boolean }): number {
  if (options?.isPremium) return CHAT_LIMITS.dailyPremium;
  return CHAT_LIMITS.dailyFree;
}

type RpcPayload = {
  allowed?: boolean;
  reason?: string | null;
  global_count?: number;
};

/**
 * Atomically check + consume one model-call unit via service-role RPC.
 * Call this only when you are about to invoke Anthropic — blocked attempts
 * do not increment counters.
 */
export async function tryConsumeChatQuota(options: {
  userId: string;
  dailyCap: number;
}): Promise<ChatQuotaResult> {
  const admin = createAdminClient();
  const globalCap = getGlobalDailyCap();

  const { data, error } = await admin.rpc("chat_try_consume_quota", {
    p_user_id: options.userId,
    p_minute_limit: CHAT_LIMITS.perMinute,
    p_hour_limit: CHAT_LIMITS.perHour,
    p_day_limit: options.dailyCap,
    p_global_day_limit: globalCap,
  });

  if (error) {
    console.error("chat_try_consume_quota:", error.message);
    // Fail closed on quota infrastructure errors — avoid unbounded Anthropic spend
    return { allowed: false, reason: "invalid_user" };
  }

  const payload = (data ?? {}) as RpcPayload;
  if (payload.allowed) return { allowed: true };

  const reason = (payload.reason ?? "invalid_user") as ChatQuotaReason;
  if (reason === "global_daily") {
    console.error(
      "[chat] GLOBAL daily kill-switch tripped",
      JSON.stringify({
        userId: options.userId,
        globalCap,
        globalCount: payload.global_count ?? null,
        at: new Date().toISOString(),
      })
    );
  }

  if (
    reason === "per_minute" ||
    reason === "per_hour" ||
    reason === "daily" ||
    reason === "global_daily" ||
    reason === "invalid_user"
  ) {
    return { allowed: false, reason };
  }

  return { allowed: false, reason: "invalid_user" };
}

export function quotaHttpStatus(reason: ChatQuotaReason): number {
  if (reason === "daily" || reason === "global_daily") return 403;
  if (reason === "invalid_user") return 503;
  return 429;
}
