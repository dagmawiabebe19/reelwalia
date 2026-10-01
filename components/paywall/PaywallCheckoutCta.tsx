import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { formatEtb, getChapaPlan, type PlanKey } from "@/lib/payments/pricing";
import type { PaywallProviderState } from "@/lib/paywall/provider-state";
import { formatUsd, getPlanDisplay } from "@/lib/stripe/plans";

/** Primary CTA + terms line. Always reflects a usable provider, or is disabled with the reason. */
export function PaywallCheckoutCta({
  state,
  plan,
  loading,
  error,
  isAuthenticated,
  onCheckout,
}: {
  state: PaywallProviderState;
  plan: PlanKey;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  onCheckout: () => void;
}) {
  const provider = state.selected;
  const stripePlan = getPlanDisplay(plan);
  const chapaPlan = getChapaPlan(plan);
  const price =
    provider === "chapa"
      ? formatEtb(chapaPlan.etbAmount)
      : provider === "stripe"
        ? formatUsd(stripePlan.amount)
        : null;

  return (
    <>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <button
        type="button"
        disabled={loading || !state.cta.enabled}
        aria-disabled={loading || !state.cta.enabled}
        data-provider={provider ?? "none"}
        onClick={state.cta.enabled ? onCheckout : undefined}
        className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-obsidian-red via-red-500 to-obsidian-red py-4 text-base font-extrabold tracking-wide text-white shadow-[0_8px_32px_rgba(224,60,47,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
      >
        {loading ? (
          <>
            <LoadingSpinner className="h-5 w-5" label="Redirecting to checkout" />
            Redirecting…
          </>
        ) : price ? (
          `Get Full Access · ${price}`
        ) : (
          "Get Full Access"
        )}
      </button>

      {!state.cta.enabled && state.cta.disabledReason && (
        <p className="mt-3 text-center text-sm text-zinc-400" role="status">
          {state.cta.disabledReason}
        </p>
      )}

      {provider === "chapa" && (
        <>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-300">
            One-time payment of {formatEtb(chapaPlan.etbAmount)} for {chapaPlan.periodDays} days. No
            auto-renewal — top up anytime from your account.
          </p>
          <p className="mt-2 text-center text-xs text-zinc-500">
            Pay with Telebirr, CBE Birr, M-Pesa or Ethiopian bank cards via Chapa.
          </p>
          {!isAuthenticated && (
            <p className="mt-2 text-center text-sm text-zinc-400">
              You&apos;ll sign in first so your pass is saved to your account.
            </p>
          )}
        </>
      )}

      {provider === "stripe" && (
        <>
          <p className="mt-3 text-center text-sm leading-relaxed text-zinc-300">
            Auto-renews at {formatUsd(stripePlan.amount)}
            {stripePlan.priceSuffix} ({stripePlan.renewalLabel.toLowerCase()}). Cancel anytime in your
            account.
          </p>
          {!isAuthenticated && (
            <p className="mt-2 text-center text-sm text-zinc-400">
              Enter your email in Stripe Checkout — we&apos;ll create your account automatically.
            </p>
          )}
        </>
      )}
    </>
  );
}
