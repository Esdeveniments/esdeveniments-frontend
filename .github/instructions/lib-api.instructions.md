---
applyTo: "lib/api/**/*.ts"
---

# Client Library & External Wrapper Rules

## Client libraries (`lib/api/*.ts` — non-`-external` files)

- Our `/api/*` routes do not exist at build time, so server readers call the `*-external.ts` wrapper directly:
  - reference data (places, categories, regions, cities): in-memory cache after `await connection()`; `storeEmpty: false` where the wrapper returns `[]` on failure (a `null` 404 for a place is a real answer and stays cached);
  - `fetchEvents`, `fetchCategorizedEvents`: `no-store`, no cache;
  - `fetchEventsCached`: `"use cache"`, `fetchWithHmac(..., { skipConnection: true })`, throws on failure.
- Exceptions that still read through internal routes: event and news detail (`getInternalApiUrl` with `preferConfiguredOrigin`), profiles.
- Use query builders (`buildEventsQuery`, `buildNewsQuery`) from `utils/api-helpers.ts` — never construct URLSearchParams manually.

## External wrappers (`lib/api/*-external.ts`)

- Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (empty array, null, etc.).
- Use `fetchWithHmac` for all external calls (built-in 10s timeout, HMAC signing).
- **CRITICAL: Always pass `skipBodySigning: true`** on POST/PUT/DELETE calls. The backend HMAC verification ignores the request body — it only signs `timestamp + pathAndQuery`. Without this flag, all mutation requests fail with 401 "Invalid HMAC".
- Parse responses with Zod schemas from `lib/validation/`.
- Return safe fallback DTOs on error, except where a cached reader must tell failure from "empty": `fetchPlaceBySlugExternal` and `fetchPlacesAggregatedExternal` throw on errors so a failure is never cached.
- NEVER add `next: { revalidate, tags }` — this causes unbounded cache growth (one entry per unique URL).
