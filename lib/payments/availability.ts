import "server-only";

import { cookies, headers } from "next/headers";
import {
  COUNTRY_GEO_COOKIE,
  countryFromRequestHeaders,
  parseCountryGeoCookie,
} from "@/lib/country-geo";
import { isChapaConfigured } from "@/lib/payments/chapa/client";
import { STRIPE_PLANS } from "@/lib/stripe/plans";
import type { PaymentAvailability, PaymentProvider } from "@/lib/payments/pricing";

/** Stripe can take payments: secret key plus a checkout Price ID for every plan. */
export function isStripeConfigured(): boolean {
  if (!process.env.STRIPE_SECRET_KEY?.trim()) return false;
  return STRIPE_PLANS.every((plan) => Boolean(process.env[plan.priceEnvKey]?.trim()));
}

/** Single source of truth for which providers the paywall may offer. Booleans only. */
export function getPaymentAvailability(): PaymentAvailability {
  return { stripe: isStripeConfigured(), chapa: isChapaConfigured() };
}

function viewerCountry(): string | null {
  try {
    return (
      parseCountryGeoCookie(cookies().get(COUNTRY_GEO_COOKIE)?.value)?.country ??
      countryFromRequestHeaders(headers())
    );
  } catch {
    return null;
  }
}

/** Preferred provider: Telebirr for Ethiopian visitors, card elsewhere (availability applied client-side). */
export function resolvePaywallPayments(): {
  defaultPaymentProvider: PaymentProvider;
  paymentAvailability: PaymentAvailability;
} {
  return {
    defaultPaymentProvider: viewerCountry() === "ET" ? "chapa" : "stripe",
    paymentAvailability: getPaymentAvailability(),
  };
}
