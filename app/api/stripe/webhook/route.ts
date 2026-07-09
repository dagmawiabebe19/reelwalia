import { headers } from "next/headers";
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import type { StripePlanKey } from "@/lib/stripe/plans";
import {
  getStripe,
} from "@/lib/stripe/server";
import { trackSubscriptionCompleted } from "@/lib/analytics/funnel-server";
import { unwrapStripeResponse } from "@/lib/stripe/helpers";
import { isForThisApp } from "@/lib/stripe/webhook-filter";
import {
  deactivateSubscription,
  findUserIdByCustomerId,
  syncSubscriptionToDatabase,
} from "@/lib/stripe/sync";
import { grantSeriesPurchase } from "@/lib/stripe/purchases";
import { ensureUserFromEmail } from "@/lib/stripe/guest-auth";

export async function POST(request: Request) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("Missing STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = headers().get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!isForThisApp(event)) {
    return new Response("OK - not for this app", { status: 200 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        // One-time "unlock all episodes of a series" purchase.
        if (
          session.mode === "payment" &&
          session.metadata?.kind === "series_unlock"
        ) {
          if (session.payment_status !== "paid") break;

          const seriesId = session.metadata?.series_id;
          if (!seriesId) {
            console.error("series_unlock: missing series_id", session.id);
            break;
          }

          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id ?? null;

          let userId: string | null = session.metadata?.user_id ?? null;
          if (!userId && customerId) {
            userId = await findUserIdByCustomerId(customerId);
          }
          if (!userId) {
            const email = session.customer_details?.email;
            if (!email) {
              console.error("series_unlock: no user_id or email", session.id);
              break;
            }
            userId = await ensureUserFromEmail(email);
          }

          const paymentIntentId =
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null;

          await grantSeriesPurchase({
            userId,
            seriesId,
            customerId,
            sessionId: session.id,
            paymentIntentId,
            amountTotal: session.amount_total ?? null,
            currency: session.currency ?? null,
          });

          console.info("[webhook] series_unlock granted", {
            series_id: seriesId,
            session_id: session.id,
          });
          break;
        }

        if (session.mode !== "subscription" || !session.subscription) break;

        const subscriptionId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id;

        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!customerId) break;

        let userId =
          session.metadata?.user_id ??
          (await findUserIdByCustomerId(customerId));

        if (!userId) {
          const email = session.customer_details?.email;
          if (!email) {
            console.error("checkout.session.completed: no user_id or email", session.id);
            break;
          }
          userId = await ensureUserFromEmail(email);
        }

        const plan = session.metadata?.plan as StripePlanKey | undefined;

        const subscription = unwrapStripeResponse(
          await stripe.subscriptions.retrieve(subscriptionId)
        );

        await syncSubscriptionToDatabase({
          userId,
          customerId,
          subscription,
          plan,
        });

        if (!session.metadata?.user_id) {
          await stripe.subscriptions.update(subscriptionId, {
            metadata: {
              app: "reelwalia",
              user_id: userId,
              plan: plan ?? "",
              episode_id: session.metadata?.episode_id ?? "",
            },
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const userId =
          subscription.metadata.user_id ??
          (await findUserIdByCustomerId(customerId));

        if (!userId) break;

        await syncSubscriptionToDatabase({
          userId,
          customerId,
          subscription,
          plan: subscription.metadata.plan,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const userId =
          subscription.metadata.user_id ??
          (await findUserIdByCustomerId(customerId));

        if (userId) {
          await deactivateSubscription(userId);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof (invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null })
            .subscription === "string"
            ? ((invoice as Stripe.Invoice & { subscription?: string }).subscription as string)
            : (
                invoice as Stripe.Invoice & {
                  subscription?: Stripe.Subscription | null;
                }
              ).subscription?.id;

        if (!subscriptionId) break;

        const subscription = unwrapStripeResponse(
          await stripe.subscriptions.retrieve(subscriptionId)
        );
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;

        const userId =
          subscription.metadata.user_id ??
          (await findUserIdByCustomerId(customerId));

        if (userId) {
          await syncSubscriptionToDatabase({
            userId,
            customerId,
            subscription,
            plan: subscription.metadata.plan,
          });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.billing_reason !== "subscription_create") break;

        const subscriptionRef = (
          invoice as Stripe.Invoice & {
            subscription?: string | Stripe.Subscription | null;
          }
        ).subscription;

        const subscriptionId =
          typeof subscriptionRef === "string"
            ? subscriptionRef
            : subscriptionRef?.id;

        if (!subscriptionId) break;

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id;

        if (!customerId) break;

        const subscription = unwrapStripeResponse(
          await stripe.subscriptions.retrieve(subscriptionId)
        );

        const planKey = subscription.metadata.plan as StripePlanKey | undefined;
        const plan: StripePlanKey =
          planKey === "1week" || planKey === "1month" ? planKey : "1month";

        await trackSubscriptionCompleted({
          plan,
          price_amount: (invoice.amount_paid ?? 0) / 100,
          currency: invoice.currency ?? "usd",
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
        });

        console.info("[analytics] subscription_completed", {
          plan,
          stripe_subscription_id: subscriptionId,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error(`Webhook handler error (${event.type}):`, err);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
