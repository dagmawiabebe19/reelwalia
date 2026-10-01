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

- **Chapa API version**: integration uses the v1 API (`api.chapa.co`). Chapa also offers a
  newer v2 "global" API; migrate only if v1 is deprecated.
- **Expiry** is check-on-read. Add a scheduled job with the bulk `UPDATE` in
  `PAYMENTS_TESTING.md` §5 if you want rows flipped to `expired` proactively (e.g. for
  renewal reminder emails).
- **Stripe webhook** has no event-ID dedupe table; it relies on idempotent upserts and was
  intentionally left unchanged.

## 7. Video protection rollout (Bunny token auth + migration 034)

Paid episodes are protected by two independent layers:

1. **Signed URLs** — the browser only ever gets short-lived Bunny-signed URLs
   (`GET /api/episodes/[id]/stream` and server-rendered pages). Episode 5+ is signed only
   for viewers with active access. HLS uses a directory token embedded in the path
   (`/bcdn_token=…/<videoId>/playlist.m3u8`) so renditions and segments inherit it;
   thumbnails get per-file tokens. Players re-fetch a fresh URL when a token is stale.
2. **Column lockdown** — migration `034_episodes_hide_video_urls.sql` removes
   `episodes.video_url` and `episodes.bunny_video_id` from what the anon/user key can read.

Do these in order:

1. **Deploy the code first** (it no longer reads `video_url` with the user key, and serves
   unsigned URLs while `BUNNY_TOKEN_AUTH_KEY` is unset — same as before).
2. **Run migration 034** in the Supabase SQL editor (separate run). Check with
   `select video_url from episodes limit 1` using the anon key in the API docs/REST: it must
   fail with "permission denied".
3. **Bunny dashboard → Stream → your library → API → Pull Zone → Manage → Security →
   Token Authentication**: copy the **URL Token Authentication Key**.
4. **Vercel → Production env**: set `BUNNY_TOKEN_AUTH_KEY` to that key (and confirm
   `BUNNY_CDN_HOSTNAME` is the Stream pull-zone host, e.g. `vz-xxxx.b-cdn.net`). Redeploy.
5. **Turn Token Authentication ON** for the pull zone right after the redeploy finishes.
   Enabling it 403s every unsigned link (old shared URLs, and any page rendered before step 4),
   so steps 4 and 5 must happen back-to-back.
6. **Verify**: play Episode 1 signed out, Episode 5 as a subscriber, and check thumbnails on a
   series page. Copy a raw `https://<host>/<videoId>/playlist.m3u8` into a browser — it must
   return 403. A signed URL must stop working after its `expires` time.

If playback 403s after step 5 while URLs look signed, set `BUNNY_TOKEN_AUTH_ALGORITHM=sha256`
(legacy Advanced form) and redeploy. Rollback: turn token auth off in Bunny (no deploy needed).

Also note: `BUNNY_TOKEN_AUTH_KEY` must never be a `NEXT_PUBLIC_*` variable.
