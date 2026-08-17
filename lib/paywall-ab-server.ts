import { cookies } from "next/headers";
import {
  PAYWALL_AB_CONFIG,
  isNewAccountForPaywallAb,
  parsePaywallAbCookie,
  pickPaywallVariant,
  PAYWALL_AB_COOKIE,
  type PaywallAbCookie,
  type PaywallVariant,
} from "@/lib/paywall-ab";
import {
  adoptCookieOntoNewAccount,
  persistPaywallAssignment,
  readProfilePaywallVariant,
  writeProfilePaywallVariant,
} from "@/lib/paywall-ab-persist";

export type ResolvedPaywallAb = {
  variant: PaywallVariant | null;
  visitorId: string | null;
  inTest: boolean;
};

function readCookieFromStore(): PaywallAbCookie | null {
  try {
    return parsePaywallAbCookie(cookies().get(PAYWALL_AB_COOKIE)?.value);
  } catch {
    return null;
  }
}

/**
 * Server-component / route-handler resolution.
 * Cookie assignment happens in middleware (RSC cannot reliably Set-Cookie).
 * Signed-in profile wins; existing accounts with no variant stay out of the test.
 */
export async function resolvePaywallAb(params: {
  userId?: string | null;
}): Promise<ResolvedPaywallAb> {
  const cookie = readCookieFromStore();

  if (params.userId) {
    const profile = await readProfilePaywallVariant(params.userId);
    if (profile.variant) {
      if (cookie) {
        await persistPaywallAssignment({
          visitorId: cookie.visitorId,
          variant: profile.variant,
          userId: params.userId,
        });
      }
      return {
        variant: profile.variant,
        visitorId: cookie?.visitorId ?? null,
        inTest: true,
      };
    }

    const adopted = await adoptCookieOntoNewAccount({
      userId: params.userId,
      cookie,
    });
    if (adopted) {
      return {
        variant: adopted,
        visitorId: cookie?.visitorId ?? null,
        inTest: true,
      };
    }

    if (PAYWALL_AB_CONFIG.enabled && isNewAccountForPaywallAb(profile.createdAt)) {
      const variant = pickPaywallVariant();
      const visitorId = cookie?.visitorId ?? crypto.randomUUID();
      await writeProfilePaywallVariant(params.userId, variant);
      await persistPaywallAssignment({
        visitorId,
        variant,
        userId: params.userId,
      });
      return { variant, visitorId, inTest: true };
    }

    // Existing signed-in user / subscriber not in the test.
    return { variant: null, visitorId: null, inTest: false };
  }

  if (cookie) {
    await persistPaywallAssignment({
      visitorId: cookie.visitorId,
      variant: cookie.variant,
    });
    return {
      variant: cookie.variant,
      visitorId: cookie.visitorId,
      inTest: true,
    };
  }

  return { variant: null, visitorId: null, inTest: false };
}
