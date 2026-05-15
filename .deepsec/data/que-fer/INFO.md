# que-fer

Next.js 16 App Router site for `esdeveniments.cat` - a public Catalan
cultural-events directory (events, news, places, regions) with sponsor
banner payments (Stripe), favorites stored in a signed cookie, TikTok
share OAuth, and public event-image uploads. Server-first rendering on
ISR/PPR, hosted in Docker via Coolify behind Cloudflare. Three locales
(ca/es/en) handled by `proxy.ts` (the renamed Next 16 middleware).

## Auth shape

- `fetchWithHmac` (`lib/api/fetch-wrapper.ts`) - server-only HMAC-SHA256
  signing of body + timestamp + path+query. The only sanctioned way to
  reach the external backend. Bodies must be `string` / `URLSearchParams`
  / `FormData`; anything else throws.
- `proxy.ts` middleware - verifies HMAC on `/api/*` via `x-hmac` +
  `x-timestamp` (5-min window). Anonymous access is governed by the
  `PUBLIC_API_PATTERNS`, `PUBLIC_API_EXACT_PATHS`, and `EVENTS_PATTERN`
  allowlists. Pattern-matched routes are GET-only at the middleware
  layer.
- `isOriginAllowed` - Origin-header check on public non-GET routes
  (blocks curl / cross-site), exemptions in `ORIGIN_CHECK_EXEMPT`
  (Stripe webhook, revalidate, health).
- `isValidSecret` in `app/api/revalidate/route.ts` - `timingSafeEqual`
  check of `x-revalidate-secret` against `REVALIDATE_SECRET`.
- Stripe webhook at `app/api/sponsors/webhook/route.ts` - verifies
  `whsec_...` signature via `constructEvent`; has fail-fast guards
  against `STRIPE_WEBHOOK_SKIP_VERIFY=true` and malformed secret in
  production.
- Server-only secrets: `HMAC_SECRET`, `REVALIDATE_SECRET`,
  `STRIPE_WEBHOOK_SECRET`, `CLOUDFLARE_API_TOKEN`, `TIKTOK_CLIENT_SECRET`.
  Anything browser-readable lives under `NEXT_PUBLIC_*`.

## Threat model

1. Bypassing the HMAC layer to hit the external API directly, or
   exposing `HMAC_SECRET` to the browser bundle.
2. Abuse of public POST surfaces - sponsor checkout (Stripe session
   creation), public event-image upload, restaurant lead form, TikTok
   token exchange.
3. Triggering `/api/revalidate` without the secret - fires a full
   Cloudflare zone purge.
4. ISR/PPR cache-cost attacks: making a listing page dynamic via
   `searchParams` or enabling Next fetch cache on external wrappers
   exploded cost twice already (Dec 2025, Jan 2026).

## Project-specific patterns to flag

- **`searchParams` read in `app/[locale]/[place]/*` page components** -
  flips the route to dynamic and explodes the cache. Query state must
  be client-side (SWR) or middleware-only.
- **`next: { revalidate, tags }` passed to `fetchWithHmac` calls inside
  `lib/api/*-external.ts`** - re-enables the Next fetch cache. External
  wrappers must run with the default `cache: "no-store"`.
- **New `app/api/<route>/route.ts` whose path is added to
  `PUBLIC_API_PATTERNS` or `PUBLIC_API_EXACT_PATHS`** - that path
  becomes anonymously callable. Confirm Origin check / rate limit /
  webhook signature is in place. Also flag any non-GET handler on a
  route reachable via `PUBLIC_API_PATTERNS` or `EVENTS_PATTERN`.
- **Browser code importing from `lib/api/*-external.ts`, calling
  `process.env.HMAC_SECRET`, or calling `NEXT_PUBLIC_API_URL` directly
  instead of going through `/api/*`** - leaks the signing path.
- **`import Link from "next/link"` instead of `@i18n/routing`** - drops
  locale prefix and breaks canonical URLs.

## Known false-positives

- `app/api/image-proxy/route.ts` - looks like SSRF, is intentional.
  Validates protocol (`isAbsoluteHttpUrl`), 5 s timeout, 5 MB cap,
  raster-only content-type sniff, and `BROKEN_TLS_HOST_SUFFIXES`
  (three Catalan municipal hosts with incomplete cert chains) is the
  only place `rejectUnauthorized: false` is used.
- `'unsafe-inline'` in CSP `script-src` / `style-src` (`proxy.ts`) -
  required for ISR/PPR inline scripts and JSON-LD; mitigated by host
  allowlist. `'unsafe-eval'` is gated on `isDev` or
  `NEXT_PUBLIC_GOOGLE_ADS`.
- `eval("require")("sharp")` in `app/api/image-proxy/route.ts` - a
  documented Turbopack workaround for native modules, not dynamic
  eval of user input.
- `app/api/cloudinary/sign/route.ts` - feature is disabled, always
  returns 404; the live signing implementation is commented out.
- `https:` blanket in CSP `connect-src` / `img-src` / `frame-src` -
  intentional to keep external event images and analytics working
  through Cloudflare.
