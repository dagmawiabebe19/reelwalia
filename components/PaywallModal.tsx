"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getPlanDisplay } from "@/lib/stripe/plans";
import {
  PAYWALL_INCLUDED,
  PAYWALL_SOCIAL_PROOF,
  PAYWALL_CATALOG_HEADING,
  PAYWALL_PROVIDER_HEADING,
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
import { ReelWaliaLogo } from "@/components/brand/ReelWaliaLogo";
import { usePaywallOpen } from "@/components/watch/PaywallOpenContext";
import type { PaywallCatalogPoster } from "@/lib/paywall-catalog";
import {
  getChapaPlan,
  type PaymentAvailability,
  type PaymentProvider,
  type PlanKey,
} from "@/lib/payments/pricing";
import { startChapaCheckout } from "@/lib/payments/chapa/start-checkout";
import { paywallProviderState, resolveInitialProvider } from "@/lib/paywall/provider-state";
import { resolvePaywallPromo } from "@/lib/paywall/promo";
import { PaywallCheckoutCta } from "@/components/paywall/PaywallCheckoutCta";
import { DEFAULT_PAYWALL_PLAN, PaywallPlanList } from "@/components/paywall/PaywallPlanList";
import { PaywallPromoBanner } from "@/components/paywall/PaywallPromoBanner";
import { PaywallProviderPicker } from "@/components/paywall/PaywallProviderPicker";

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

function BenefitIcon({ id }: { id: string }) {
  const className = "h-5 w-5 shrink-0 text-obsidian-red";
  if (id === "unlimited") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden
      >
        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v9a2 2 0 01-2 2h-5l-3 3v-3H6a2 2 0 01-2-2V6zm3 3v2h10V9H7z" />
      </svg>
    );
  }
  if (id === "devices") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden
      >
        <path d="M4 5a2 2 0 012-2h8a2 2 0 012 2v10H4V5zm14 2h2a2 2 0 012 2v8a2 2 0 01-2 2h-6v-2h6V9h-2V7z" />
      </svg>
    );
  }
  if (id === "hd") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden
      >
        <path d="M3 6a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-5v2h2v2H8v-2h2v-2H5a2 2 0 01-2-2V6zm4 3v4h2V9H7zm4 0v4h1.5a1.5 1.5 0 000-3H13V9h-2zm2 2.5h.5a.5.5 0 000-1H13v1z" />
      </svg>
    );
  }
  if (id === "no-ads") {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="currentColor"
        aria-hidden
      >
        <path d="M3.28 2.22L2.22 3.28l4.4 4.4L3 12v2h3.5L12 20v-5.59l6.72 6.72 1.06-1.06L3.28 2.22zM14 8.83V4l-3.17 3.17L14 8.83zM16.5 12.67L19 10h2v4h-2l-.5-.4-2-1.6z" />
      </svg>
    );
  }
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
      aria-hidden
    >
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
  const [selected, setSelected] = useState<PlanKey>(DEFAULT_PAYWALL_PLAN);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogPosters, setCatalogPosters] = useState<PaywallCatalogPoster[]>(
    [],
  );
  const paywallViewedRef = useRef(false);
  const checkoutStartedRef = useRef(false);
  const catalogFetchedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const {
    catalogPosters: contextPosters,
    defaultPaymentProvider,
    paymentAvailability,
  } = usePaywallOpen();
  // Providers the server rejected at checkout this session (config changed since render).
  const [rejected, setRejected] = useState<Partial<Record<PaymentProvider, true>>>({});
  const availability: PaymentAvailability = {
    stripe: paymentAvailability.stripe && !rejected.stripe,
    chapa: paymentAvailability.chapa && !rejected.chapa,
  };
  const [provider, setProvider] = useState<PaymentProvider | null>(() =>
    resolveInitialProvider(defaultPaymentProvider, paymentAvailability),
  );
  const providerState = paywallProviderState({ availability, selected: provider });

  useEffect(() => {
    if (!open) return;
    const sync = () => {
      const fsEl = document.fullscreenElement;
      setPortalTarget(fsEl instanceof HTMLElement ? fsEl : document.body);
    };
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, [open]);

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
    if (
      !open ||
      paywallViewedRef.current ||
      !trigger ||
      !episodeId ||
      !seriesSlug
    ) {
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

  if (!open || !portalTarget) return null;

  const promo = resolvePaywallPromo({ provider: providerState.selected, plan: selected });
  const testimonials = publishedPaywallTestimonials();
  const { headline, subhead } = paywallCopyForVariant(copyVariant, {
    moreEpisodesComingSoon,
  });
  const showSocial =
    PAYWALL_SOCIAL_PROOF.enabled &&
    (PAYWALL_SOCIAL_PROOF.rating != null || testimonials.length > 0);

  const markProviderUnavailable = (unavailable: PaymentProvider) => {
    checkoutStartedRef.current = false;
    setLoading(false);
    setError(null);
    setRejected((prev) => ({ ...prev, [unavailable]: true }));
  };

  const handleCheckout = async () => {
    const checkoutProvider = providerState.selected;
    if (!checkoutProvider || checkoutStartedRef.current) return;
    checkoutStartedRef.current = true;
    setLoading(true);
    setError(null);

    const plan = getPlanDisplay(selected);

    if (checkoutProvider === "chapa") {
      if (!isAuthenticated) {
        const here = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(here)}`;
        return;
      }
      trackSubscriptionCheckoutStarted({
        plan: selected,
        price_amount: getChapaPlan(selected).etbAmount,
        currency: "etb",
        episode_id: episodeId,
      });
      const result = await startChapaCheckout(selected, episodeId);
      if (result.ok) {
        window.location.href = result.url;
        return;
      }
      if (result.providerUnavailable) {
        markProviderUnavailable("chapa");
        return;
      }
      checkoutStartedRef.current = false;
      if (result.authRequired) {
        const here = `${window.location.pathname}${window.location.search}`;
        window.location.href = `/auth/sign-in?redirect=${encodeURIComponent(here)}`;
        return;
      }
      setError(result.message);
      setLoading(false);
      return;
    }

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
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
        code?: string;
      };
      if (data.code === "provider_unavailable") {
        markProviderUnavailable("stripe");
        return;
      }
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

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex items-start justify-center overflow-hidden px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:items-center sm:p-4"
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
        className="relative max-h-[calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem)] min-h-0 w-full max-w-[480px] overflow-y-auto overscroll-contain rounded-2xl border border-white/[0.08] bg-black px-5 pb-8 pt-0 shadow-2xl outline-none sm:max-h-[92vh] sm:px-6 sm:pb-8 sm:pt-6"
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

        <h2
          id="paywall-title"
          className="font-display text-[1.65rem] font-black leading-[1.08] sm:text-2xl"
        >
          <span className="bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent [text-shadow:0_2px_24px_rgba(255,255,255,0.12)]">
            {headline}
          </span>
        </h2>
        <p className="mt-2.5 text-sm font-medium text-zinc-300">{subhead}</p>
        <PaywallPromoBanner promo={promo} />

        <PaywallProviderPicker
          heading={PAYWALL_PROVIDER_HEADING}
          tabs={providerState.tabs}
          selected={providerState.selected}
          onSelect={(next) => {
            setProvider(next);
            setError(null);
          }}
        />

        <PaywallPlanList
          provider={providerState.selected ?? "stripe"}
          selected={selected}
          onSelect={setSelected}
        />

        <div className="mt-6 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            What&apos;s included
          </p>
          <ul className="space-y-2.5">
            {PAYWALL_INCLUDED.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 text-sm text-zinc-200"
              >
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
            <div className="grid grid-cols-3 gap-2 pb-1">
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
              <ul
                className={`space-y-3 ${PAYWALL_SOCIAL_PROOF.rating != null ? "mt-3" : ""}`}
              >
                {testimonials.map((t) => (
                  <li key={t.quote} className="text-sm text-zinc-300">
                    <p>&ldquo;{t.quote}&rdquo;</p>
                    {t.attribution.trim() && (
                      <p className="mt-1 text-xs text-zinc-500">
                        {t.attribution}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <PaywallCheckoutCta
          state={providerState}
          plan={selected}
          loading={loading}
          error={error}
          isAuthenticated={isAuthenticated}
          onCheckout={() => void handleCheckout()}
        />
      </div>
    </div>,
    portalTarget,
  );
}
