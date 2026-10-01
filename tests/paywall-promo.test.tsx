import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PAYWALL_PROMO, resolvePaywallPromo, type PaywallPromoConfig } from "@/lib/paywall/promo";
import { PaywallPromoBanner } from "@/components/paywall/PaywallPromoBanner";
import { formatEtb, getChapaPlan } from "@/lib/payments/pricing";
import { formatUsd, getPlanDisplay } from "@/lib/stripe/plans";
import * as paywallCopy from "@/lib/paywall-copy";

const render = (promo: ReturnType<typeof resolvePaywallPromo>) =>
  renderToStaticMarkup(<PaywallPromoBanner promo={promo} />);

const struck = (text: string) =>
  new RegExp(`<s[^>]*>${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}</s>`);

describe("paywall promo", () => {
  it("no genuine promo is configured by default", () => {
    expect(PAYWALL_PROMO).toBeNull();
  });

  it("no data: no banner and no scarcity/discount copy", () => {
    const promo = resolvePaywallPromo({ provider: "stripe", plan: "1month" });
    expect(promo).toBeNull();
    const html = render(promo);
    expect(html).toBe("");
    expect(html).not.toMatch(/spots left/i);
    expect(html).not.toMatch(/discount/i);
  });

  it("fabricated scarcity copy no longer exists in the paywall copy module", () => {
    const allCopy = JSON.stringify(paywallCopy);
    expect(allCopy).not.toMatch(/spots left/i);
    expect(allCopy).not.toMatch(/discount for the next/i);
  });

  it("promo data: original price struck through next to the real promo price", () => {
    const config: PaywallPromoConfig = {
      label: "Launch price",
      originalPriceMinor: { stripe: { "1month": 800 }, chapa: { "1month": 90000 } },
    };

    const usd = resolvePaywallPromo({ provider: "stripe", plan: "1month", config });
    const usdHtml = render(usd);
    expect(usdHtml).toMatch(struck(formatUsd(8)));
    expect(usdHtml).toContain(formatUsd(getPlanDisplay("1month").amount));

    const etb = resolvePaywallPromo({ provider: "chapa", plan: "1month", config });
    const etbHtml = render(etb);
    expect(etbHtml).toMatch(struck(formatEtb(900)));
    expect(etbHtml).toContain(formatEtb(getChapaPlan("1month").etbAmount));
  });

  it("an 'original' price that is not higher than the charged price is ignored", () => {
    const config: PaywallPromoConfig = {
      label: "Launch price",
      originalPriceMinor: { stripe: { "1month": getPlanDisplay("1month").amountCents } },
    };
    expect(resolvePaywallPromo({ provider: "stripe", plan: "1month", config })).toBeNull();
    expect(resolvePaywallPromo({ provider: "stripe", plan: "1week", config })).toBeNull();
  });

  it("cap data: displayed count matches the source", () => {
    const promo = resolvePaywallPromo({
      provider: "stripe",
      plan: "1month",
      config: null,
      cap: { total: 1000, claimed: 412 },
    });
    expect(promo?.cap).toEqual({ claimed: 412, total: 1000, text: "412 of 1,000 launch passes claimed" });
    expect(render(promo)).toContain("412 of 1,000 launch passes claimed");
  });

  it("invalid or exhausted caps render nothing", () => {
    for (const cap of [
      { total: 0, claimed: 0 },
      { total: 100, claimed: 100 },
      { total: 100, claimed: -1 },
      { total: 100.5, claimed: 3 },
    ]) {
      expect(resolvePaywallPromo({ provider: "stripe", plan: "1month", config: null, cap })).toBeNull();
    }
  });
});
