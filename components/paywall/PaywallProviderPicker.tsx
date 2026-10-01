import type { PaymentProvider } from "@/lib/payments/pricing";
import type { ProviderTabState } from "@/lib/paywall/provider-state";

const PROVIDER_COPY: Record<PaymentProvider, { title: string; caption: string }> = {
  stripe: { title: "Card / Apple Pay", caption: "International · USD" },
  chapa: { title: "Telebirr", caption: "Ethiopian payments · ETB" },
};

export function PaywallProviderPicker({
  heading,
  tabs,
  selected,
  onSelect,
}: {
  heading: string;
  tabs: ProviderTabState[];
  selected: PaymentProvider | null;
  onSelect: (provider: PaymentProvider) => void;
}) {
  return (
    <div className="mt-5">
      <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">{heading}</p>
      <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Payment method">
        {tabs.map((tab) => {
          const active = !tab.disabled && selected === tab.id;
          const copy = PROVIDER_COPY[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-disabled={tab.disabled || undefined}
              disabled={tab.disabled}
              data-provider={tab.id}
              onClick={() => {
                if (!tab.disabled) onSelect(tab.id);
              }}
              className={`min-h-[60px] rounded-xl border px-3 py-2.5 text-left transition ${
                tab.disabled
                  ? "cursor-not-allowed border-white/[0.06] opacity-45"
                  : active
                    ? "border-obsidian-red bg-obsidian-red/10 ring-2 ring-obsidian-red/80"
                    : "border-white/[0.12] hover:border-white/25"
              }`}
            >
              <span className="block text-sm font-extrabold text-white">{copy.title}</span>
              <span className="mt-0.5 block text-[11px] font-medium text-zinc-400">
                {tab.note ?? copy.caption}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
