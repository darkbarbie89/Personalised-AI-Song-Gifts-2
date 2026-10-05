# Song Gift

A Vercel-ready Next.js 14 app for turning a personal story into a song gift.

## Local setup

1. Install the workspace dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set the values from the secure project secrets and public settings.
3. Run `supabase/schema.sql` in the Supabase SQL Editor. This creates the `orders` and `songs` tables, the public `song-assets` bucket, and the atomic credit-claim functions.
4. In Supabase Auth, enable email/password sign-in and set the app's site URL and redirect URLs.
5. Start the app with `pnpm --filter @workspace/song-gift run dev`.

## Vercel

Create a Vercel project for this repository, set its root directory to `artifacts/song-gift`, and add every variable from `.env.example` in the Vercel project settings. Set `NEXT_PUBLIC_BASE_URL` to the deployed canonical URL. Use a Stripe test-mode secret key while validating checkout.

Register `https://<your-domain>/api/webhooks/stripe` as a Stripe webhook endpoint for `checkout.session.completed`, then copy its signing secret into `STRIPE_WEBHOOK_SECRET`.

## Song generation provider

The attached brief named an older Apiframe endpoint. Current Apiframe documentation uses `https://api.apiframe.ai/v2/music/generate` and `GET /v2/jobs/:id`; this app uses that documented Suno API flow. The API key is only read by server routes.

## Admin

Set `ADMIN_EMAIL` to the Supabase account email allowed to use `/admin`. Admin data is available only to that authenticated account.