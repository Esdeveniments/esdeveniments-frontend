---
name: api-layer-patterns
description: How backend data flows in esdeveniments.cat - server readers (lib/api/*.ts) and internal routes (app/api/*, for browser code) both call the external wrapper (lib/api/*-external.ts) with fetchWithHmac; reader caches (createCache, storeEmpty, "use cache"), per-route Cache-Control and the query builders. Use when adding or changing an API endpoint, fetching backend data, touching lib/api/* or app/api/*, fetchWithHmac, X-Backend-Key/HMAC, the /api gate, or when debugging API caching or build errors like '"<!DOCTYPE"... is not valid JSON'.
license: MIT
---

# API layer patterns

The rules live in AGENTS.md › API layer and › Hard rules. In one line each:

- Pages and components never call the backend. Server code calls a `lib/api/*.ts` reader, which calls `lib/api/*-external.ts`. Browser code calls `app/api/*`, which calls the same wrapper.
- Our `/api/*` routes don't exist during `next build`, so server readers don't call them (see [Server readers](#layer-1-server-reader-libapiresourcets)). `news.ts`, `profiles.ts` and event/news detail still do, through `getInternalApiUrl({ preferConfiguredOrigin })`.
- Never add `next: { revalidate, tags }` to `fetchWithHmac` in `lib/api/*-external.ts` (fetch-cache explosion, Jan 2026).
- Never use raw `fetch()` to reach the backend; use `fetchWithHmac`.

This skill is the how-to. Copy a real file before you copy a template.

## The three layers

```text
Server Component                  SWR hook (browser)
  └─ lib/api/<resource>.ts          └─ app/api/<resource>/route.ts
     server reader: connection(),      internal route: Cache-Control per
     createCache / "use cache"         route, error status
       └──────────────┬─────────────────┘
            lib/api/<resource>-external.ts   fetchWithHmac + Zod parse + safe fallback
                 └─ backend (getApiUrl(), e.g. https://api.esdeveniments.cat/api)
```

Reference set to copy: `lib/api/categories-external.ts`, `app/api/categories/route.ts`, `lib/api/categories.ts`.

## Layer 3: external wrapper (`lib/api/*-external.ts`)

From `lib/api/categories-external.ts`:

```typescript
import { CategorySummaryResponseDTO } from "types/api/category";
import { fetchWithHmac } from "lib/api/fetch-wrapper";
import { getApiUrl } from "@utils/api-helpers";
import { parseCategories } from "lib/validation/category";

export async function fetchCategoriesExternal(): Promise<CategorySummaryResponseDTO[]> {
  const api = getApiUrl();
  try {
    // No `next: { revalidate }` - uses no-store to avoid cache explosion
    const res = await fetchWithHmac(`${api}/categories`);
    if (!res.ok) {
      console.error(`Failed to fetch categories: HTTP ${res.status}`);
      return [];
    }
    const json = await res.json();
    return parseCategories(json);
  } catch (error) {
    console.error("fetchCategoriesExternal: failed", error);
    return [];
  }
}
```

- **Base URL**: `getApiUrl()` (`utils/api-helpers.ts`) resolves `API_URL` → `NEXT_PUBLIC_API_URL` → `config/api-defaults.json`. It already ends in `/api`, so write `${getApiUrl()}/categories`, not `/api/categories`.
- **Missing config**: `getApiUrl()` never returns empty. If a missing config must take the fallback path, check `isApiUrlConfigured()` first (see `lib/api/users-external.ts`, `lib/api/promotions.ts`).
- **Validation**: parse with a helper from `lib/validation/<resource>.ts` (`parseCategories`, `parsePagedEvents`, …). See the `data-validation-patterns` skill.
- **Reads** never throw: `!res.ok` → log and return `[]`/`null`/empty page; `catch` → log and return the same.
- **Mutations** throw. On a non-OK response read `response.text()` first and put it in the error. JSON/FormData POST/PUT/DELETE pass `skipBodySigning: true`. Copy `lib/api/sponsors-external.ts` or `lib/api/favorites-external.ts`.
- **Need the status upstream?** Return a result object instead of a fallback, like `fetchEventsExternalResult` in `lib/api/events-external.ts`, so the route can answer with an error status.

### `fetchWithHmac` (`lib/api/fetch-wrapper.ts`)

- Takes an absolute backend URL. Sends `X-Backend-Key` (`BACKEND_SERVICE_SECRET`, only to the `getApiUrl()` origin) and, while `HMAC_SECRET` is set, legacy `x-hmac`/`x-timestamp` (signs `body + timestamp + pathAndQuery`; FormData and `skipBodySigning: true` sign an empty body, which is what the legacy backend checks).
- `cache: "no-store"`, 10 s timeout. Options: `timeout`, `skipBodySigning`, `skipConnection`.
- It calls `await connection()` first. Inside `"use cache"` that throws, so pass `skipConnection: true` there (see `getCachedEventsPage` in `lib/api/events.ts`).

## Layer 2: internal route (`app/api/*/route.ts`)

From `app/api/categories/route.ts`:

```typescript
import { NextResponse } from "next/server";
import { fetchCategoriesExternal } from "@lib/api/categories-external";
import { handleApiError } from "@utils/api-error-handler";

export async function GET() {
  try {
    const data = await fetchCategoriesExternal();
    return NextResponse.json(data, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
      },
    });
  } catch (e) {
    return handleApiError(e, "/api/categories", {
      errorMessage: "Failed to load categories",
    });
  }
}
```

- **Cache-Control** is set per route; read the neighbours in `app/api/**/route.ts` before picking values. Successful public GETs start with `public,`. Two examples: `/api/events` uses `s-maxage=1800, stale-while-revalidate=3600`; `/api/categories` uses `86400, 86400`. Per-user, auth and mutation responses use `no-store`.
- **Don't let the CDN cache a failure.** If the success response is cacheable and the backend failed, return the error status with `Cache-Control: no-store`, not a cached empty list. See `app/api/events/route.ts`. `/api/categories` above doesn't do this yet: `fetchCategoriesExternal` returns `[]` on failure, so an outage is cached for a day.
- `handleApiError` (`utils/api-error-handler.ts`) logs, reports to Sentry and returns a JSON error.
- Parse and clamp query params in the route (see the `page`/`size` clamp in `app/api/events/route.ts`).

### Cloudflare cache and mutations

Cloudflare caches public HTML pages for `s-maxage=1800`, but not `/api/*` (cf-cache-status: DYNAMIC, no Cache Rule). `updateTag`/`revalidateTag` clear only Next's caches, so a mutation that changes what a public page shows must also purge Cloudflare:

```ts
import { after } from "next/server";
import { purgeEventPagesFromCdn } from "@lib/cdn/cloudflare-purge";

updateTag(eventsTag);
after(() => purgeEventPagesFromCdn([oldEvent, updatedEvent]));
```

- Tags are built in `lib/cdn/cache-tags.ts` and shared by `utils/proxy-page-headers.ts` (labels, from `proxy.ts`) and the purge (so both always match). Add a page kind there, not ad hoc.
- `purgeCloudflareCache` (`lib/cdn/cloudflare-purge.ts`, server-only) takes `{ tags }`, `{ prefixes }` or `{ purgeEverything: true }`, uses `safeFetch`, validates the reply with Zod, reports failures to Sentry and never throws.
- Free plan: 5 purge requests/min for the whole account, 100 tags per request. One batched call per change; never purge in a loop.

Other caches an event change passes through (checked 2026-11-03):

- Redis page cache (`cache-handler.mjs`): shared by every process; `updateTag`/`revalidateTag` expire its entries.
- `"use cache"` store (`use-cache-handler.mjs`, Next's default handler, 64 MB per process): tags are tracked in that process. Production runs one Node process per container (`docker-entrypoint.sh`), so `updateTag` reaches it. With more processes or replicas, the other ones would keep entries until `cacheLife` expires.
- Service worker (`public/sw-template.js`): pages are NetworkFirst, so they don't hide a purge. `/api/events` and `/api/events/categorized` are StaleWhileRevalidate for 10 min, so a client-side list (filters, next page) can show the old list once on that device and update on the next fetch.

### The `/api` gate

`proxy.ts` runs `utils/api-gate.ts`. Any `/api/*` route that is not allowlisted requires the frontend HMAC header, so a browser `fetch` to it fails. To make a route public, add it to one of the lists in `utils/api-gate.ts`:

- `PUBLIC_API_PATTERNS`: GET-only regexes (regions, categories, cities, news, places, users).
- `PUBLIC_API_EXACT_PATHS`: exact paths, any method (promotions, favorites, sponsors, push, …). The route must protect itself (cookie auth, Origin check, signature).
- `PUBLIC_API_GET_EXACT_PATHS`: GET-only exact paths (the Logto `/api/auth/*` routes).
- Events (`EVENTS_PATTERN`, GET) and `/api/image-proxy` are allowed inline in the same file.

Tests: `test/proxy-public-api-patterns.test.ts`. Auth routes are not part of this proxy pattern; see the `auth-patterns` skill.

### Paid upstreams

For per-request-billed APIs (Google Places), CDN headers are not enough: on Cloudflare Free `/api/*` is not edge-cached without a Cache Rule, and the Next cache is wiped on every deploy. Read through the app Redis cache (`lib/cache/redis-client.ts`) with a coarse key and cap cost at the provider. See `app/api/places/nearby/route.ts` and `docs/incidents/2026-06-26-places-api-cost.md`.

## Layer 1: server reader (`lib/api/<resource>.ts`)

From `lib/api/categories.ts`:

```typescript
// fetchCategoriesExternal returns [] on failure; storeEmpty: false keeps a
// failure from being cached for a day.
const { cache: categoriesListCache, clear: clearCategoriesListCache } =
  createCache<CategorySummaryResponseDTO[]>(86400000, { storeEmpty: false });

export async function fetchCategories(): Promise<CategorySummaryResponseDTO[]> {
  try {
    // Keep the request-time signal fetchWithHmac gives on a cache miss, so a
    // warm cache cannot change what Next prerenders.
    await connection();
    return await categoriesListCache(fetchCategoriesExternal);
  } catch (e) {
    console.error("Error fetching categories:", e);
    return [];
  }
}

export const getCategories = reactCache(fetchCategories); // per-request dedupe
```

- The reader calls the wrapper directly, at build and at runtime. The old `isBuildPhase` switch (build → wrapper, runtime → internal route) was also true at runtime on Coolify, so the internal-route path never ran in production; it is gone.
- `createCache`/`createKeyedCache` (`lib/api/cache.ts`) give a 24 h in-memory TTL for low-cardinality data (categories, cities, regions, places).
  - `storeEmpty: false` skips `null`/`undefined`/`[]`: use it where the wrapper returns those on failure. Keep the default where empty is a real answer (`fetchPlaceBySlug` caches a 404 `null`; promoted events cache `[]`).
  - `globalKey` keeps a `createCache` entry on `globalThis`. Next bundles pages, API routes and `instrumentation.ts` separately, each with its own copy of module-level state, so without it a cache filled in one bundle is cold in the others. Categories and regions-with-cities use it, and `instrumentation.ts` fills them at server start (`warmReferenceCaches`): the warm functions call the wrapper with `skipConnection: true`, because `connection()` throws outside a request. Tests that rely on `vi.resetModules()` for an empty cache must also clear `globalThis[Symbol.for("esdeveniments.cache.slots")]`.
  - `maxEntries` (keyed only) drops the oldest entry: bound caches keyed by user input (`fetchPlaceBySlug` uses 5,000).
  - Export a `clear*Caches()` and register it: add the tag to `CacheTag`/`RevalidatableTag` (`types/cache.ts`), then to `ALLOWED_TAGS` and `TAG_TO_CLEAR_FN` in `app/api/revalidate/route.ts`. Unregistered caches only expire after 24 h.
- A wrapper behind a cache must not hide a failure as a valid value: `fetchPlaceBySlugExternal` and `fetchPlacesAggregatedExternal` throw on errors and invalid payloads.
- Wrap readers used by both `generateMetadata` and the page in React `cache()`.
- Inside `"use cache"`, `connection()` throws: call `fetchWithHmac(url, { skipConnection: true })` and throw on failure, so the error is not cached. See `getCachedEventsPage`/`fetchEventsCached` in `lib/api/events.ts` (the `[place]` page's events).
- `fetchEvents` and `fetchCategorizedEvents` have no cache (`no-store`).
- Browser code (SWR hooks) fetches relative `/api/...` URLs directly, e.g. `components/hooks/useEvents.ts`.

## Query builders and parameter mapping

Build query strings with the helpers in `utils/api-helpers.ts`; never hand-build `URLSearchParams` for events or news.

```typescript
import { buildEventsQuery, applyDistanceToParams } from "@utils/api-helpers";

const params: FetchEventsParams = { place: "barcelona", byDate: "avui", term: "jazz" };
applyDistanceToParams(params, { lat, lon, distance }); // sets radius/lat/lon only when given
const qs = buildEventsQuery(params); // URLSearchParams, page defaults to 0, size to 10
```

- `FetchEventsParams` (`types/event.ts`) already uses the API names: `term` (UI filter `searchTerm`) and `radius` (UI `distance`, via `distanceToRadius`).
- `buildNewsQuery(params, setDefaults = true)` defaults `page` 0 and `size` 100.
- Mapping rules (byDate vs from/to, default distance, pagination via `last`): AGENTS.md › API layer.

## Adding an endpoint

1. DTO in `types/api/<resource>.ts`.
2. Zod schema + `parse*` helper in `lib/validation/<resource>.ts`.
3. `lib/api/<resource>-external.ts`: `fetchWithHmac(`${getApiUrl()}/...`)`, parse, safe fallback. No `next`.
4. `app/api/<resource>/route.ts`, only if browser code needs it: call the wrapper, set `Cache-Control`, add it to the gate lists.
5. `lib/api/<resource>.ts`: call the wrapper directly (+ `connection()` and `createCache` if the data is low-cardinality).
6. Test the wrapper's fallback and the route's headers (patterns: `test/api-events.test.ts`, `test/events-api-outage.test.ts`, `test/favorites-external.test.ts`).

Templates with placeholders: `templates/external-wrapper-template.ts`, `templates/internal-route-template.ts`, `templates/client-library-template.ts`.

## Errors

- Pass the original error to `captureException(error, { tags: { section: "events-fetch" }, extra: { params } })`; never `new Error(error.message)`.
- Use `getSanitizedErrorMessage` (`utils/api-error-handler.ts`) before logging unknown errors.
- Log a backend outage once, in the wrapper. `app/api/events/route.ts` skips `handleApiError` for that reason, so one outage doesn't send one Sentry event per request.

## Reference files

- `lib/api/fetch-wrapper.ts`: `fetchWithHmac`
- `utils/api-helpers.ts`: `getApiUrl`, `isApiUrlConfigured`, `getInternalApiUrl`, query builders
- `utils/api-gate.ts`: public route lists
- `utils/api-error-handler.ts`: `handleApiError`, `getSanitizedErrorMessage`
- `lib/api/cache.ts`: `createCache`, `createKeyedCache`
- `utils/safe-fetch.ts`: `safeFetch`/`fireAndForgetFetch` for non-backend services
