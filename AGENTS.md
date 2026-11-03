# AGENTS.md

Single source of truth for AI agents working in this repo (Copilot, Claude Code, Codex, Cursor and others all read this file). Keep it current: when code changes a rule below, change the rule in the same PR.

**What this is**: esdeveniments.cat, a Catalan events site. Next.js 16 App Router (`cacheComponents`, `partialPrefetching`), React 19, TypeScript strict, next-intl 4 (`ca` default, `es`, `en`), Tailwind, SWR, Vitest, Playwright. Node 26, Yarn 4.12 (Corepack). Priorities: SEO, Core Web Vitals, low hosting cost.

**Where else to look**

- `LESSONS.md`: repo gotchas learned the hard way. Read the relevant ones during research.
- `.claude/skills/*/SKILL.md`: how-to guides per task (table below).
- `DESIGN.md`: design tokens and UI rules.
- `docs/README.md`: index of setup guides, incidents (`docs/incidents/`) and perf baselines (`docs/performance/baselines.md`).

## Skills: load before coding

| Task | Skill | Key rule |
| --- | --- | --- |
| Components | `react-nextjs-patterns` | Server Component by default |
| Filters | `filter-system-dev` | Start in `config/filters.ts`; follow the skill's file list |
| API calls | `api-layer-patterns` | Three-layer proxy pattern |
| Auth/session | `auth-patterns` | `useAuth()` (client) or `getAccessTokenFromCookies()` (server); never call `/api/auth/*` directly |
| URL/routing | `url-canonicalization` | Never read `searchParams` in listing pages |
| i18n | `i18n-best-practices` | `Link` from `@i18n/routing` |
| Styling/UI | `design-system-conventions` | Semantic classes, no `gray-*` |
| Tests | `testing-patterns` | Vitest unit, Playwright E2E |
| Proving a change works | `verify-que-fer` | Drive the built app, capture evidence |
| Security/CSP/scripts | `security-headers-csp` | `fetchWithHmac`, allowlist CSP hosts |
| Service worker | `service-worker-updates` | Edit `public/sw-template.js`, run `yarn prebuild` |
| Performance/images | `bundle-optimization` | Image proxy, one LCP image, server-first |
| Env variables | `env-variable-management` | Update all 5 places |
| API data validation | `data-validation-patterns` | Zod in `lib/validation/`, safe fallbacks |
| PR review comments | `ai-review-responder` | Check suggestions against these rules, then fix or decline |

## Workflow

1. **Search first.** Look for existing code before writing new code: the concept name, name patterns (`isValid*`, `format*`, `build*`, `use*`) and literal values. Canonical places: types → `types/`; helpers → `utils/`, `lib/`; constants → `utils/constants.ts`, `config/`; components → `components/ui/`; hooks → `components/hooks/`. Report what you found ("found `isValidCategorySlug` in `utils/url-filters.ts`, will reuse").
2. **Plan** in 2–4 steps and wait for confirmation on anything non-trivial.
3. **Implement** with surgical diffs, following the skills.
4. **Verify**: `yarn lint && yarn typecheck && yarn test`, plus `verify-que-fer` for UI or behavior changes.

Stop and propose an alternative when you see a helper used only once, a component with more than 10 props, a file over 200 lines, a function over 100 lines, duplicated logic, or abstractions deeper than 3 levels. Don't create generic utilities without an immediate use. Prefer composition, the standard library and platform APIs (`AbortSignal.any()`, `after()` from `next/server`).

## Commands

| Command | Notes |
| --- | --- |
| `yarn install --immutable` | After `npm i -g corepack && corepack enable` (Node 25+ no longer bundles Corepack) |
| `yarn dev` | `next dev` (Turbopack). Run `yarn prebuild` first if you need the service worker |
| `yarn build` | `next build` only. `build:development\|staging\|production` also run `prebuild` with that env file |
| `yarn start` | `next start`: serves the built app. `start:development\|staging\|production` load that env file |
| `yarn prebuild` | Generates `public/sw.js` and `public/robots.txt` (build output, never edit them; `app/robots.txt/route.ts` is the fallback, keep both in sync) |
| `yarn lint` / `yarn typecheck` | 0 errors expected; old warnings are acceptable |
| `yarn test` | Vitest + jsdom, `test/**/*.{test,spec}.{ts,tsx}`. CI runs Node 26 (`NODE_VERSION` in the workflows; keep it in sync with `engines.node`, `.nvmrc` and the Dockerfile base image) |
| `yarn test:e2e` | Playwright in `e2e/`. Needs a running app and API credentials. Remote: `playwright.remote.config.ts` + `PLAYWRIGHT_TEST_BASE_URL` |
| `yarn i18n:check` | Missing/invalid message keys |
| `yarn analyze`, `analyze:experimental` | Bundle analysis |

- The pre-push hook runs `yarn typecheck && yarn test --run && yarn i18n:check`.
- Env: `.env.development|staging|production` (loaded via `env-cmd` for builds; `next dev` reads `.env.development` itself). Server-only secrets: `BACKEND_SERVICE_SECRET`, `HMAC_SECRET`. Without them the backend returns 401: pages still render but with no events. `NEXT_PUBLIC_API_URL` falls back to `config/api-defaults.json` and is inlined at build time (and `prebuild` writes it into the service worker), so set it before `yarn build`, E2E or verification builds; `API_URL` overrides it at runtime on the server. Auth needs `LOGTO_*` (see `docs/logto-auth-setup.md`). `test/setup.ts` seeds `HMAC_SECRET` and `BACKEND_SERVICE_SECRET` for unit tests.

## Project map

- `app/[locale]/`: pages. Listings `[place]/(byDate)/(category)`, events `e/[eventId]`, news `noticies/`. `app/api/`: internal API routes. Sitemaps are routes too (`app/sitemap.xml`, `app/server-*-sitemap.xml`).
- `components/ui/<feature>/`, `components/partials/`, `components/hooks/`, `components/context/`.
- `lib/api/`: client libraries + `*-external.ts` backend wrappers. `lib/validation/`: Zod. `utils/`, `config/`, `types/` (all types).
- `proxy.ts`: Next 16 Proxy (locale, canonical redirects, place 404/301, CSP, page cache/robots headers, API gate); its helpers are `utils/proxy-*.ts` and `utils/api-gate.ts`. Static security headers, fixed redirects and fixed rewrites live in `next.config.js` (`headers`, `redirects`, `rewrites`).
- `public/sw-template.js` → `public/sw.js` (Workbox from CDN). `scripts/`: build and perf scripts.
- Path aliases in `tsconfig.json` (`@components/*`, `@utils/*`, `@lib/*`, `@i18n/*`, …).

## Hard rules (each one caused an incident)

- **Never read `searchParams` in listing pages** (`app/[locale]/[place]/**`). It makes them dynamic: one cache entry per URL+query ($300+ spike, Dec 2025). Query params (`search`, `distance`, `lat`, `lon`, `price`, `from`, `to`) are handled client-side with SWR; `noindex` for filtered URLs is an `X-Robots-Tag` set in `proxy.ts`.
- **Never add `next: { revalidate, tags }` to `fetchWithHmac` calls in `lib/api/*-external.ts`.** It turns on Next's fetch cache with one entry per URL (146K entries per build, Jan 2026; write-up: `git show ad044ed6^:docs/incidents/2026-01-20-fetch-cache-explosion.md`). External wrappers stay `no-store`; cache with `Cache-Control` in `app/api/*` routes and with `createCache`/`createKeyedCache` (`lib/api/cache.ts`).
- **Server readers call the external wrapper**: our `/api/*` routes don't exist during `next build` (`"<!DOCTYPE"... is not valid JSON`), so `lib/api/*.ts` server readers call the `*-external.ts` wrapper directly, at build and at runtime. The old `isBuildPhase` switch was also true at runtime on Coolify, so the internal-route path never ran in production (see LESSONS.md). A cached reader calls `await connection()` before the cache lookup: a hit skips `fetchWithHmac`'s `connection()`, and a warm cache must not change what Next prerenders.
- **No local barrel files** (`index.ts` re-exports) mixing `"use client"` components from different routes: each re-export lands in the client manifest of every importing route (+24 KB on `/[place]` from a `components/ui/sponsor/index.ts` barrel, since deleted). Import files directly. `optimizePackageImports` only helps npm packages.
- **`cacheComponents` determinism**: a server component that uses `new Date()`/`Date.now()` to decide *what renders* must call `await connection()` first, or run inside `"use cache"` with an explicit `cacheLife` (time is then frozen per entry). Otherwise the replayed tree differs ("Couldn't find all resumable slots") and the page falls back to client rendering. Using dates only for text is fine. Inside `"use cache"`, get the locale with `rootLocale()` + `setRequestLocale(locale)`; `headers()` is not allowed there. The event page body uses `"use cache"` so it can be stored (ISR); request-time parts (sponsor, news) are passed in as slots.
- **`"use cache"` store**: `cacheMaxMemorySize: 0` (needed for the Redis page cache in `cache-handler.mjs`) also disables Next's built-in `"use cache"` store. `next.config.js` registers `use-cache-handler.mjs` as `cacheHandlers.default` (in-memory LRU, 64 MB per process, lost on deploy). Don't remove it.
- **Sharp** must stay in the Docker image and in `serverExternalPackages`; `/api/image-proxy` depends on it.
- **Raw `fetch()`** can hang forever in containers. Use `fetchWithHmac` (`lib/api/fetch-wrapper.ts`, 10 s timeout) for the backend, `safeFetch`/`fireAndForgetFetch` (`utils/safe-fetch.ts`, 5 s) for other services. ESLint warns on raw `fetch()`; plain `fetch()` to same-origin internal routes (`lib/api/*.ts`, SWR hooks) is allowed.

## API layer

- Server Components → `lib/api/*.ts` readers → `lib/api/*-external.ts` (`fetchWithHmac`, Zod parse, safe fallback). Browser code (SWR) → `app/api/*` routes (`Cache-Control: s-maxage, stale-while-revalidate` per route) → the same wrappers. Never call the backend from pages or the browser.
- Reader caches (details in `api-layer-patterns`): places, categories, regions and cities use a 24 h in-memory `createCache`/`createKeyedCache`; the list caches pass `storeEmpty: false` because their wrappers fall back to `[]`, and `fetchPlaceBySlug` caches a 404 `null` (capped by `maxEntries`). The `[place]` page reads events through the `"use cache"` reader `fetchEventsCached`; `fetchEvents` and `fetchCategorizedEvents` are uncached (`no-store`). Still through internal routes (`getInternalApiUrl` with `preferConfiguredOrigin`): event and news detail, `news.ts`, `profiles.ts`. `promotions.ts` calls `fetchWithHmac` directly.
- External wrappers: if `NEXT_PUBLIC_API_URL` is missing or the call fails, return a safe empty value (`[]`, `{}`, `null`) for reads; mutations throw. Read exceptions: `fetchPlaceBySlugExternal` returns `null` only on 404 (or a bot-style slug) and throws on other errors or an invalid payload (so callers can tell "not found" from an outage), `fetchPlacesAggregatedExternal` throws when either endpoint fails (a partial list must not be cached as complete), and the authenticated reads in `users-external.ts` rethrow the HTTP status. On a non-OK mutation, read `response.text()` before throwing.
- Backend auth: `fetchWithHmac` sends `X-Backend-Key` (`BACKEND_SERVICE_SECRET`; the v2 backend rejects every request without it). While `HMAC_SECRET` is set it also sends legacy `x-hmac`/`x-timestamp` (prod still checks them; remove once prod runs v2). Legacy HMAC signs only `timestamp + pathAndQuery`, so JSON POST/PUT/DELETE pass `skipBodySigning: true`.
- `proxy.ts`/`utils/api-gate.ts` gate most internal `/api/*` routes; public GETs (events, news, categories, places, regions, cities) are allowlisted.
- Mapping: UI `distance` + `lat/lon` → API `radius/lat/lon` via `distanceToRadius` (`types/event.ts`), sent only when set; filter `searchTerm` → API `term`; `byDate` (`avui`, `dema`, `setmana`, `cap-de-setmana`) or explicit `from/to`, not both. Pagination uses `PagedResponseDTO.last`.
- Place page fallback chain: requested place → its region → latest events overall. Keep this order.
- New endpoint: DTO in `types/api/` → `*-external.ts` → `lib/api/*.ts` reader that calls the wrapper (+ cache) → `app/api/` route only if browser code needs it.

## Filters and URLs

- Canonical URL: `/place(/date)?(/category)?`, omitting `tots`. Filter configs live in `config/filters.ts` and drive the filter chips through `FilterOperations` (`utils/filter-operations.ts`). URL parsing/building and the API mapping are still written per filter; the `filter-system-dev` skill lists every file a new filter touches. `test/filter-system.test.ts` covers the configs.
- Build URLs with `buildFilterUrl`/`buildCanonicalUrlDynamic`; parse with `parseFiltersFromUrl`, `urlToFilterState`, `getRedirectUrl` (`utils/url-filters.ts`). Validate category slugs with `isValidCategorySlug`. `distance` is omitted at its default (50).
- `proxy.ts` → `handleCanonicalRedirects` (`utils/middleware-redirects.ts`) 301-redirects legacy `?category=&date=` and `/tots` segments to canonical paths, keeping only the client filter params in `ALLOWED_QUERY_PARAMS`. byDate + `catalunya` + `tots` may redirect home.
- Unknown places get their status in `proxy.ts`, not the page (the root layout's `<Suspense>` turns a page `notFound()` into 200): `checkPlace` (`utils/proxy-place.ts`) → `resolvePlaceForProxy` (`lib/api/places-proxy.ts`) 301s an alias and rewrites a missing place with `status: 404`; it fails open on errors or after 1.5 s. Add every new top-level route folder to `NON_PLACE_FIRST_SEGMENTS` (`utils/middleware-redirects.ts`); a test enforces it.

## Rendering

- Server Components by default; `"use client"` only on the smallest leaf that needs state, effects or browser APIs. Never `next/dynamic` with `ssr: false` inside a Server Component: make a client component and import it.
- Listings are hybrid: the server fetches events, calls `insertAds` once and renders the list (`HybridEventsList`). On the client, `HybridEventsListClient` + `useEvents` (SWR) use the same page size as SSR. Without client filters, it appends only events whose `id` is not already on screen and never inserts ads again; with client filters, it replaces the SSR list.
- `partialPrefetching` is on: links prefetch a route's shared shell. Never set `prefetch={true}` on a `<Link>`; `PressableAnchor` (`components/ui/primitives/`) defaults to `false`.
- Hooks: `useRef` for flags that don't affect rendering (analytics sent, effect ran); memoize only what profiling shows.
- News: `app/[locale]/noticies/` (all news), `noticies/[place]` (news for a place), `noticies/[place]/[article]` (one article).

## Performance (measured; see `docs/performance/baselines.md`)

- **Google scripts load at three different times.** Funding Choices (consent box) is a plain `<script async>` in the `<head>` of `app/[locale]/layout.tsx`, next to the `googlefcPresent` iframe script. Never move it into a Next `<Script>`: it then waits for hydration and on a first visit the consent box becomes the LCP (~5 s on a slow phone). `armConsentFallback` (`app/GoogleScripts.tsx`) covers pages where FC shows no box. AdSense (`app/GoogleScriptsHeavy.tsx`) loads only after consent, on the first tap/key/scroll or 4.5 s after load (`onFirstInteractionOrTimeout`, `utils/browser.ts`). GA and other analytics use `<Script strategy="lazyOnload">`.
- **Images**: external images go through `/api/image-proxy` (Sharp) and render as `<picture>` via `ImageServer`/`ClientImage` (`components/ui/common/image/`), not `next/image`. Build URLs with `buildResponsivePictureSourceUrls` (`utils/image-cache.ts`). Quality is 50 everywhere (`getOptimalImageQuality`); allowed values are `images.qualities` in `next.config.js`. Retries: `useImageRetry`.
- **One LCP image per page** gets `priority` (eager, `fetchPriority="high"`) plus a matching `<link rel="preload" as="image" imageSrcSet>` built with the same helper, widths and quality (see `PlacePageShell.tsx`, `app/[locale]/e/[eventId]/page.tsx`). On listings it is the first card with an image (`hasCardImage`, `utils/event-helpers.ts`). The home hero is a static AVIF/WebP set in `config/hero-image.ts`.
- **Icons repeated on every card** (map pin, hearts) come from the sprite in `components/ui/common/IconSprite.tsx`: `<svg><use href={`#${SPRITE_ICON.mapPin}`} /></svg>`.
- **i18n payload**: client components receive only the namespaces in `lib/i18n/client-namespaces.ts`. Messages are precompiled: plain ICU strings, no `t.raw()`, lists in `i18n/locale-lists.json`.

## Security

- CSP lives in `utils/proxy-csp.ts` (applied to pages by `proxy.ts`): host allowlist with `'unsafe-inline'` (keeps pages cacheable for ISR/PPR); no nonces. Add new script/connect hosts there. The other security headers are in `next.config.js` `headers()`.
- JSON-LD is rendered server-side by `components/partials/JsonLdServer.tsx`, which escapes `<`. Use `toLocalizedUrl(path, locale)` (`utils/i18n-seo.ts`) for its URLs and `generateBreadcrumbList()` (`components/partials/seo-meta.ts`) for breadcrumbs.
- Errors: pass the original error to `captureException(error)`. Wrap `new URL()` in try/catch inside error handlers.

## i18n

- Locales in `i18n/routing.ts` (`as-needed` prefix). Use `Link`, `redirect`, `useRouter`, `usePathname`, `getPathname` from `@i18n/routing`, never `next/link` (ESLint warns).
- Server: `getTranslations` (`next-intl/server`); client: `useTranslations`/`useLocale`. Never pass messages down manually. Text lives in `messages/{ca,es,en}.json`; reuse keys.
- `proxy.ts` sets `x-next-intl-locale`; don't write your own locale detection. Vitest aliases `next-intl` to `test/mocks/next-intl*.ts`.

## Types

- No `any`; use `unknown` and narrow. Type aliases and interfaces live in `types/` (ESLint enforces it in `app/`, `components/`, `lib/`, `utils/`; a few config-only types stay in `config/`): DTOs in `types/api/`, shared UI types and props in `types/common.ts`/`types/props.ts`. Define each type once and import it; see `types/README.md` for where each kind goes.

## UI

- Read `DESIGN.md` and the `design-system-conventions` skill. Semantic classes (`heading-*`, `body-*`, `btn-*`, `card-*`, `badge-*`, `flex-center`, `stack`) and tokens (`text-foreground`, `text-muted-foreground`, `bg-muted`, `border-border`, …). Never `gray-*`, hex colors or the removed aliases (`primarydark`, `whiteCorp`, …). Components: `Button` and `Badge` in `components/ui/common/`.
- Dates in UI: `getFormattedDate(start, end)` from `utils/date-helpers.ts`, not `toLocaleDateString`.

## Hosting and deploys

- Docker on Hetzner via Coolify, behind Cloudflare (DNS, edge cache, TLS). Redis holds the Next page cache. `develop` deploys to staging; `main` is production. Infra limits: `docs/self-hosted-resource-limits.md`.
- Rollback: Coolify → Deployments → Rollback, or GitHub Actions "Deploy to Coolify" with `skip_ci`. It does not undo backend or DB changes.
- Coolify PR previews may lack runtime secrets, so they serve an empty `<main>`. Don't use them for SEO/SSR checks unless `curl -sS https://pr-XXX.esdeveniments.cat/ | grep -c '<h1'` is above 0 (`docs/incidents/2026-04-23-coolify-pr-preview-empty-html.md`).

## Conventions

- Components PascalCase, hooks `useXxx`, helpers lowerCamelCase, 2-space indent, path aliases.
- Constants in `utils/constants.ts`; config over conditionals; no duplicated literals.
- Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`). Short-lived `feat/*`/`fix/*` branches into `develop`. PRs follow `.github/PULL_REQUEST_TEMPLATE.md` (summary, screenshots for UI, test plan).
- Never commit secrets or env files; never edit build output (`public/sw.js`, `public/robots.txt`, `.next/`).
