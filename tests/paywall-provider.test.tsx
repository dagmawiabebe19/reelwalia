import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  NO_PROVIDER_AVAILABLE_REASON,
  paywallProviderState,
  resolveInitialProvider,
} from "@/lib/paywall/provider-state";
import { PaywallProviderPicker } from "@/components/paywall/PaywallProviderPicker";
import { PaywallCheckoutCta } from "@/components/paywall/PaywallCheckoutCta";
import { DEFAULT_PAYWALL_PLAN, PaywallPlanList } from "@/components/paywall/PaywallPlanList";
import { formatEtb, getChapaPlan, type PaymentAvailability, type PaymentProvider } from "@/lib/payments/pricing";

const noop = () => {};

function renderPaywall(availability: PaymentAvailability, preferred: PaymentProvider) {
  const state = paywallProviderState({
    availability,
    selected: resolveInitialProvider(preferred, availability),
  });
  const html = renderToStaticMarkup(
    <>
      <PaywallProviderPicker heading="Pay with" tabs={state.tabs} selected={state.selected} onSelect={noop} />
      <PaywallPlanList provider={state.selected ?? "stripe"} selected={DEFAULT_PAYWALL_PLAN} onSelect={noop} />
      <PaywallCheckoutCta
        state={state}
        plan={DEFAULT_PAYWALL_PLAN}
        loading={false}
        error={null}
        isAuthenticated
        onCheckout={noop}
      />
    </>
  );
  return { state, html };
}

function ctaButton(html: string): string {
  const match = html.match(/<button[^>]*data-provider="[^"]*"[^>]*>[\s\S]*?<\/button>/g);
  const cta = match?.find((b) => b.includes("Get Full Access"));
  if (!cta) throw new Error("CTA not rendered");
  return cta;
}

function tab(html: string, provider: PaymentProvider): string {
  const m = html.match(new RegExp(`<button[^>]*role="radio"[^>]*data-provider="${provider}"[^>]*>[\\s\\S]*?</button>`));
  if (!m) throw new Error(`tab ${provider} not rendered`);
  return m[0];
}

describe("paywall provider availability", () => {
  it("chapa unavailable: defaults to card even when Telebirr is preferred", () => {
    expect(resolveInitialProvider("chapa", { stripe: true, chapa: false })).toBe("stripe");
  });

  it("chapa unavailable: Telebirr tab disabled, single note, no actionable ETB CTA", () => {
    const { state, html } = renderPaywall({ stripe: true, chapa: false }, "chapa");

    expect(state.selected).toBe("stripe");
    expect(tab(html, "chapa")).toMatch(/disabled=""/);
    expect(tab(html, "chapa")).toContain('aria-checked="false"');
    expect(tab(html, "stripe")).toContain('aria-checked="true"');
    expect(html.split("Telebirr unavailable right now").length - 1).toBe(1);

    const cta = ctaButton(html);
    expect(cta).toContain('data-provider="stripe"');
    expect(cta).not.toMatch(/disabled=""/);
    expect(html).not.toContain("ETB");
  });

  it("chapa available: Telebirr selectable and the CTA is a live ETB checkout", () => {
    const { state, html } = renderPaywall({ stripe: true, chapa: true }, "chapa");

    expect(state.selected).toBe("chapa");
    expect(tab(html, "chapa")).not.toMatch(/disabled=""/);
    expect(html).not.toContain("unavailable right now");

    const cta = ctaButton(html);
    expect(cta).toContain('data-provider="chapa"');
    expect(cta).not.toMatch(/disabled=""/);
    expect(cta).toContain(formatEtb(getChapaPlan(DEFAULT_PAYWALL_PLAN).etbAmount));
  });

  it("an unavailable selection never stays selected", () => {
    const state = paywallProviderState({ availability: { stripe: true, chapa: false }, selected: "chapa" });
    expect(state.selected).toBe("stripe");
    expect(state.cta.enabled).toBe(true);
  });

  it("stripe unavailable: symmetric fallback to Telebirr", () => {
    const { state, html } = renderPaywall({ stripe: false, chapa: true }, "stripe");
    expect(state.selected).toBe("chapa");
    expect(tab(html, "stripe")).toMatch(/disabled=""/);
    expect(html.split("Card payments unavailable right now").length - 1).toBe(1);
    expect(ctaButton(html)).toContain('data-provider="chapa"');
  });

  it("no provider available: CTA disabled with a reason", () => {
    const { state, html } = renderPaywall({ stripe: false, chapa: false }, "chapa");
    expect(state.selected).toBeNull();
    expect(state.cta).toEqual({ enabled: false, disabledReason: NO_PROVIDER_AVAILABLE_REASON });

    const cta = ctaButton(html);
    expect(cta).toMatch(/disabled=""/);
    expect(cta).toContain('data-provider="none"');
    expect(html).toContain(NO_PROVIDER_AVAILABLE_REASON);
    expect(html).not.toContain("ETB");
  });
});

describe("paywall plan emphasis", () => {
  it("1-Month is the default and the only featured plan", () => {
    expect(DEFAULT_PAYWALL_PLAN).toBe("1month");
    const html = renderToStaticMarkup(
      <PaywallPlanList provider="stripe" selected={DEFAULT_PAYWALL_PLAN} onSelect={noop} />
    );
    expect(html.split('data-featured="true"').length - 1).toBe(1);
    expect(html).toMatch(/data-plan="1month"[^>]*data-featured="true"|data-featured="true"[^>]*data-plan="1month"/);
    expect(html).toContain("Most Popular");
    expect(html).toContain('data-plan="1week"');
    expect(html).toContain('data-plan="2week"');
  });
});
