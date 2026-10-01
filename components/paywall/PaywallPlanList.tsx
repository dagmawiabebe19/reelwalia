import { formatEtb, getChapaPlan, type PaymentProvider, type PlanKey } from "@/lib/payments/pricing";
import {
  STRIPE_PLANS,
  formatDailyPrice,
  formatUsd,
  savingsBadge,
  splitUsdParts,
  type PlanDisplay,
} from "@/lib/stripe/plans";

/** Recommended plan first; the rest keep their configured order. */
export const PAYWALL_PLANS: PlanDisplay[] = [
  ...STRIPE_PLANS.filter((p) => p.mostPopular),
  ...STRIPE_PLANS.filter((p) => !p.mostPopular),
];

export const DEFAULT_PAYWALL_PLAN: PlanKey = PAYWALL_PLANS[0]!.key;

function Radio({ checked }: { checked: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
        checked
          ? "border-obsidian-red bg-obsidian-red shadow-[0_0_10px_rgba(224,60,47,0.55)]"
          : "border-zinc-500"
      }`}
    >
      {checked && <span className="h-2 w-2 rounded-full bg-white" />}
    </span>
  );
}

function Price({ plan, provider, large }: { plan: PlanDisplay; provider: PaymentProvider; large: boolean }) {
  if (provider === "chapa") {
    const chapa = getChapaPlan(plan.key);
    return (
      <div className="shrink-0 text-right">
        <p
          className="flex items-baseline justify-end gap-1 text-white"
          aria-label={`${formatEtb(chapa.etbAmount)} for ${chapa.periodDays} days`}
        >
          <span
            className={`font-display font-extrabold leading-none tracking-wide ${large ? "text-[2rem]" : "text-lg"}`}
          >
            {chapa.etbAmount.toLocaleString("en-US")}
          </span>
          <span className="font-display text-xs font-bold leading-none text-white/75">ETB</span>
        </p>
        <p className="mt-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
          {chapa.periodDays} days access
        </p>
      </div>
    );
  }

  const { dollars, cents } = splitUsdParts(plan.amount);
  return (
    <div className="shrink-0 text-right">
      <p className="flex items-start justify-end text-white" aria-label={`${formatUsd(plan.amount)}${plan.priceSuffix}`}>
        <span className={`font-display font-extrabold leading-none ${large ? "mt-[0.35rem] text-lg" : "text-sm"}`}>
          $
        </span>
        <span
          className={`font-display font-extrabold leading-none tracking-wide ${large ? "text-[2rem]" : "text-lg"}`}
        >
          {dollars}
        </span>
        <span className="font-display text-xs font-bold leading-none text-white/75">.{cents}</span>
      </p>
      <p className="mt-1 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        {plan.priceSuffix.replace(/^\//, "")}
        {large ? ` · ${formatDailyPrice(plan)}` : ""}
      </p>
    </div>
  );
}

/**
 * The recommended (monthly) plan is a large card; shorter plans are compact rows
 * underneath so they never read as co-equal. Prices come from pricing config.
 */
export function PaywallPlanList({
  provider,
  selected,
  onSelect,
}: {
  provider: PaymentProvider;
  selected: PlanKey;
  onSelect: (plan: PlanKey) => void;
}) {
  const [featured, ...others] = PAYWALL_PLANS;
  const featuredSelected = selected === featured.key;
  const badge = provider === "stripe" ? savingsBadge(featured) : null;

  return (
    <div className="mt-4" role="radiogroup" aria-label="Plan">
      <div
        data-plan={featured.key}
        data-featured="true"
        className={`rounded-xl border transition duration-200 ${
          featuredSelected
            ? "border-obsidian-red/70 shadow-lg shadow-obsidian-red/20 ring-2 ring-obsidian-red/90"
            : "border-obsidian-red/40"
        }`}
      >
        <div className="rounded-t-[0.65rem] border-b border-red-900/40 bg-gradient-to-r from-obsidian-red via-red-500 to-obsidian-red px-3 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-white">
          Most Popular{provider === "chapa" ? " · Best value" : ""}
        </div>
        <button
          type="button"
          role="radio"
          aria-checked={featuredSelected}
          onClick={() => onSelect(featured.key)}
          className="flex w-full items-center gap-3 px-4 py-4 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
        >
          <Radio checked={featuredSelected} />
          <div className="min-w-0 flex-1 pr-2">
            <p className="font-display text-lg font-extrabold uppercase leading-none tracking-[0.12em] text-white">
              {featured.label}
            </p>
            {badge && (
              <span className="mt-1.5 inline-flex max-w-full rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-200">
                {badge}
              </span>
            )}
          </div>
          <Price plan={featured} provider={provider} large />
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {others.map((p) => {
          const isSelected = selected === p.key;
          return (
            <button
              key={p.key}
              type="button"
              role="radio"
              aria-checked={isSelected}
              data-plan={p.key}
              onClick={() => onSelect(p.key)}
              className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                isSelected
                  ? "border-obsidian-red/70 bg-white/[0.04]"
                  : "border-white/[0.06] hover:border-white/15"
              }`}
            >
              <Radio checked={isSelected} />
              <span className="min-w-0 flex-1 text-sm font-semibold uppercase tracking-[0.1em] text-zinc-300">
                {p.label}
              </span>
              <Price plan={p} provider={provider} large={false} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
