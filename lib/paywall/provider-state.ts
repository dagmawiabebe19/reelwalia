import type { PaymentAvailability, PaymentProvider } from "@/lib/payments/pricing";

export const PAYWALL_PROVIDER_ORDER: readonly PaymentProvider[] = ["stripe", "chapa"];

export const PROVIDER_UNAVAILABLE_NOTE: Record<PaymentProvider, string> = {
  stripe: "Card payments unavailable right now",
  chapa: "Telebirr unavailable right now",
};

export const NO_PROVIDER_AVAILABLE_REASON =
  "Payments are unavailable right now. Please try again shortly.";

export interface ProviderTabState {
  id: PaymentProvider;
  disabled: boolean;
  /** Single inline note for a disabled tab; null when usable. */
  note: string | null;
}

export interface PaywallProviderState {
  /** Provider the CTA will use, or null when none is usable. */
  selected: PaymentProvider | null;
  tabs: ProviderTabState[];
  cta: { enabled: boolean; disabledReason: string | null };
}

/** First usable provider, honouring the preference only when it is available. */
export function resolveInitialProvider(
  preferred: PaymentProvider,
  availability: PaymentAvailability
): PaymentProvider | null {
  if (availability[preferred]) return preferred;
  return PAYWALL_PROVIDER_ORDER.find((p) => availability[p]) ?? null;
}

/**
 * Never leave the viewer on a selected-but-unusable provider with a live CTA:
 * an unavailable selection falls back to a usable one, or the CTA is disabled.
 */
export function paywallProviderState(input: {
  availability: PaymentAvailability;
  selected: PaymentProvider | null;
}): PaywallProviderState {
  const { availability } = input;
  const selected =
    input.selected && availability[input.selected]
      ? input.selected
      : resolveInitialProvider(input.selected ?? "stripe", availability);

  return {
    selected,
    tabs: PAYWALL_PROVIDER_ORDER.map((id) => ({
      id,
      disabled: !availability[id],
      note: availability[id] ? null : PROVIDER_UNAVAILABLE_NOTE[id],
    })),
    cta: selected
      ? { enabled: true, disabledReason: null }
      : { enabled: false, disabledReason: NO_PROVIDER_AVAILABLE_REASON },
  };
}
