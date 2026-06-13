import type Stripe from "stripe";
import { unwrapStripeResponse } from "@/lib/stripe/helpers";

export const REELWALIA_APP = "reelwalia";

export async function resolveEventApp(
  stripe: Stripe,
  event: Stripe.Event
): Promise<string | undefined> {
  const eventObject = event.data.object as {
    metadata?: { app?: string };
    subscription?: string | Stripe.Subscription | null;
  };

  const metadata = eventObject?.metadata;
  let app = metadata?.app;

  if (!app && event.type.startsWith("customer.subscription.")) {
    app = (event.data.object as Stripe.Subscription).metadata?.app;
  }

  if (
    !app &&
    (event.type === "invoice.payment_succeeded" ||
      event.type === "invoice.payment_failed")
  ) {
    const invoice = event.data.object as Stripe.Invoice & {
      subscription?: string | Stripe.Subscription | null;
    };
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;

    if (subscriptionId) {
      const sub = unwrapStripeResponse(
        await stripe.subscriptions.retrieve(subscriptionId)
      );
      app = sub.metadata?.app;
    }
  }

  return app;
}

export function isReelWaliaEvent(app: string | undefined): boolean {
  return app === REELWALIA_APP;
}
