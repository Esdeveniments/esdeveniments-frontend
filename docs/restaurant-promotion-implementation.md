# Restaurant Promotion ("Where to eat")

State of the restaurant feature on event pages. Only the "Where to eat" list
is live. Paid restaurant promotion is **not** live: the form is commented out
and the backend never stored promotions.

## What is live

- `app/[locale]/e/[eventId]/components/LazyRestaurantPromotion.tsx` loads
  `RestaurantPromotionSection` client-only (`next/dynamic`, `ssr: false`).
- `components/ui/restaurantPromotion/RestaurantPromotionSection.tsx`:
  - Shows only for events that start within the fetch window (today to 15
    days ahead) and have coordinates.
  - **Click-to-load**: nothing is fetched until the user clicks. Every cache
    miss is a billed Google `searchNearby` call, so bots and passive
    scrollers must never trigger it.
  - Fetches `GET /api/places/nearby?lat&lng&limit=2&date` and renders
    `WhereToEatSection` with Google attribution.
  - The "promote your restaurant" CTA opens `PromotionInfoModal` (email
    contact), not a checkout.
- `app/api/places/nearby/route.ts`: Google Places proxy. Caches in Redis
  keyed by ~1.1 km-snapped coordinates (12 h TTL, deploy-independent) and
  fails soft (200 + empty list). See
  [the cost incident](./incidents/2026-06-26-places-api-cost.md) and
  `lib/cache/redis-client.ts`.

Google Places rules: store only `place_id` indefinitely and `lat/lng` for at
most 30 days; never persist names, addresses, ratings or photos; always show
the attribution.

## Dormant code (not reachable from the UI)

- `RestaurantPromotionForm.tsx`, `CloudinaryUploadWidget.tsx`,
  `PromotedRestaurantCard.tsx`.
- `POST /api/leads/restaurant`, `POST /api/cloudinary/sign`.
- `GET /api/promotions/config`, `POST /api/promotions/price-preview`
  (pricing from `config/pricing.ts`; tests in
  `test/restaurant-promotion.test.ts`).
- `GET /api/promotions/active` is a placeholder that always returns `null`.
- The form still posts to `/api/stripe/checkout`, which no longer exists.
  Stripe checkout now lives under `/api/sponsors/*` for the sponsor banner
  system (see [`strategy-pricing.md`](./strategy-pricing.md)). Wire the form
  to a real checkout before re-enabling it.

## To turn paid promotion on

1. Backend: persist leads and promotions, expose active-promotion lookup by
   event and geo scope, activate on Stripe webhook (idempotent).
2. Frontend: replace the `/api/promotions/active` placeholder with a real
   `*-external.ts` wrapper (see the `api-layer-patterns` skill), point the
   form at a real checkout route, re-enable the form in
   `RestaurantPromotionSection.tsx`.
