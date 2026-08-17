import { createAdminClient } from "@/lib/supabase/admin";
import {
  COUNTRY_UNKNOWN,
  isKnownCountryCode,
  isNewAccountForCountryGeo,
  normalizeCountryCode,
  type CountryGeoCookie,
} from "@/lib/country-geo";

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

export async function persistCountryAssignment(params: {
  visitorId: string;
  country: string;
  userId?: string | null;
}): Promise<void> {
  if (!isKnownCountryCode(params.country)) return;

  try {
    const admin = createAdminClient();
    const { data: existing, error: readError } = await admin
      .from("country_assignments")
      .select("id, country, user_id")
      .eq("visitor_id", params.visitorId)
      .maybeSingle();

    if (isMissingRelation(readError)) return;
    if (readError && !existing) {
      console.error("[country-geo] assignment read failed:", readError.message);
      return;
    }

    if (!existing) {
      const { error: insertError } = await admin.from("country_assignments").insert({
        visitor_id: params.visitorId,
        country: params.country,
        user_id: params.userId ?? null,
      });
      if (insertError && !isMissingRelation(insertError) && insertError.code !== "23505") {
        console.error("[country-geo] assignment insert failed:", insertError.message);
      }
      return;
    }

    if (params.userId && !existing.user_id && existing.country === params.country) {
      const { error: updateError } = await admin
        .from("country_assignments")
        .update({ user_id: params.userId })
        .eq("id", existing.id)
        .is("user_id", null);
      if (updateError && !isMissingRelation(updateError)) {
        console.error("[country-geo] assignment attach user failed:", updateError.message);
      }
    }
  } catch (err) {
    console.error("[country-geo] assignment persist threw:", err);
  }
}

export async function readProfileCountry(
  userId: string
): Promise<{ country: string | null; createdAt: string | null }> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("profiles")
      .select("country, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return { country: null, createdAt: null };
    }
    return {
      country: normalizeCountryCode(data.country) ?? (data.country ? COUNTRY_UNKNOWN : null),
      createdAt: data.created_at ?? null,
    };
  } catch {
    return { country: null, createdAt: null };
  }
}

export async function writeProfileCountry(userId: string, country: string): Promise<void> {
  if (!isKnownCountryCode(country)) return;

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("profiles")
      .update({ country })
      .eq("id", userId)
      .is("country", null);
    if (error && !isMissingRelation(error)) {
      console.error("[country-geo] profile write failed:", error.message);
    }
  } catch (err) {
    console.error("[country-geo] profile write threw:", err);
  }
}

export async function resolveCountryForUserId(
  userId: string | null | undefined
): Promise<string | null> {
  if (!userId) return null;
  const { country } = await readProfileCountry(userId);
  if (country && country !== COUNTRY_UNKNOWN) return country;
  return country;
}

export async function adoptCountryCookieOntoNewAccount(params: {
  userId: string;
  cookie: CountryGeoCookie | null;
}): Promise<string | null> {
  const profile = await readProfileCountry(params.userId);
  if (profile.country && profile.country !== COUNTRY_UNKNOWN) {
    return profile.country;
  }

  if (!params.cookie || !isNewAccountForCountryGeo(profile.createdAt)) {
    return null;
  }

  await writeProfileCountry(params.userId, params.cookie.country);
  await persistCountryAssignment({
    visitorId: params.cookie.visitorId,
    country: params.cookie.country,
    userId: params.userId,
  });
  return params.cookie.country;
}
