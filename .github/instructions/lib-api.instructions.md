---
applyTo: "lib/api/**/*.ts"
---

# Client Library & External Wrapper Rules

## Client libraries (`lib/api/*.ts` — non-`-external` files)

- Our `/api/*` routes do not exist at build time, so server readers call the `*-external.ts` wrapper directly:
  - reference data (places, categories, regions, cities): in-memory cache after `await connection()`; the list readers use `storeEmpty: false` so a failed (empty) list is not cached; `fetchPlaceBySlug` keeps the default, because its `null` is a real 404;
  - `fetchEvents`, `fetchCategorizedEvents`: `no-store`, no cache;
  - `fetchEventsCached`: its inner `"use cache"` read uses `fetchWithHmac(..., { skipConnection: true })` and throws on failure so nothing bad is cached; `fetchEventsCached` itself never throws (it falls back to `fetchEvents` or an empty page).
- Exceptions that still read through internal routes: event and news detail (`getInternalApiUrl` with `preferConfiguredOrigin`), profiles.
- Use query builders (`buildEventsQuery`, `buildNewsQuery`) from `utils/api-helpers.ts` — never construct URLSearchParams manually.

## External wrappers (`lib/api/*-external.ts`)

- Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (empty array, null, etc.).
- Use `fetchWithHmac` (`lib/api/fetch-wrapper.ts`) for all backend calls: 10s timeout, `X-Backend-Key` and legacy HMAC headers.
- **CRITICAL: pass `skipBodySigning: true`** on JSON POST/PUT/DELETE calls. Legacy HMAC signs only `timestamp + pathAndQuery`; without the flag, mutations fail with 401 "Invalid HMAC".
- Parse responses with Zod schemas from `lib/validation/`.
- Return safe fallback DTOs on error, except where a cached reader must tell failure from "empty": `fetchPlaceBySlugExternal` and `fetchPlacesAggregatedExternal` throw on errors so a failure is never cached.
- NEVER add `next: { revalidate, tags }` — this causes unbounded cache growth (one entry per unique URL).
