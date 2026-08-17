import { createAdminClient } from "@/lib/supabase/admin";
import {
  isNewAccountForPaywallAb,
  isPaywallVariant,
  type PaywallAbCookie,
  type PaywallVariant,
} from "@/lib/paywall-ab";

function isMissingRelation(error: { message?: string; code?: string } | null | undefined): boolean {
  if (!error) return false;
  const message = (error.message ?? "").toLowerCase();
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    message.includes("does not exist") ||
    message.includes("schema cache")
  );
}

export async function persistPaywallAssignment(params: {
  visitorId: string;
  variant: PaywallVariant;
  userId?: string | null;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("paywall_assignments")
      .select("id, variant, user_id")
      .eq("visitor_id", params.visitorId)
      .maybeSingle();

    if (isMissingRelation(readError)) return;
    if (readError && !existing) {
      console.error("[paywall-ab] assignment read failed:", readError.message);
      return;
    }

    if (!existing) {
      const { error: insertError } = await admin.from("paywall_assignments").insert({
        visitor_id: params.visitorId,
        variant: params.variant,
        user_id: params.userId ?? null,
      });
      if (insertError && !isMissingRelation(insertError) && insertError.code !== "23505") {
        console.error("[paywall-ab] assignment insert failed:", insertError.message);
      }
      return;
    }

    // Sticky: never change variant. Attach user_id once if this visitor signs up.
    if (params.userId && !existing.user_id && existing.variant === params.variant) {
      const { error: updateError } = await admin
        .from("paywall_assignments")
        .update({ user_id: params.userId })
        .eq("id", existing.id)
        .is("user_id", null);
      if (updateError && !isMissingRelation(updateError)) {
        console.error("[paywall-ab] assignment attach user failed:", updateError.message);
      }
    }
  } catch (err) {
    console.error("[paywall-ab] assignment persist threw:", err);
  }
}

export async function readProfilePaywallVariant(
  userId: string
): Promise<{ variant: PaywallVariant | null; createdAt: string | null }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("paywall_variant, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return { variant: null, createdAt: null };
    }
    return {
      variant: isPaywallVariant(data.paywall_variant) ? data.paywall_variant : null,
      createdAt: data.created_at ?? null,
    };
  } catch {
    return { variant: null, createdAt: null };
  }
}

export async function writeProfilePaywallVariant(
  userId: string,
  variant: PaywallVariant
): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ paywall_variant: variant })
      .eq("id", userId)
      .is("paywall_variant", null);
    if (error && !isMissingRelation(error)) {
      console.error("[paywall-ab] profile variant write failed:", error.message);
    }
  } catch (err) {
    console.error("[paywall-ab] profile variant write threw:", err);
  }
}

export async function resolveVariantForUserId(
  userId: string | null | undefined
): Promise<PaywallVariant | null> {
  if (!userId) return null;
  const { variant } = await readProfilePaywallVariant(userId);
  return variant;
}

export async function adoptCookieOntoNewAccount(params: {
  userId: string;
  cookie: PaywallAbCookie | null;
}): Promise<PaywallVariant | null> {
  const profile = await readProfilePaywallVariant(params.userId);
  if (profile.variant) return profile.variant;

  if (!params.cookie || !isNewAccountForPaywallAb(profile.createdAt)) {
    return null;
  }

  await writeProfilePaywallVariant(params.userId, params.cookie.variant);
  await persistPaywallAssignment({
    visitorId: params.cookie.visitorId,
    variant: params.cookie.variant,
    userId: params.userId,
  });
  return params.cookie.variant;
}
