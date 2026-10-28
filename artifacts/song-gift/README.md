# Song Gift

A Next.js 15 app for turning a personal story into a song gift. Deployment target: Vercel.

## Local setup

1. Install the workspace dependencies with `pnpm install`.
2. Copy `.env.example` to `.env.local` and set the values from the secure project secrets and public settings.
3. Run `supabase/schema.sql` in the Supabase SQL Editor. This creates the `orders` and `songs` tables, the public `song-assets` bucket, and the atomic credit-claim functions.
4. In Supabase Auth, enable email/password sign-in and set the app's site URL and redirect URLs.
5. Start the app with `pnpm --filter @workspace/song-gift run dev`.

## Vercel

Create a Vercel project for this repository, set its root directory to `artifacts/song-gift`, and add every variable from `.env.example` in the Vercel project settings. Enable access to source files outside the root directory so the shared workspace packages under `lib/` can build. Install with `pnpm install --frozen-lockfile` and build with `pnpm --filter @workspace/song-gift run build`. Set `NEXT_PUBLIC_BASE_URL` to the actual Vercel/custom-domain canonical URL, not the Replit development URL. Rebuild after changing `NEXT_PUBLIC_*` values because Next.js embeds them at build time.

`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` and `STRIPE_SECRET_KEY` must both be test-mode keys while validating checkout and both live-mode keys when accepting real payments. Checkout is Stripe-hosted; no secret key is sent to the browser. The return URL is `/studio/[songId]?session_id={CHECKOUT_SESSION_ID}`. The studio confirms payment server-side before enabling generation; the webhook independently activates paid songs if a customer closes checkout without returning.

Supabase needs all three variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (email/password login), and `SUPABASE_SERVICE_ROLE_KEY` (server-only database/storage). The URL must resolve and the keys must belong to that project. Never expose the service-role key in a `NEXT_PUBLIC_*` variable. Set Supabase Auth's Site URL and allowed redirects for the Vercel production domain and any preview domains used for testing.

Lyric videos are uploaded directly from the browser into a private `singagift-lyric-videos` Supabase Storage bucket. The app creates the bucket the first time a video is saved; videos must be MP4 or WebM and at most 50 MB. Gift-page playback and downloads are authorized by the song's share token and use short-lived private URLs.

Register `https://<your-domain>/api/webhooks/stripe` as a Stripe webhook endpoint for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, then copy its signing secret into `STRIPE_WEBHOOK_SECRET`. Test and live endpoints have different signing secrets. Generation/status routes declare Vercel function durations explicitly and poll the provider; they do not rely on an in-memory background job surviving a serverless request.

## Verification

Run `pnpm --filter @workspace/song-gift test` and `pnpm --filter @workspace/song-gift run build`. The route tests use the actual Next.js handlers and Supabase HTTP client with isolated external-service fixtures. They verify package amounts, payment activation/idempotency, signed webhooks, ownership, lyric editing/approval, provider failure recovery, song completion, public sharing, and dashboard queries without charging cards or calling paid generation APIs. These tests are not a substitute for a live Stripe test-mode checkout against a reachable Supabase project and valid provider keys.

## Song generation provider

The attached brief named an older Apiframe endpoint. Current Apiframe documentation uses `https://api.apiframe.ai/v2/music/generate` and `GET /v2/jobs/:id`; this app uses that documented Suno API flow. The API key is only read by server routes.

## Admin

Set `ADMIN_EMAIL` to the Supabase account email allowed to use `/admin`. Admin data is available only to that authenticated account.