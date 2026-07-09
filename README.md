# ReelWalia

Vertical drama streaming platform by **Walia Studios**. Bite-sized episodes, mobile-first playback, Bunny Stream hosting.

## Stack

- Next.js 14 (App Router) + TypeScript
- Supabase (auth, database, storage)
- Bunny Stream (HLS video)
- Tailwind CSS (OBSIDIAN-RED design system)
- Vercel deployment

## Getting started

```bash
npm install
cp .env.example .env.local
# Fill in Supabase + Bunny + admin email
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

Copy `.env.example` to `.env.local` for local dev. Add the same keys in **Vercel → Project → Settings → Environment Variables**:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (admin uploads, seed script) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL for Stripe redirects and auth (see Vercel note below) |
| `BUNNY_STREAM_LIBRARY_ID` | Bunny Stream library ID |
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key |
| `BUNNY_CDN_HOSTNAME` | CDN hostname (e.g. `vz-xxxxx.b-cdn.net`) |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_WEEKLY` | Recurring $2.99/week subscription price ID |
| `STRIPE_PRICE_MONTHLY` | Recurring $5.99/month subscription price ID |
| `STRIPE_PRICE_SERIES_UNLOCK` | One-time $2.99 series-unlock price ID |
| `NEXT_PUBLIC_SERIES_UNLOCK_PRICE` | Display price for the one-time unlock (default `2.99`) |
| `NEXT_PUBLIC_SOCIAL_PROOF_COUNT` | "Join N+ watching" number (default `1300`) |

**`NEXT_PUBLIC_SITE_URL` on Vercel** (required for correct Stripe post-checkout redirects):

| Environment | Value |
|---|---|
| Production | `https://reelwalia.com` |
| Preview | `https://reelwalia.com` (or your preview URL) |
| Development | `http://localhost:3000` |

API routes also read the request `Origin` header when present, so production checkout redirects work even before env is set — but set the Production value to avoid fallback issues.

Local `.env.local`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Database migrations

Apply in order via Supabase SQL Editor or CLI:

1. `supabase/migrations/001_initial_schema.sql` — core tables + RLS
2. `supabase/migrations/002_storage_buckets.sql` — public `posters` bucket
3. `supabase/migrations/003_phase1_schema.sql` — `free_episode_count`, `bunny_video_id`, subtitles
4. `supabase/migrations/004_phase2_stripe.sql` — Stripe columns on profiles, plan enum values
5. `supabase/migrations/005_creator_submissions.sql` — creator submission intake table + RLS
6. `supabase/migrations/006_redbird_free_episodes.sql` — REDBIRD 3-episode free tier
7. `supabase/migrations/020_series_unlock_and_paywall.sql` — one-time `series_purchases` table + RLS, `cliffhanger_hook` columns, paywall moved to end of episode 5

## Stripe pricing

Two offers power the paywall:

- **One-time series unlock** (primary) — a single `payment`-mode price that grants permanent access to one series' episodes for the buyer. Access is granted by the webhook only.
- **"All shows" subscription** (secondary) — recurring weekly / monthly prices.

1. Create the following prices in Stripe and copy their IDs into env:
   - `STRIPE_PRICE_SERIES_UNLOCK` — **one-time** price, $2.99 (product e.g. "Series Unlock").
   - `STRIPE_PRICE_WEEKLY` — **recurring** price, $2.99 / week ("All shows").
   - `STRIPE_PRICE_MONTHLY` — **recurring** price, $5.99 / month ("All shows", Most Popular).
2. Restart the dev server after editing `.env.local` — Next.js loads env at startup.
3. Add webhook endpoint: `{SITE_URL}/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`
4. For local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

Locked episodes show the paywall modal to everyone (signed-in or logged-out). Free episodes (`episode_number <= series.free_episode_count`, default 3) play with no sign-in — guests can browse the catalog and watch free episodes end-to-end.

**Typical guest journey:**
1. Land on reelwalia.com → browse series (no account)
2. Open a series → watch episodes 1–3 free, no friction
3. Episode 4+ → paywall modal (not a sign-in redirect)
4. Enter card + email in Stripe → account auto-created via webhook
5. Magic link emailed → click to sign in with an active subscription

**Guest checkout flow:**
1. Logged-out user hits a locked episode → paywall modal → Stripe Checkout (email + card collected in Stripe)
2. On success → `/auth/checkout-success?session_id=…` verifies payment and sends a magic-link email
3. Webhook creates Supabase auth user + active subscription
4. User can **Continue watching** immediately via `session_id` unlock, or sign in via email link for persistent access

**Signed-in checkout:** Same paywall → checkout attaches `user_id` → returns to episode with `?subscribed=true`.

## Bunny Stream setup

1. Create a [Bunny Stream](https://bunny.net/stream/) library.
2. Copy **Library ID** and **API Key** into env vars.
3. Enable HLS playback on the library CDN pull zone.
4. Set `BUNNY_CDN_HOSTNAME` to your pull zone hostname (without `https://`).
5. In Supabase Auth, add redirect URL: `{SITE_URL}/auth/callback`.

Episode uploads (admin) flow: create video → PUT file to Bunny → save HLS URL to Supabase.

## Admin access

Set `ADMIN_EMAILS=dagmawiabebe19@gmail.com` (comma-separated for multiple admins).

Sign in with that email, then visit `/admin/series` to manage catalog and upload episodes.

Review creator submissions at `/admin/submissions` (status workflow: New → Reviewing → Contacted → Approved / Rejected). Submissions are never auto-published.

## Creator submissions

Public form: `/submit` (also linked from the site footer).

Set Resend env vars to email `info@waliastudios.media` on each submission:

- `RESEND_API_KEY` — from [Resend](https://resend.com)
- `RESEND_FROM_EMAIL` — verified sender domain (defaults to Resend onboarding address for testing)
- `SUBMISSION_NOTIFY_EMAIL` — defaults to `info@waliastudios.media`

Submissions are saved to `creator_submissions` via anon RLS insert. Admin review uses the service role.

## Seed demo data

For UI testing without real Bunny videos:

```bash
npm run seed
```

Creates 3 series (Crown of Ashes, Midnight Contract, Echoes of Addis) with 10 episodes each using placeholder HLS URLs (won't play — UI only).

Requires `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run seed` | Seed demo catalog |

## Phase roadmap

- **Phase 0** — Foundation, auth, skeleton pages ✅
- **Phase 1** — Bunny Stream, video player, admin upload ✅
- **Phase 2** — Stripe subscriptions + paywall ✅
- **Phase 3** — Watch history polish, recommendations

## License

Private — Walia Studios.
