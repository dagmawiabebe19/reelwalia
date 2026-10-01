import type { PaywallPromoDisplay } from "@/lib/paywall/promo";

/** Quiet, substantiated promo line. Renders nothing without real promo/cap data. */
export function PaywallPromoBanner({ promo }: { promo: PaywallPromoDisplay | null }) {
  if (!promo) return null;
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-center text-xs text-zinc-300"
      data-testid="paywall-promo"
    >
      {promo.discount && (
        <span>
          <span className="font-semibold text-white">{promo.discount.label}:</span>{" "}
          <s className="text-zinc-500" aria-label={`was ${promo.discount.original}`}>
            {promo.discount.original}
          </s>{" "}
          <span className="font-semibold text-white">{promo.discount.current}</span>
        </span>
      )}
      {promo.cap && <span>{promo.cap.text}</span>}
    </div>
  );
}
