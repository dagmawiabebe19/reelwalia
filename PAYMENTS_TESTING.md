# Payments testing — Stripe + Chapa (Telebirr)

ReelWalia has two payment providers that feed one access check
(`lib/payments/access.ts` → `getViewerAccess` / `hasActiveAccess`):

| Provider | Who | Model | Grants access via |
| --- | --- | --- | --- |
| Stripe | International (card / Apple Pay, USD) | Auto-renewing subscription | `profiles.subscription_status` (Stripe webhook) |
| Chapa | Ethiopia (Telebirr, CBE Birr, M-Pesa, ETB) | One-time pass, no auto-renew | `subscriptions` row with `provider='chapa'`, `status='active'`, `current_period_end > now()` |

Episodes 1–4 are free; Episode 5+ needs access.

## 0. Prerequisites

1. Apply migrations **manually** in the Supabase SQL editor, in order:
   `032_subscription_status_expired.sql`, then `033_chapa_payments_unified_entitlements.sql`.
   (032 must run on its own first — Postgres can't use a new enum value in the same transaction that adds it.)
2. `.env.local` with Stripe test keys and Chapa **test** keys (`CHASECK_TEST-…`).
3. `npm run dev`.
4. A public tunnel so Chapa can reach your machine (callback + webhook):
   `npx ngrok http 3000` (or `cloudflared tunnel --url http://localhost:3000`).
   Open the site **through the tunnel URL** when testing Chapa, so `callback_url`
   and `return_url` point at the tunnel.

## 1. Stripe (unchanged flow)

- Forward webhooks: `stripe listen --forward-to localhost:3000/api/stripe/webhook`
  and put the printed `whsec_…` in `STRIPE_WEBHOOK_SECRET`.
- Open Episode 5 of any series → paywall → **Card / Apple Pay** → pick a plan → Get Full Access.
- Test cards: `4242 4242 4242 4242` (success), `4000 0000 0000 9995` (declined),
  `4000 0025 0000 3155` (3-D Secure). Any future expiry, any CVC.
- Expect: redirect back to the episode, video plays, `/account` shows the Stripe plan.
- Cancel via the customer portal → after `customer.subscription.deleted`, Episode 5 locks again
  and the Stripe `subscriptions` row is marked `canceled`.

## 2. Chapa test mode (Telebirr)

1. In the Chapa dashboard (test mode) set the webhook URL to
   `https://<tunnel>/api/webhooks/chapa` and copy the secret hash into `CHAPA_WEBHOOK_SECRET`.
2. **Sign in** (Chapa passes are tied to an account; signed-out users are sent to sign-in first).
3. Open Episode 5 → paywall → **Telebirr** → pick a plan (ETB prices) → Get Full Access.
4. On Chapa's hosted page use test credentials:
   - Telebirr: `0900123456`, `0900112233`, or `0900881111`
   - M-Pesa: `0700123456`
   - Test card: Visa `4200 0000 0000 0000`, CVV `123`, expiry `12/34`
5. You return to `/payments/chapa/return?tx_ref=…` → "Confirming your payment…" → redirected to
   the episode with access.
6. Check in Supabase:
   - `payments`: one row, `provider='chapa'`, `status='success'`, `verified_at` set.
   - `subscriptions`: one row, `provider='chapa'`, `status='active'`, end = now + plan days.
   - `processed_webhook_events`: one row per distinct webhook event.
7. `/account` shows "Telebirr pass — Active until …" with extend buttons. Buying again
   **adds** days to the current end date.

Any of the three paths (webhook, callback, return-page poll) can grant; whichever arrives
first wins and the others are no-ops (`grant_chapa_entitlement` flips `pending → success` once).

## 3. Security checks

**Tampered webhook signature → 401, nothing granted**

```bash
curl -i -X POST https://<tunnel>/api/webhooks/chapa \
  -H 'Content-Type: application/json' \
  -H 'x-chapa-signature: deadbeef' \
  -d '{"event":"charge.success","tx_ref":"rw-fake","status":"success"}'
```

**Valid signature, but unpaid tx → not granted.** Compute the HMAC yourself:

```bash
BODY='{"event":"charge.success","tx_ref":"<a pending tx_ref>","status":"success"}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$CHAPA_WEBHOOK_SECRET" | sed 's/^.* //')
curl -i -X POST https://<tunnel>/api/webhooks/chapa \
  -H 'Content-Type: application/json' -H "x-chapa-signature: $SIG" -d "$BODY"
```

The webhook re-verifies with Chapa's API; an unpaid tx_ref stays `pending` (handler returns 503
so Chapa retries).

**Replay** — send the same valid webhook twice: second response is `{"duplicate":true}` and
no second grant (also guarded by the payment state machine).

**Forged callback** — `GET /api/payments/chapa/callback?trx_ref=<pending>&status=success`
does nothing unless Chapa's verify endpoint says it's paid.

**Return page for someone else's tx_ref** — sign in as user B and open user A's
`/payments/chapa/return?tx_ref=…` → "Payment not found".

**Price tampering** — `POST /api/payments/chapa/checkout` with `{"plan":"1month","amount":1}`
→ `amount` is ignored; the server prices from `lib/payments/pricing.ts`. An unknown plan → 400.

**Client writes** — with the anon key/user JWT, `insert`/`update` on `subscriptions`,
`payments`, or `processed_webhook_events` must fail (permission denied / RLS).

## 4. Negative paths

- Cancel on Chapa's page → return page shows "Payment not completed"; no access.
- Close the Chapa tab mid-payment → payment stays `pending`; nothing granted.
- Signed out → choosing Telebirr sends you to `/auth/sign-in?redirect=<episode>`.
- `CHAPA_SECRET_KEY` unset → Telebirr checkout returns a friendly "not available" error;
  Stripe unaffected.
- Migrations not yet applied → access falls back to Stripe-only (no crash).

## 5. Expiry test (short duration)

Make a pass expire without waiting days:

```sql
update public.subscriptions
   set current_period_end = now() + interval '2 minutes'
 where provider = 'chapa' and user_id = '<your user id>';
```

Wait 2 minutes and reload Episode 5 → paywall shows. The row flips to `status='expired'`
on that read (lazy expiry in `getViewerAccess`). Buying again restarts from now.

Optional bulk sweep (for a future cron):

```sql
update public.subscriptions set status = 'expired'
 where provider = 'chapa' and status = 'active' and current_period_end <= now();
```

## 6. Refund / reversal

Refund the test payment in the Chapa dashboard → `charge.refunded` webhook → payment marked
`refunded`, and the days it added are removed from the pass (access ends if nothing is left).
