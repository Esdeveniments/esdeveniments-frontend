---
applyTo: "lib/api/**/*.ts"
---

# Client Library & External Wrapper Rules

## Client libraries (`lib/api/*.ts` — non-`-external` files)

- Our `/api/*` routes do not exist at build time, and calling them at runtime loops back through Cloudflare (where Hetzner datacenter IPs can hit 403/WAF challenges). **Every** server reader calls its `*-external.ts` wrapper directly — never use `fetch()` to call `/api/*` from `lib/api/*.ts` (ESLint warns on raw `fetch()` here):
  - reference data (places, categories, regions, cities): in-memory cache after `await connection()`; the list readers use `storeEmpty: false` so a failed (empty) list is not cached; `fetchPlaceBySlug` keeps the default, because its `null` is a real 404;
  - `fetchEvents`, `fetchCategorizedEvents`: `no-store`, no cache;
  - `fetchEventsCached`: its inner `"use cache"` read uses `fetchWithHmac(..., { skipConnection: true })` and throws on failure so nothing bad is cached; `fetchEventsCached` itself never throws (it falls back to `fetchEvents` or an empty page);
  - event detail (`fetchEventBySlug`, `fetchEventBySlugWithStatus`, `getCachedEventBySlug`): calls `events-external.ts` directly through `eventDetailCache` (`createKeyedCache` with `globalKey: "events:detail"`, 30 min TTL, invalidated via `deleteEventDetailCache`); `getCachedEventBySlug` passes `skipConnection: true` inside `"use cache"`;
  - news (`lib/api/news.ts`): calls `news-external.ts` directly through bounded `globalKey` keyed caches (`news:list` 10 min, `news:cities` 1 h, `news:detail` 24 h `storeEmpty: false` shared with `/api/news/[slug]`); `getNewsBySlugForMetadata` passes `skipConnection: true` inside `"use cache"`;
  - profiles (`lib/api/profiles.ts`): calls `getUserByUsernameExternalResult` directly (`getUserByUsernameCached` passes `skipConnection: true` inside `"use cache"` with `userTag`, no extra in-memory TTL so profile edits invalidate immediately).
- Use query builders (`buildEventsQuery`, `buildNewsQuery`) from `utils/api-helpers.ts` — never construct URLSearchParams manually.

## External wrappers (`lib/api/*-external.ts`)

- Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (empty array, null, etc.).
- Use `fetchWithHmac` (`lib/api/fetch-wrapper.ts`) for all backend calls: 10s timeout, `X-Backend-Key` and legacy HMAC headers.
- For strict detail-by-slug endpoints (null only on 404 or malformed-slug 400; throw with `.status` on outages/invalid payloads), reuse `fetchBackendDetailBySlug` (`lib/api/detail-external.ts`).
- **CRITICAL: pass `skipBodySigning: true`** on JSON POST/PUT/DELETE calls. Legacy HMAC signs only `timestamp + pathAndQuery`; without the flag, mutations fail with 401 "Invalid HMAC".
- Parse responses with Zod schemas from `lib/validation/`.
- Return safe fallback DTOs on error, except where a cached reader must tell failure from "empty": `fetchPlaceBySlugExternal`, `fetchPlacesAggregatedExternal`, `fetchEventBySlug`, `fetchNewsBySlugExternal`, and `fetchNews*StrictExternal` throw on errors so a failure is never cached.
- NEVER add `next: { revalidate, tags }` — this causes unbounded cache growth (one entry per unique URL).
