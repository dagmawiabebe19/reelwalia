"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function sendMagicLinkAction(
  email: string,
  redirectTo: string
): Promise<{ ok: true } | { error: string }> {
  const normalized = email.trim().toLowerCase();
  if (!normalized || !EMAIL_RE.test(normalized)) {
    return { error: "Enter a valid email address." };
  }

  const safeRedirect = redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  const headerStore = await headers();
  const ip =
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip")?.trim() ||
    "unknown";

  const ipLimit = checkRateLimit(`magic-link:ip:${ip}`, 5, 15 * 60_000);
  if (!ipLimit.ok) {
    return { error: "Too many sign-in attempts. Try again in a few minutes." };
  }

  const emailLimit = checkRateLimit(`magic-link:email:${normalized}`, 3, 60 * 60_000);
  if (!emailLimit.ok) {
    return { error: "Too many sign-in attempts for this email. Try again later." };
  }

  const proto = headerStore.get("x-forwarded-proto")?.trim() || "https";
  const host = headerStore.get("x-forwarded-host")?.trim() || headerStore.get("host")?.trim();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (host ? `${proto}://${host}` : "https://reelwalia.com");
  const callbackUrl = `${siteUrl.replace(/\/$/, "")}/auth/callback?next=${encodeURIComponent(safeRedirect)}`;

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalized,
    options: {
      emailRedirectTo: callbackUrl,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}
