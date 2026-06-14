import type Stripe from "stripe";

export const REELWALIA_APP = "reelwalia";

type MetadataCarrier = {
  metadata?: { app?: string };
};

type InvoiceLikeObject = MetadataCarrier & {
  parent?: {
    subscription_details?: MetadataCarrier;
  };
  lines?: {
    data?: MetadataCarrier[];
  };
  subscription_details?: MetadataCarrier;
};

export function collectFoundMetadata(
  eventObject: unknown
): Record<string, unknown> {
  const obj = eventObject as InvoiceLikeObject;

  return {
    topLevel: obj.metadata?.app ?? null,
    parentSubscriptionDetails:
      obj.parent?.subscription_details?.metadata?.app ?? null,
    lineItems:
      obj.lines?.data?.map((line) => line.metadata?.app ?? null) ?? null,
    subscriptionDetails: obj.subscription_details?.metadata?.app ?? null,
  };
}

function hasReelWaliaApp(found: Record<string, unknown>): boolean {
  if (found.topLevel === REELWALIA_APP) return true;
  if (found.parentSubscriptionDetails === REELWALIA_APP) return true;
  if (found.subscriptionDetails === REELWALIA_APP) return true;

  const lineItems = found.lineItems;
  if (
    Array.isArray(lineItems) &&
    lineItems.some((app) => app === REELWALIA_APP)
  ) {
    return true;
  }

  return false;
}

/** Returns true if this Stripe event belongs to ReelWalia (app=reelwalia metadata). */
export function isForThisApp(event: Stripe.Event): boolean {
  const found = collectFoundMetadata(event.data.object);

  if (hasReelWaliaApp(found)) {
    console.log(
      `[webhook-filter] ACCEPTED event=${event.type} id=${event.id} app=reelwalia`
    );
    return true;
  }

  console.log(
    `[webhook-filter] REJECTED event=${event.type} id=${event.id} reason=no_app_match metadata=${JSON.stringify(found)}`
  );
  return false;
}

/** @deprecated Use isForThisApp instead */
export function isReelWaliaEvent(app: string | undefined): boolean {
  return app === REELWALIA_APP;
}
