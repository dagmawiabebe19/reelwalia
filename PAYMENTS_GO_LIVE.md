# Payments go-live checklist (Chapa production switchover)

Stripe is already live and is not affected by these steps.

## 1. Before switching

- [ ] Migrations `032_subscription_status_expired.sql` then
      `033_chapa_payments_unified_entitlements.sql` applied in the **production** Supabase
      SQL editor (manually, in that order).
- [ ] Chapa business account fully verified (KYB approved) and live mode enabled.
- [ ] **Final ETB prices** set in `lib/payments/pricing.ts` (`CHAPA_PLAN_CONFIG`). The
      shipped values (150 / 250 / 550 ETB) are placeholders — confirm them before launch.
- [ ] The full test plan in `PAYMENTS_TESTING.md` passes against test keys on a preview deploy.

## 2. Vercel environment variables (Production)

| Variable | Value |
| --- | --- |
| `CHAPA_SECRET_KEY` | Live secret key (`CHASECK-…`, **not** `CHASECK_TEST-`) |
| `CHAPA_PUBLIC_KEY` | Live public key (currently unused by hosted checkout) |
| `CHAPA_WEBHOOK_SECRET` | Live webhook secret hash from the Chapa dashboard |
| `CHAPA_BASE_URL` | `https://api.chapa.co` |
| `NEXT_PUBLIC_CHAPA_RETURN_URL` | `https://<production-domain>/payments/chapa/return` (or leave unset to derive from the request) |

Never put secret keys in `NEXT_PUBLIC_*` vars or commit them. Redeploy after changing env vars.

## 3. Chapa dashboard (live mode)

- [ ] Webhook URL: `https://<production-domain>/api/webhooks/chapa`
- [ ] Webhook secret hash matches `CHAPA_WEBHOOK_SECRET`.
- [ ] Events enabled: charge success / failed / cancelled / refunded / reversed.

## 4. Smoke test in production

1. Sign in with a real account, open Episode 5, choose **Telebirr**, buy the cheapest plan
   with a real Telebirr wallet.
2. Confirm the return page unlocks the episode within a few seconds.
3. Supabase: `payments` row `success`, `subscriptions` row `provider='chapa'` active,
   `processed_webhook_events` has the webhook.
4. Refund it from the Chapa dashboard and confirm access is removed.
5. Check Vercel logs for `[chapa]` errors.

## 5. Rollback

Chapa can be disabled without a deploy: remove `CHAPA_SECRET_KEY` in Vercel and redeploy.
The Telebirr option then returns a friendly "not available" message; existing passes keep
working until they expire, and Stripe is unaffected.

## 6. Known gaps / follow-ups

- **Video URL protection**: Bunny CDN URLs are unsigned and `episodes.video_url` is readable
  through the public RLS policy. The app never sends a locked episode's URL to the browser,
  but a determined user could query it with the anon key. Enable **Bunny token authentication**
  (signed, expiring URLs) to close this.
- **Chapa API version**: integration uses the v1 API (`api.chapa.co`). Chapa also offers a
  newer v2 "global" API; migrate only if v1 is deprecated.
- **Expiry** is check-on-read. Add a scheduled job with the bulk `UPDATE` in
  `PAYMENTS_TESTING.md` §5 if you want rows flipped to `expired` proactively (e.g. for
  renewal reminder emails).
- **Stripe webhook** has no event-ID dedupe table; it relies on idempotent upserts and was
  intentionally left unchanged.
