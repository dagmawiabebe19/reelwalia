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
| `NEXT_PUBLIC_SITE_URL` | Site URL for auth redirects |
| `BUNNY_STREAM_LIBRARY_ID` | Bunny Stream library ID |
| `BUNNY_STREAM_API_KEY` | Bunny Stream API key |
| `BUNNY_CDN_HOSTNAME` | CDN hostname (e.g. `vz-xxxxx.b-cdn.net`) |
| `ADMIN_EMAILS` | Comma-separated admin emails |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_*_INTRO` / `STRIPE_PRICE_*_STANDARD` | Intro + renewal price IDs per plan |

## Database migrations

Apply in order via Supabase SQL Editor or CLI:

1. `supabase/migrations/001_initial_schema.sql` — core tables + RLS
2. `supabase/migrations/002_storage_buckets.sql` — public `posters` bucket
3. `supabase/migrations/003_phase1_schema.sql` — `free_episode_count`, `bunny_video_id`, subtitles
4. `supabase/migrations/004_phase2_stripe.sql` — Stripe columns on profiles, plan enum values

## Stripe subscriptions

Intro pricing auto-renews at standard rates via Subscription Schedules (set up in the checkout webhook).

1. Create three products in Stripe with **intro** and **standard** recurring prices for 1-week, 2-week, and 1-month intervals.
2. Copy price IDs into the `STRIPE_PRICE_*` env vars in `.env.example`.
3. Add webhook endpoint: `{SITE_URL}/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. For local testing: `stripe listen --forward-to localhost:3000/api/stripe/webhook`

Locked episodes show the ReelWalia paywall modal; checkout redirects back to the watch page with `?subscribed=true`.

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
