# AI Coding Agent Instructions for this Repository

Purpose: Catalan events discovery web app (Next.js 15 App Router + TypeScript) focused on SEO, performance (service worker + image optimization), and a configuration‑driven URL-first filtering system.

## 1. Core Architecture

- Next.js App Router in `app/` with canonical URL structure: `/place(/date)?(/category)?` omitting default `tots` date & category.
- Filters are configuration‑driven: single source in `config/filters.ts`; operations in `utils/filter-operations.ts`; URL parsing/building in `utils/url-filters.ts` + `utils/url-parsing.ts`.
- Pages fetch data server-side (edge friendly) and render a hybrid list: SSR list + client enhancement (`HybridEventsList`, `ClientInteractiveLayer`). Ads inserted via `insertAds` during server fetch.
- Service Worker generated at build (`scripts/generate-sw.mjs` → `public/sw.js` from `sw-template.js`) enabling offline + caching strategies (Workbox 7).
- Security: `middleware.ts` injects CSP nonce (`x-nonce`) & security headers; components requiring inline scripts (e.g. `GoogleScripts`, JSON-LD) must accept `nonce`.
- Performance utilities: image quality (`utils/image-quality.ts`), preload (`utils/image-preload.ts`), retry hook (`components/hooks/useImageRetry.ts`), build version cache‑busting (`utils/buildVersion.ts`).

## 2. Filters & URLs (MOST IMPORTANT DOMAIN LOGIC)

Adding a new filter:

1. Add config object to `config/filters.ts` (key, defaultValue, isEnabled, getDisplayText, getRemovalChanges[, dependencies, specialCases]).
2. Logic auto‑integrates with `FilterOperations` (removal URLs, active state, defaults, validation tests) and tests in `test/filter-system.test.ts` still pass if consistent.
3. URL construction uses `buildFilterUrl` & `buildCanonicalUrlDynamic`; ensure default values avoid bloating URL.
4. Special redirect case: byDate + place=catalunya + category=tots may redirect to home.
   Legacy note: `utils/filter-config.ts` retained for backward compatibility—do not extend; migrate usages to `FilterOperations`.

## 3. URL Parsing Rules

- Canonical omission rules: if date === `tots` AND category === `tots` → `/place`; if date === `tots` and category != `tots` → `/place/category`; if category === `tots` and date != `tots` → `/place/date`.
- Query params for non‑segment filters: `search`, `distance`, `lat`, `lon` (distance omitted when default 50). Parsing helpers: `parseFiltersFromUrl`, `urlToFilterState`, `getRedirectUrl` enforce normalization.
- Dynamic categories supported; fallback to legacy list (see `utils/url-filters.ts` & `utils/constants.ts`). Always validate slugs via `isValidCategorySlug`.

## 4. Data Fetch & API Layer

- Location: `lib/api/*` (events, categories, regions, cities, places, cache helpers).
- Env guard: every fetch first checks `NEXT_PUBLIC_API_URL`; if missing returns safe empty shape (prevents build/runtime crashes on preview environments).
- Guarded pattern (required):
  - Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (array `[]`, map `{}`, or null depending on DTO).
  - Build query by filtering undefined keys → `URLSearchParams`.
  - Wrap in try/catch, log errors, and return a safe fallback DTO for read endpoints.
  - Use cache wrappers `createCache`/`createKeyedCache` where appropriate.
- Pagination: API returns `PagedResponseDTO` `{ content[], currentPage, pageSize, totalElements, totalPages, last }`; use `last` to stop infinite scroll.
- Caching: lightweight in‑memory TTL (24h = 86400000 ms) via `createCache` (single value) & `createKeyedCache` (per id/slug). Used for categories, regions, cities, place lookups to cut edge fetch latency.
- Resilience: regions & regions-with-cities endpoints fall back to mock or safe empty data on failure (keep UX functional offline / during API outages). Apply env guard consistently across categories, cities, regions, and events.
- Events fallback chain (place page): requested place → region (lookup in grouped regions) → latest global (no filters). Maintain this order when altering fetch logic.
- Event create/update: `createEvent` posts multipart with `request` JSON + optional `imageFile`; `updateEventById` is JSON PUT. On non-OK, read `response.text()` for detailed error before throwing (uniform policy for all mutations).
- Distance & geo: UI “distance” + `lat/lon` become API `radius/lat/lon`; compute `radius` via `distanceToRadius(distance)` and only send when defined (avoid default 50). Helper: `distanceToRadius` in `types/event.ts`.
- Search term: internal filter key `searchTerm` maps to API param `term`; maintain mapping when extending filters.
- Date filtering: `byDate` shortcut (avui, dema, setmana, cap-de-setmana) and optional explicit `from/to`; don’t send both unless intentional.
- Ad insertion: `insertAds` decorates event list with synthetic `{ isAd: true }` items. See Hybrid Rendering contract for client append rules.
- Adding new API call (pattern): define DTO in `types/api/*` → implement fetch with env guard + try/catch + safe fallback → consider cache if low volatility → expose minimal params object → keep query param names identical to backend.
- Avoid: duplicating manual query string concatenation, bypassing cache wrappers, throwing raw fetch errors without fallback object.

## 5. Build / Run / Test Workflow

- Dev: `yarn dev` (runs `prebuild` to generate service worker) then Next dev server.
- Build: `yarn build` (calls `prebuild` then `next build`). Environment-specific builds: `build:development|staging|production` with env-cmd loading `.env.*` files.
- Analyze bundles: `yarn analyze`, `analyze:server`, `analyze:browser` (uses Next bundle analyzer via env vars).
- Tests: `yarn test` (Jest, jsdom). Only current custom suite: filter system. Add new domain tests under `test/` and import utilities directly.
- Type check: `yarn typecheck`.
- Lint: `yarn lint` (ESLint + Next config). Maintain existing conventions; prefer config-driven patterns over ad hoc conditionals.

## 6. Service Worker Pattern

- Template: `public/sw-template.js` (contains placeholder `{{API_ORIGIN}}`).
- Generation script replaces placeholder with `NEXT_PUBLIC_API_URL` origin (fallback pre env) -> writes `public/sw.js` consumed by middleware (special cache headers).
- Update caching logic ONLY via template; never hand-edit generated `public/sw.js` (will be overwritten).

## 7. Security & Analytics

- CSP: Only nonce-based scripts allowed; no inline scripts without nonce. When adding new `<Script>` blocks or inline JSON-LD, pass `nonce` from `headers()` (layout pattern in `app/layout.tsx`). If in a page, read `const nonce = (await headers()).get('x-nonce') || ''` and pass it to all Script tags.
- External tracking (GA, Ads, Sentry) loaded afterInteractive with nonce to satisfy CSP `'strict-dynamic'` policy.

## 8. Image Performance Strategy

- External images assumed: default quality cap 50; priority/LCP images use 60. Adjust with `getOptimalImageQuality` and `getOptimalImageSizes` contexts (card, hero, list, detail).
- Preload critical images using `preloadImage` cautiously; note comment about internal Next.js `_next/image` URL coupling—avoid brittle custom logic across versions.
- Retry logic: `useImageRetry` provides exponential backoff; use `getImageKey` to force re-render on retry.

## 9. Versioning & Cache Busting

- `BUILD_VERSION` resolves to timestamp in dev, build ID or package version in prod. Use `getVersionedUrl('/path')` when adding long-lived assets needing busting.

## 10. Contribution Conventions

- Prefer adding capabilities via configuration (filters, categories) rather than branching conditionals.
- Centralize constants in `utils/constants.ts`; avoid duplicating literals (dates, distances, category labels).
- When adding environment-dependent behavior for edge/server, follow existing pattern of safe fallbacks (see `middleware.getApiOrigin`).

## 11. Common Pitfalls

- Forgetting to regenerate SW after changing template (always rely on `prebuild`).
- Adding inline script without nonce (breaks under CSP).
- Encoding filter defaults in multiple places instead of relying on config defaults.
- Creating URLs that include unused default segments (`/tots/`). Always use `buildCanonicalUrl` helpers.

## 12. Quick Examples

- Remove distance filter: `FilterOperations.getRemovalUrl('distance', segments, queryParams)` auto clears distance + lat/lon.
- Add “price” filter: create config with key `price`, supply `defaultValue`, `isEnabled` logic, update UI to read via `FilterOperations.getAllConfigurations()`; no URL parsing changes if kept query-based.

## 13. Hybrid Rendering Contract (Explicit)

- Server (SSR):
  - Fetch initial events, then call `insertAds(events)` once to insert ad markers.
  - Send the SSR list with ad markers to the client.
- Client (SWR append):
  - SWR returns cumulative events from API without ads.
  - Compute `initialRealCount` as number of real events in SSR (exclude `isAd`).
  - Append only items beyond `initialRealCount` and do not insert ads again.
  - De-duplicate by `id` when merging SSR-with-ads and appended events.
- Rationale: keeps ad density stable and avoids duplicate or clustered ad markers.

## 14. Testing & Validation Aids

- URL normalization and redirect tests for omission rules and 2-segment interpretation (date vs category).
- API fallback behavior tests for categories, cities, and regions.
- Filter configuration integrity: use `FilterOperations.validateConfiguration()` in tests to catch duplicate keys or missing functions.
- ISR seeds: prefer `getTopStaticCombinations()` to generate top routes.

## 15. Environment Variables

- Required: `NEXT_PUBLIC_API_URL` (core), `NEXT_PUBLIC_GOOGLE_ANALYTICS`, `NEXT_PUBLIC_GOOGLE_ADS`, `NEXT_PUBLIC_SENTRY_DNS`, `NEXT_PUBLIC_VERCEL_ENV`.
- On absence of `NEXT_PUBLIC_API_URL`: read endpoints must return safe empty DTOs (never throw) except explicit mutation endpoints.
