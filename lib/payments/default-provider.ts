import "server-only";

import { cookies, headers } from "next/headers";
import {
  COUNTRY_GEO_COOKIE,
  countryFromRequestHeaders,
  parseCountryGeoCookie,
} from "@/lib/country-geo";
import type { PaymentProvider } from "@/lib/payments/pricing";

/** Preselect Telebirr/Chapa for Ethiopian visitors; card everywhere else. Read-only. */
export function resolveDefaultPaymentProvider(): PaymentProvider {
  try {
    const country =
      parseCountryGeoCookie(cookies().get(COUNTRY_GEO_COOKIE)?.value)?.country ??
      countryFromRequestHeaders(headers());
    return country === "ET" ? "chapa" : "stripe";
  } catch {
    return "stripe";
  }
}
