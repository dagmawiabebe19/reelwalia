import { cookies } from "next/headers";
import {
  TRAFFIC_SOURCE_COOKIE,
  TRAFFIC_SOURCE_UNKNOWN,
  isAttributableTrafficSource,
  parseTrafficSourceCookie,
  type TrafficSource,
  type TrafficSourceCookie,
} from "@/lib/traffic-source";
import {
  adoptTrafficCookieOntoNewAccount,
  persistTrafficAssignment,
  readProfileTrafficSource,
} from "@/lib/traffic-source-persist";

export type ResolvedTrafficSource = {
  source: TrafficSource;
  visitorId: string | null;
  attributed: boolean;
};

function readCookieFromStore(): TrafficSourceCookie | null {
  try {
    return parseTrafficSourceCookie(cookies().get(TRAFFIC_SOURCE_COOKIE)?.value);
  } catch {
    return null;
  }
}

function unattributed(): ResolvedTrafficSource {
  return { source: TRAFFIC_SOURCE_UNKNOWN, visitorId: null, attributed: false };
}

/**
 * Server-component / route-handler resolution.
 * Cookie assignment happens in middleware. Profile wins for signed-in users.
 */
export async function resolveTrafficSource(params: {
  userId?: string | null;
}): Promise<ResolvedTrafficSource> {
  const cookie = readCookieFromStore();

  if (params.userId) {
    const profile = await readProfileTrafficSource(params.userId);
    if (profile.source && isAttributableTrafficSource(profile.source)) {
      if (cookie) {
        await persistTrafficAssignment({
          visitorId: cookie.visitorId,
          source: profile.source,
          userId: params.userId,
          utmSource: cookie.utmSource,
          utmMedium: cookie.utmMedium,
          utmCampaign: cookie.utmCampaign,
          referrer: cookie.referrer,
        });
      }
      return {
        source: profile.source,
        visitorId: cookie?.visitorId ?? null,
        attributed: true,
      };
    }

    const adopted = await adoptTrafficCookieOntoNewAccount({
      userId: params.userId,
      cookie,
    });
    if (adopted) {
      return {
        source: adopted,
        visitorId: cookie?.visitorId ?? null,
        attributed: true,
      };
    }

    return unattributed();
  }

  if (cookie) {
    await persistTrafficAssignment({
      visitorId: cookie.visitorId,
      source: cookie.source,
      utmSource: cookie.utmSource,
      utmMedium: cookie.utmMedium,
      utmCampaign: cookie.utmCampaign,
      referrer: cookie.referrer,
    });
    return {
      source: cookie.source,
      visitorId: cookie.visitorId,
      attributed: true,
    };
  }

  return unattributed();
}
