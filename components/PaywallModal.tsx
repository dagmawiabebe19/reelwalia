"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  STRIPE_PLANS,
  formatDailyPrice,
  formatUsd,
  getPlanDisplay,
  savingsBadge,
  splitUsdParts,
  type StripePlanKey,
} from "@/lib/stripe/plans";
import {
  PAYWALL_INCLUDED,
  PAYWALL_SOCIAL_PROOF,
  PAYWALL_CATALOG_HEADING,
  paywallCopyForVariant,
  publishedPaywallTestimonials,
  type PaywallCopyVariant,
} from "@/lib/paywall-copy";
import {
  trackPaywallViewed,
  trackSubscriptionCheckoutStarted,
  type PaywallTrigger,
} from "@/lib/analytics/funnel";
import { reportAnalyticsEvent } from "@/lib/analytics/client-event";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { usePaywallOpen } from "@/components/watch/PaywallOpenContext";
import type { PaywallCatalogPoster } from "@/lib/paywall-catalog";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  episodeId?: string;
  seriesSlug?: string;
  trigger?: PaywallTrigger;
  copyVariant?: PaywallCopyVariant;
  moreEpisodesComingSoon?: boolean;
  isAuthenticated?: boolean;
}

const DEFAULT_PLAN: StripePlanKey =
  STRIPE_PLANS.find((p) => p.mostPopular)?.key ?? STRIPE_PLANS[0]!.key;

function BenefitIcon({ id }: { id: string }) {
  const className = "h-5 w-5 shrink-0 text-obsidian-red";
  if (id === "unlimited") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-5l-3 3v-3H6a2 2 0 01-2-2V6zm3 3v2h10V9H7z" />
      </svg>
    );
  }
  if (id === "devices") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10H4V5zm14 2h2a2 2 0 012 2v8a2 2 0 01-2 2h-6v-2h6V9h-2V7z" />
      </svg>
    );
  }
  if (id === "hd") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-5v2h2v2H8v-2h2v-2H5a2 2 0 01-2-2V6zm4 3v4h2V9H7zm4 0v4h1.5a1.5 1.5 0 000-3H13V9h-2zm2 2.5h.5a.5.5 0 000-1H13v1z" />
      </svg>
    );
  }
  if (id === "no-ads") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M3.28 2.22L2.22 3.28l4.4 4.4L3 12v2h3.5L12 20v-5.59l6.72 6.72 1.06-1.06L3.28 2.22zM14 8.83V4l-3.17 3.17L14 8.83zM16.5 12.67L19 10h2v4h-2l-.5-.4-2-1.6z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 3l2.1 6.4H21l-5.4 3.9 2.1 6.4L12 16.8 6.3 19.7l2.1-6.4L3 9.4h6.9L12 3z" />
    </svg>
  );
}

export function PaywallModal({
  open,
  onClose,
  episodeId,
  seriesSlug,
  trigger,
  copyVariant = "default",
  moreEpisodesComingSoon = false,
  isAuthenticated = false,
}: PaywallModalProps) {
  const [selected, setSelected] = useState<StripePlanKey>(DEFAULT_PLAN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogPosters, setCatalogPosters] = useState<PaywallCatalogPoster[]>([]);
  const paywallViewedRef = useRef(false);
  const checkoutStartedRef = useRef(false);
  const catalogFetchedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { catalogPosters: contextPosters } = usePaywallOpen();

  useEffect(() => {
    if (!open) {
      paywallViewedRef.current = false;
      checkoutStartedRef.current = false;
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || paywallViewedRef.current || !trigger || !episodeId || !seriesSlug) {
      return;
    }
    paywallViewedRef.current = true;
    trackPaywallViewed({
      episode_id: episodeId,
      series_slug: seriesSlug,
      trigger,
    });
    reportAnalyticsEvent({ eventType: "paywall_hit", episodeId });
  }, [open, trigger, episodeId, seriesSlug]);

  useEffect(() => {
    if (!open) return;
    if (contextPosters.length > 0) {
      setCatalogPosters(contextPosters);
      return;
    }
    if (catalogFetchedRef.current) return;
    catalogFetchedRef.current = true;
    void fetch("/api/paywall/catalog")
      .then((res) => (res.ok ? res.json() : { posters: [] }))
      .then((data: { posters?: PaywallCatalogPoster[] }) => {
        setCatalogPosters(Array.isArray(data.posters) ? data.posters : []);
      })
      .catch(() => {
        catalogFetchedRef.current = false;
      });
  }, [open, contextPosters]);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = scrollRef.current;
    if (!panel) return;
    panel.scrollTop = 0;
    panel.focus({ preventScroll: true });
  }, [open]);

  if (!open) return null;

  const selectedPlan = getPlanDisplay(selected);
  const testimonials = publishedPaywallTestimonials();
  const { headline, subhead } = paywallCopyForVariant(copyVariant, {
    moreEpisodesComingSoon,
  });
  const showSocial =
    PAYWALL_SOCIAL_PROOF.enabled &&
    (PAYWALL_SOCIAL_PROOF.rating != null || testimonials.length > 0);

  const handleCheckout = async () => {
    if (checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    setLoading(true);
    setError(null);

    const plan = getPlanDisplay(selected);
    trackSubscriptionCheckoutStarted({
      plan: selected,
      price_amount: plan.amount,
      currency: "usd",
      episode_id: episodeId,
    });

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selected, episodeId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        checkoutStartedRef.current = false;
        throw new Error(data.error ?? "Checkout failed");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-hidden px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        aria-label="Close paywall backdrop"
        onClick={onClose}
      />

      <div
        ref={scrollRef}
        tabIndex={-1}
        className="relative max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] min-h-0 w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-black px-5 pb-5 pt-0 shadow-2xl outline-none sm:max-h-[92vh] sm:p-6"
      >
        <div className="sticky top-0 z-10 -mx-5 mb-5 flex items-start justify-between bg-black px-5 pb-2 pt-5 sm:static sm:mx-0 sm:mb-5 sm:bg-transparent sm:p-0">
          <ReelWaliaLogo variant="lockup" scale="nav" />
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-white/20 p-1.5 text-white hover:bg-white/10"
            aria-label="Close paywall"
          >
            ✕
          </button>
        </div>

        <h2 id="paywall-title" className="font-display text-[1.65rem] font-black leading-[1.08] sm:text-2xl">
          <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent [text-shadow:0_2px_24px_rgba(255,255,255,0.12)]">
            {headline}
          </span>
        </h2>
        <p className="mt-2.5 text-sm font-medium text-zinc-300">{subhead}</p>

        <div className="mt-5 space-y-3">
          {STRIPE_PLANS.map((p) => {
            const isSelected = selected === p.key;
            const badge = savingsBadge(p);
            const isHighlighted = isSelected || p.mostPopular;
            const { dollars, cents } = splitUsdParts(p.amount);

            return (
              <div
                key={p.key}
                className={`overflow-hidden rounded-xl border transition duration-200 ${
                  isHighlighted
                    ? "border-obsidian-red/70 shadow-lg shadow-obsidian-red/20 ring-2 ring-obsidian-red/90"
                    : "border-white/[0.08] hover:border-white/20 hover:shadow-md hover:shadow-black/40"
                } ${isSelected ? "scale-[1.01]" : ""}`}
              >
                {p.mostPopular && (
                  <div className="border-b border-red-900/40 bg-gradient-to-r from-obsidian-red via-red-500 to-obsidian-red px-3 py-1.5 text-center text-[11px] font-extrabold uppercase tracking-[0.22em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
                    Most Popular
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelected(p.key)}
                  className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/[0.04] active:bg-white/[0.06]"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                      isSelected
                        ? "border-obsidian-red bg-obsidian-red shadow-[0_0_10px_rgba(224,60,47,0.55)]"
                        : "border-zinc-500"
                    }`}
                  >
                    {isSelected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-extrabold uppercase leading-tight tracking-[0.12em]">
                      <span className="bg-gradient-to-br from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                        {p.label}
                      </span>
                    </p>
                    {badge && (
                      <span className="mt-1.5 inline-flex max-w-full rounded-md bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-300 px-2 py-0.5 text-[10px] font-extrabold uppercase leading-tight tracking-wide text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.35)]">
                        {badge}
                      </span>
                    )}
                  </div>

                  <div className="shrink-0 text-right leading-none">
                    <p className="whitespace-nowrap font-display font-extrabold tabular-nums">
                      <span className="bg-gradient-to-br from-amber-50 via-white to-amber-200 bg-clip-text text-transparent drop-shadow-[0_0_18px_rgba(255,230,180,0.35)]">
                        <span className="text-3xl tracking-tight">${dollars}</span>
                        <span className="align-super text-[0.7rem] font-bold tracking-tight opacity-80">
                          .{cents}
                        </span>
                      </span>
                    </p>
                    <p className="mt-1 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-zinc-400">
                      {p.priceSuffix.replace(/^\//, "")}
                    </p>
                    <p className="mt-1 whitespace-nowrap text-[11px] tabular-nums text-zinc-500">
                      {formatDailyPrice(p)}
                    </p>
                  </div>
                </button>
              </div>
            );
          })}
        </div>

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            What&apos;s included
          </p>
          <ul className="space-y-2.5">
            {PAYWALL_INCLUDED.map((row) => (
              <li key={row.id} className="flex items-center gap-3 text-sm text-zinc-200">
                <BenefitIcon id={row.id} />
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </div>

        {catalogPosters.length >= 2 && (
          <div className="mt-6 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {PAYWALL_CATALOG_HEADING}
            </p>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {catalogPosters.map((item) => (
                <div
                  key={item.id}
                  className="aspect-[2/3] overflow-hidden rounded-md border border-white/[0.08] bg-zinc-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {showSocial && (
          <div className="mt-6 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
            {PAYWALL_SOCIAL_PROOF.rating != null && (
              <p className="text-sm font-medium text-white">
                <span className="text-obsidian-red" aria-hidden>
                  ★★★★★
                </span>{" "}
                {PAYWALL_SOCIAL_PROOF.rating.toFixed(1)}
                {PAYWALL_SOCIAL_PROOF.ratingCaption
                  ? ` · ${PAYWALL_SOCIAL_PROOF.ratingCaption}`
                  : ""}
              </p>
            )}
            {testimonials.length > 0 && (
              <ul className={`space-y-3 ${PAYWALL_SOCIAL_PROOF.rating != null ? "mt-3" : ""}`}>
                {testimonials.map((t) => (
                  <li key={t.quote} className="text-sm text-zinc-300">
                    <p>&ldquo;{t.quote}&rdquo;</p>
                    {t.attribution.trim() && (
                      <p className="mt-1 text-xs text-zinc-500">{t.attribution}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <button
          type="button"
          disabled={loading}
          onClick={() => void handleCheckout()}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-obsidian-red via-red-500 to-obsidian-red py-4 text-base font-extrabold tracking-wide text-white shadow-[0_8px_32px_rgba(224,60,47,0.45),inset_0_1px_0_rgba(255,255,255,0.2)] transition duration-200 hover:brightness-110 hover:shadow-[0_10px_40px_rgba(224,60,47,0.55)] active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? (
            <>
              <LoadingSpinner className="h-5 w-5" label="Redirecting to checkout" />
              Redirecting…
            </>
          ) : (
            "Get Full Access"
          )}
        </button>

        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-300">
          Auto-renews at {formatUsd(selectedPlan.amount)}
          {selectedPlan.priceSuffix} ({selectedPlan.renewalLabel.toLowerCase()}). Cancel anytime in
          your account.
        </p>

        {!isAuthenticated && (
          <p className="mt-2 text-center text-sm text-zinc-400">
            Enter your email in Stripe Checkout — we&apos;ll create your account automatically.
          </p>
        )}
      </div>
    </div>
  );
}
