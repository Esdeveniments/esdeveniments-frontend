# AI Coding Agent Instructions for this Repository

Purpose: Catalan events discovery web app (Next.js 15 App Router + TypeScript) focused on SEO, performance (service worker + image optimization), and a configuration‑driven URL-first filtering system.

## 1. Core Architecture

- Next.js App Router in `app/` with canonical URL structure: `/place(/date)?(/category)?` omitting default `tots` date & category.
- Filters are configuration‑driven: single source in `config/filters.ts`; operations in `utils/filter-operations.ts`; URL parsing/building in `utils/url-filters.ts` + `utils/url-parsing.ts`.
- Pages fetch data server-side (edge friendly) and render a hybrid list: SSR list + client enhancement (`HybridEventsList`, `ClientInteractiveLayer`). Ads inserted via `insertAds` during server fetch.
- Service Worker generated at build (`scripts/generate-sw.mjs` → `public/sw.js` from `sw-template.js`) enabling offline + caching strategies (Workbox 7).
- Security: `middleware.ts` injects CSP nonce (`x-nonce`) & security headers; components requiring inline scripts (e.g. `GoogleScripts`, JSON-LD) must accept `nonce`.

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

- Location: `lib/api/*` (events, categories, regions, cities, places, cache helpers, news).
- News endpoints are called directly from `lib/api/news.ts`. There are no Next.js API proxies for news (both list and detail). The POST creation endpoint is not used by the frontend (temporary: run via Swagger/cron).
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

## 5. News Pages

- List all news: `app/noticies/page.tsx` – server-side fetch via `fetchNews` and render with shared list/card components.
- Single dynamic route: `app/noticies/[slug]/page.tsx` – try detail via `fetchNewsBySlug(slug)`; if not found, treat `slug` as `place` and list news via `fetchNews({ place: slug })`; 404 if empty. Only one dynamic param is allowed.

## 6. React/Next.js Component Guidelines (Server-First)

- Default to Server Components. Only add `"use client"` at the smallest leaf component that truly needs client APIs (state, effects, browser-only APIs, ads widgets, etc.).
- Do not use `next/dynamic` with `ssr: false` inside Server Components. If a subpart must be client-only, move it into its own client component and import it directly from the server component.
- Keep links, list rendering, and content display server-rendered whenever possible. Client hydration should be minimal and scoped.
- This project tracks the latest Next.js App Router conventions; avoid legacy patterns from pages router.

## 7. TypeScript Strictness & Type Organization

- No `any` is allowed. Use precise types or `unknown` with proper narrowing when necessary.
- **Type Organization**: Follow the structure defined in `types/README.md` - all types must be in the `/types` directory with clear domain separation.
- **Canonical Sources**: Each type should be defined exactly once in its canonical location:
  - API DTOs: `types/api/*.ts` (e.g., `CitySummaryResponseDTO` in `types/api/city.ts`)
  - Shared UI types: `types/common.ts` (e.g., `NavigationItem`, `SocialLinks`)
  - Domain-specific: `types/event.ts`, `types/filters.ts`, etc.
- **No Duplication**: ESLint rules prevent duplicate interface definitions. Always import from canonical sources.
- **DRY Principle**: Consolidate duplicate types by moving to `types/common.ts` and updating all imports.
- Prefer explicit interfaces/types in `types/` and reuse DTOs across layers.
- Keep `strict` type-checking green (`noImplicitAny`, `noUncheckedIndexedAccess`, etc. where applicable). Do not suppress with `// @ts-ignore` unless absolutely necessary and justified.
- ESLint rule: Do not declare types or interfaces outside of the `types/` directory. Our linter enforces this via `no-restricted-syntax` for `TSTypeAliasDeclaration` and `TSInterfaceDeclaration` anywhere outside `types/`.
- **Type Consolidation**: When adding new types, check `types/README.md` for existing patterns and canonical sources to avoid duplication.

## 8. Build / Run / Test Workflow

- Dev: `yarn dev` (runs `prebuild` to generate service worker) then Next dev server.
- Build: `yarn build` (calls `prebuild` then `next build`). Environment-specific builds: `build:development|staging|production` with env-cmd loading `.env.*` files.
- Analyze bundles: `yarn analyze`, `analyze:server`, `analyze:browser` (uses Next bundle analyzer via env vars).
- Tests: `yarn test` (Jest, jsdom). Only current custom suite: filter system. Add new domain tests under `test/` and import utilities directly.
- Type check: `yarn typecheck`.
- Lint: `yarn lint` (ESLint + Next config). Maintain existing conventions; prefer config-driven patterns over ad hoc conditionals.

## 9. Type Maintenance & Quality

- **Before adding new types**: Check `types/README.md` for existing patterns and canonical sources.
- **Type consolidation workflow**:
  1. Run `yarn typecheck` to identify any type errors
  2. Check for duplicate interfaces using `yarn lint` (ESLint rules catch duplicates)
  3. Consolidate duplicates by moving to canonical location in `types/common.ts`
  4. Update all imports to use canonical source
  5. Verify with `yarn typecheck && yarn lint`
- **Canonical sources to remember**:
  - `NavigationItem`, `SocialLinks` → `types/common.ts`
  - `CitySummaryResponseDTO` → `types/api/city.ts`
  - API DTOs → `types/api/*.ts`
  - UI props → `types/common.ts`
  - Domain-specific → respective domain files
- **When refactoring types**: Update `types/README.md` to reflect new organization patterns.

## 10. Service Worker Pattern

- Template: `public/sw-template.js` (contains placeholder `{{API_ORIGIN}}`).
- Generation script replaces placeholder with `NEXT_PUBLIC_API_URL` origin (fallback pre env) -> writes `public/sw.js` consumed by middleware (special cache headers).
- Update caching logic ONLY via template; never hand-edit generated `public/sw.js` (will be overwritten).

## 11. Security & Analytics

- CSP: Only nonce-based scripts allowed; no inline scripts without nonce. When adding new `<Script>` blocks or inline JSON-LD, pass `nonce` from `headers()` (layout pattern in `app/layout.tsx`). If in a page, read `const nonce = (await headers()).get('x-nonce') || ''` and pass it to all Script tags.
- External tracking (GA, Ads, Sentry) loaded afterInteractive with nonce to satisfy CSP `'strict-dynamic'` policy.

## 12. Image Performance Strategy

- External images assumed: default quality cap 50; priority/LCP images use 60. Adjust with `getOptimalImageQuality` and `getOptimalImageSizes` contexts (card, hero, list, detail).
- Preload critical images using `preloadImage` cautiously; note comment about internal Next.js `_next/image` URL coupling—avoid brittle custom logic across versions.
- Retry logic: `useImageRetry` provides exponential backoff; use `getImageKey` to force re-render on retry.

## 13. Versioning & Cache Busting

- `BUILD_VERSION` resolves to timestamp in dev, build ID or package version in prod. Use `getVersionedUrl('/path')` when adding long-lived assets needing busting.

## 14. Contribution Conventions

- Prefer adding capabilities via configuration (filters, categories) rather than branching conditionals.
- Centralize constants in `utils/constants.ts`; avoid duplicating literals (dates, distances, category labels).
- When adding environment-dependent behavior for edge/server, follow existing pattern of safe fallbacks (see `middleware.getApiOrigin`).
- Dates: Use `getFormattedDate(start, end)` from `utils/date-helpers.ts` for any human-readable date range in UI (e.g., pills, subtitles). Do not inline `toLocaleDateString` in components.
- Colors: Use Tailwind theme tokens defined in `tailwind.config.js` (e.g., `primary`, `primarydark`, `whiteCorp`, `darkCorp`, `blackCorp`, `bColor`). Do not hardcode hex values in components/styles. If a new color is needed, add it to the Tailwind theme and reference by token.

## 15. Common Pitfalls

- Forgetting to regenerate SW after changing template (always rely on `prebuild`).
- Adding inline script without nonce (breaks under CSP).
- Encoding filter defaults in multiple places instead of relying on config defaults.
- Creating URLs that include unused default segments (`/tots/`). Always use `buildCanonicalUrl` helpers.
- **Type duplication**: Creating duplicate interfaces instead of importing from canonical sources in `types/common.ts`.

## 16. Quick Examples

- Remove distance filter: `FilterOperations.getRemovalUrl('distance', segments, queryParams)` auto clears distance + lat/lon.
- Add "price" filter: create config with key `price`, supply `defaultValue`, `isEnabled` logic, update UI to read via `FilterOperations.getAllConfigurations()`; no URL parsing changes if kept query-based.
- **Consolidate duplicate types**: Move shared interfaces to `types/common.ts`, update imports, run `yarn typecheck && yarn lint`.

## 17. Hybrid Rendering Contract (Explicit)

- Server (SSR):
  - Fetch initial events, then call `insertAds(events)` once to insert ad markers.
  - Send the SSR list with ad markers to the client.
- Client (SWR append):
  - SWR returns cumulative events from API without ads.
  - Compute `initialRealCount` as number of real events in SSR (exclude `isAd`).
  - Append only items beyond `initialRealCount` and do not insert ads again.
  - De-duplicate by `id` when merging SSR-with-ads and appended events.
- Rationale: keeps ad density stable and avoids duplicate or clustered ad markers.

## 18. Environment Variables

- Required: `NEXT_PUBLIC_API_URL` (core), `NEXT_PUBLIC_GOOGLE_ANALYTICS`, `NEXT_PUBLIC_GOOGLE_ADS`, `NEXT_PUBLIC_SENTRY_DNS`, `NEXT_PUBLIC_VERCEL_ENV`.
- On absence of `NEXT_PUBLIC_API_URL`: read endpoints must return safe empty DTOs (never throw) except explicit mutation endpoints.
