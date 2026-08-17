import { cookies } from "next/headers";
import {
  COUNTRY_GEO_COOKIE,
  COUNTRY_UNKNOWN,
  isKnownCountryCode,
  parseCountryGeoCookie,
  type CountryGeoCookie,
} from "@/lib/country-geo";
import {
  adoptCountryCookieOntoNewAccount,
  persistCountryAssignment,
  readProfileCountry,
} from "@/lib/country-geo-persist";

export type ResolvedCountryGeo = {
  country: string;
  visitorId: string | null;
  attributed: boolean;
};

function readCookieFromStore(): CountryGeoCookie | null {
  try {
    return parseCountryGeoCookie(cookies().get(COUNTRY_GEO_COOKIE)?.value);
  } catch {
    return null;
  }
}

function unattributed(): ResolvedCountryGeo {
  return { country: COUNTRY_UNKNOWN, visitorId: null, attributed: false };
}

export async function resolveCountryGeo(params: {
  userId?: string | null;
}): Promise<ResolvedCountryGeo> {
  const cookie = readCookieFromStore();

  if (params.userId) {
    const profile = await readProfileCountry(params.userId);
    if (profile.country && isKnownCountryCode(profile.country)) {
      if (cookie) {
        await persistCountryAssignment({
          visitorId: cookie.visitorId,
          country: profile.country,
          userId: params.userId,
        });
      }
      return {
        country: profile.country,
        visitorId: cookie?.visitorId ?? null,
        attributed: true,
      };
    }

    const adopted = await adoptCountryCookieOntoNewAccount({
      userId: params.userId,
      cookie,
    });
    if (adopted) {
      return {
        country: adopted,
        visitorId: cookie?.visitorId ?? null,
        attributed: true,
      };
    }

    return unattributed();
  }

  if (cookie) {
    await persistCountryAssignment({
      visitorId: cookie.visitorId,
      country: cookie.country,
    });
    return {
      country: cookie.country,
      visitorId: cookie.visitorId,
      attributed: true,
    };
  }

  return unattributed();
}
