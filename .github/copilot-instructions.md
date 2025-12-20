# AI Coding Agent Instructions for this Repository

Purpose: Catalan events discovery web app (Next.js 16.1 App Router + React 19 + TypeScript) focused on SEO, performance (service worker + image optimization), and a configuration‑driven URL-first filtering system. Tooling: Node >=22, Yarn 4.12 (per package.json).

## 1. Core Architecture

- Next.js App Router in `app/` with canonical URL structure: `/place(/date)?(/category)?` omitting default `tots` date & category.
- Filters are configuration‑driven: single source in `config/filters.ts`; operations in `utils/filter-operations.ts`; URL parsing/building in `utils/url-filters.ts` + `utils/url-parsing.ts`.
- Pages fetch data server-side (edge friendly) and render a hybrid list: SSR list + client enhancement (`HybridEventsList`, `ClientInteractiveLayer`). Ads inserted via `insertAds` during server fetch.
- Service Worker generated at build (`scripts/generate-sw.mjs` → `public/sw.js` from `sw-template.js`) enabling offline + caching strategies (Workbox 7).
- Security: `proxy.ts` (Next.js 16 middleware replacement) injects security headers and CSP (relaxed policy with host allowlisting). JSON-LD rendered server-side via `JsonLdServer` component (no nonce required).

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
- **URL Canonicalization**: Proxy (`proxy.ts`) calls `handleCanonicalRedirects` from `utils/middleware-redirects.ts` to redirect non-canonical URLs to canonical form:
  - Legacy query params (`?category=X&date=Y`) → canonical path segments (`/place/date/category`)
  - `/tots` in path segments → omitted in canonical URLs (e.g., `/place/tots/category` → `/place/category`)
  - Preserves unrelated query params (e.g., `search`, `distance`, `lat`, `lon`) during redirects
  - Returns 301 permanent redirects for SEO

## 4. Data Fetch & API Layer

- **Architecture**: Internal API proxy layer pattern. Client libraries (`lib/api/*.ts`) call internal Next.js API routes (`app/api/*`) which proxy to external backend via `*-external.ts` wrappers using `fetchWithHmac`.
- Location: `lib/api/*` (events, categories, regions, cities, places, cache helpers, news) call internal routes via `getInternalApiUrl` from `utils/api-helpers.ts`.
- Internal API routes: `app/api/*` (events, events/[slug], events/categorized, news, news/[slug], places, places/[slug], categories, categories/[id], cities, cities/[id], regions, regions/[id], regions/options, visits). These routes use `*-external.ts` wrappers that call `fetchWithHmac` against `NEXT_PUBLIC_API_URL`, parse with Zod, and return safe fallbacks.
- External API wrappers: `lib/api/*-external.ts` (e.g., `events-external.ts`, `news-external.ts`) handle direct external API calls with HMAC signing. Used only by internal API routes, never called directly from pages/components.
- Query builders: Use `buildEventsQuery`, `buildNewsQuery` from `utils/api-helpers.ts` to construct URLSearchParams. Centralizes query string construction and eliminates duplication.
- Env guard: External wrappers check `NEXT_PUBLIC_API_URL`; if missing return safe empty shape (prevents build/runtime crashes on preview environments). Internal routes handle missing env gracefully.
- Guarded pattern (required for external wrappers):
  - Guard: if `!NEXT_PUBLIC_API_URL` → return safe fallback (array `[]`, map `{}`, or null depending on DTO).
  - Build query using query builders (`buildEventsQuery`, `buildNewsQuery`) → `URLSearchParams`.
  - Wrap in try/catch, log errors, and return a safe fallback DTO for read endpoints.
  - Use cache wrappers `createCache`/`createKeyedCache` where appropriate (in-memory caching, not for external wrappers).
- Pagination: API returns `PagedResponseDTO` `{ content[], currentPage, pageSize, totalElements, totalPages, last }`; use `last` to stop infinite scroll.
- Caching: Internal API routes set Cache-Control headers (`s-maxage`, `stale-while-revalidate`) with standardized TTLs (e.g., events 600s, news 60s, sitemaps 86400s). Lightweight in‑memory TTL (24h = 86400000 ms) via `createCache` (single value) & `createKeyedCache` (per id/slug) used for categories, regions, cities, place lookups to cut edge fetch latency.
- Resilience: External wrappers fall back to safe empty data on failure (keep UX functional offline / during API outages). Apply env guard consistently across categories, cities, regions, and events.
- Events fallback chain (place page): requested place → region (lookup in grouped regions) → latest global (no filters). Maintain this order when altering fetch logic.
- Event create/update: `createEvent` posts multipart with `request` JSON + optional `imageFile`; `updateEventById` is JSON PUT. On non-OK, read `response.text()` for detailed error before throwing (uniform policy for all mutations).
- Distance & geo: UI "distance" + `lat/lon` become API `radius/lat/lon`; compute `radius` via `distanceToRadius(distance)` and only send when defined (avoid default 50). Helper: `distanceToRadius` in `types/event.ts`.
- Search term: internal filter key `searchTerm` maps to API param `term`; maintain mapping when extending filters.
- Date filtering: `byDate` shortcut (avui, dema, setmana, cap-de-setmana) and optional explicit `from/to`; don't send both unless intentional.
- Ad insertion: `insertAds` decorates event list with synthetic `{ isAd: true }` items. See Hybrid Rendering contract for client append rules.
- Visit tracking: Client beacon (`navigator.sendBeacon` / `fetch` with `keepalive`) on event pages to `/api/visits`. Middleware stamps `x-visitor-id` header and issues `visitor_id` cookie when missing; server forwards to backend (HMAC) and returns 204.
- Adding new API call (pattern):
  1. Define DTO in `types/api/*`
  2. Create `*-external.ts` wrapper with env guard + `fetchWithHmac` + Zod parsing + safe fallback
  3. Create internal API route in `app/api/*` that calls external wrapper and sets cache headers
  4. Update client library in `lib/api/*.ts` to call internal route via `getInternalApiUrl` and query builders
  5. Use `next: { revalidate, tags }` for Next.js fetch caching
- Avoid: calling external API directly from pages/components (use internal routes), duplicating manual query string concatenation (use query builders), bypassing cache wrappers, throwing raw fetch errors without fallback object.

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

- Runtime: Node >=22 and Yarn 4.12 (per `package.json` engines). Use Corepack.
- Dev: `yarn dev` (Next dev server with Turbopack file system caching enabled by default). Run `yarn prebuild` first if you changed `public/sw-template.js` so `public/sw.js` is regenerated.
- Dev with debugger: `yarn dev:inspect` (enables Node.js debugger via `next dev --inspect`).
- Build: `yarn build` (Next build only). Run `yarn prebuild` beforehand whenever the SW template changes. Environment-specific builds (`build:development|staging|production`) already run `prebuild` before `next build`.
- Analyze bundles: `yarn analyze`, `analyze:server`, `analyze:browser` (uses Next bundle analyzer via env vars). `yarn analyze:experimental` launches Next.js 16.1 experimental bundle analyzer with interactive UI (Turbopack-compatible).
- Upgrade: `yarn upgrade` (uses `next upgrade` command for easier Next.js version upgrades).
- Tests: `yarn test` (Vitest, jsdom). Only current custom suite: filter system. Add new domain tests under `test/` and import utilities directly.
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
- Generation script replaces placeholder with `NEXT_PUBLIC_API_URL` origin (fallback pre env) -> writes `public/sw.js` consumed by proxy (special cache headers).
- Update caching logic ONLY via template; never hand-edit generated `public/sw.js` (will be overwritten).

## 11. Security & Analytics

- CSP: Relaxed policy with host allowlisting (configured in `proxy.ts`). Allows `'unsafe-inline'` for inline scripts and JSON-LD to enable ISR/PPR caching. Google Analytics, Ads, and trusted domains (googletagmanager.com, google-analytics.com, googlesyndication.com, etc.) are allowlisted in `script-src` and `script-src-elem`. No nonce required—scripts work without nonce props.
- External tracking (GA, Ads, Sentry) loaded via Next.js `<Script>` component. Use `strategy="afterInteractive"` by default, but `strategy="lazyOnload"` is acceptable for non-critical analytics scripts (e.g., GA loader/config) to optimize Core Web Vitals. Critical scripts (consent initialization, CMP) should use `afterInteractive`. No nonce props needed.
- JSON-LD: Server-rendered via `JsonLdServer` component (`components/partials/JsonLdServer.tsx`). Escapes `</script>` and `<` to prevent XSS. Data comes from server-side API responses, not user input. No nonce required due to relaxed CSP.
- Rationale: For a cultural events site with HMAC-protected backend, relaxed CSP enables better performance (ISR/PPR) while maintaining security through host allowlisting.

## 12. Image Performance Strategy

- External images assumed: default quality cap 50; priority/LCP images use 60. Adjust with `getOptimalImageQuality` and `getOptimalImageSizes` contexts (card, hero, list, detail).
- Preload critical images using `preloadImage` cautiously; note comment about internal Next.js `_next/image` URL coupling—avoid brittle custom logic across versions.
- Retry logic: `useImageRetry` provides exponential backoff; use `getImageKey` to force re-render on retry.

## 13. Versioning & Cache Busting

- `BUILD_VERSION` resolves to timestamp in dev, build ID or package version in prod. Use `getVersionedUrl('/path')` when adding long-lived assets needing busting.

## 14. Contribution Conventions

- Prefer adding capabilities via configuration (filters, categories) rather than branching conditionals.
- Centralize constants in `utils/constants.ts`; avoid duplicating literals (dates, distances, category labels).
- When adding environment-dependent behavior for edge/server, follow existing pattern of safe fallbacks (see `getApiOrigin` used by `proxy.ts`).
- Before creating new helpers/components, search existing utils/hooks/components (filters, URLs, i18n, images, forms) and reuse when possible.
- Dates: Use `getFormattedDate(start, end)` from `utils/date-helpers.ts` for any human-readable date range in UI (e.g., pills, subtitles). Do not inline `toLocaleDateString` in components.
- Colors: Use Tailwind theme tokens defined in `tailwind.config.js` (e.g., `primary`, `background`, `foreground`, `muted`, `border`). Do not hardcode hex values in components/styles. If a new color is needed, add it to the Tailwind theme and reference by token. Do NOT use deprecated aliases (`primarydark`, `primarySoft`, `whiteCorp`, `darkCorp`, `blackCorp`, `fullBlackCorp`, `bColor`).

## 15. Common Pitfalls

- Forgetting to regenerate SW after changing template—run `yarn prebuild` before `yarn dev`/`yarn build` when `public/sw-template.js` changes (base `yarn build` does not run prebuild; env-specific builds do).
- Calling external API directly from pages/components instead of using internal API routes (`app/api/*`).
- Encoding filter defaults in multiple places instead of relying on config defaults.
- Creating URLs that include unused default segments (`/tots/`). Always use `buildCanonicalUrl` helpers.
- **Type duplication**: Creating duplicate interfaces instead of importing from canonical sources in `types/common.ts`.
- Forgetting to use query builders (`buildEventsQuery`, `buildNewsQuery`) and manually constructing URLSearchParams.
- Not setting appropriate cache headers (`s-maxage`, `stale-while-revalidate`) in internal API routes.

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

## 19. Development Workflow & Constraints (Component Library)

### Role & Context

- You are a senior Next.js/TypeScript developer.
- Project priorities: minimalistic code, DRY principle, testability.

### Mandatory Constraints

- Max 100 lines of code per function.
- Do **not** create generic utilities without immediate usage.
- Do **not** duplicate logic that already exists in `/lib`, `/components`, or `/utils`.
- Always prefer composition over inheritance.

### Required Workflow

1. Analyze existing related code.
2. Propose a 2-4 step plan (no code) to the user.
3. Wait for confirmation before implementing.
4. Implement step-by-step.
5. Self-review to ensure DRY compliance.

### Automatic Red Flags (Stop & Propose Alternative)

- Helper function used only once.
- Component exposing more than 10 props.
- File exceeding 200 lines.
- Logic duplicated across multiple locations.
- Abstractions deeper than 3 levels.

## 20. Design System Conventions

**Status**: Active (Week 0 - Foundation established)  
**Reference (navigation)**: `/docs/README.md`  
**Code Canonical**: `/docs/implementation-reference.md` (single source of truth for DS code)

### Mandatory Rules

1. **Typography**: ALWAYS use semantic classes, NEVER arbitrary text-\* utilities

   - Headings: `.heading-1`, `.heading-2`, `.heading-3`, `.heading-4`
   - Body: `.body-large`, `.body-normal`, `.body-small`
   - Labels: `.label`
   - Example: `<h1 className="heading-1">` NOT `<h1 className="text-3xl font-bold">`

2. **Colors**: ALWAYS use semantic tokens, NEVER generic Tailwind grays

   - ✅ Use: `text-foreground`, `text-foreground-strong`, `text-foreground/80`, `bg-background`, `bg-muted`, `border-border`, `primary-foreground`
   - ❌ Forbidden: `text-gray-*`, `bg-gray-*`, `border-gray-*`
   - Opacity: Use `/80`, `/70`, `/60` suffixes (e.g., `text-foreground/80`)
   - Reference: Brand colors defined in `tailwind.config.js`

3. **Buttons**: Transitional policy → use semantic classes now; component available after Week 4

   - Component (after Week 4): `<Button variant="primary|neutral|outline|muted">`
   - Classes: `.btn-primary`, `.btn-neutral`, `.btn-outline`, `.btn-muted`
   - NO manual button styling with inline utilities

4. **Cards**: Use semantic card classes

   - `.card-bordered` (border + subtle shadow)
   - `.card-elevated` (stronger shadow, no border)
   - `.card-body`, `.card-header`, `.card-footer` (spacing)
   - Example: `<div className="card-bordered"><div className="card-body">...</div></div>`

5. **Badges**: Transitional policy → use semantic badge classes now; component available after Week 4

   - `.badge-primary` (red background)
   - `.badge-default` (gray background)
   - Component (after Week 4): `<Badge>`

6. **Layout Utilities**: Replace repetitive flex patterns

   - `.flex-center` replaces `flex justify-center items-center`
   - `.flex-between` replaces `flex justify-between items-center`
   - `.flex-start` replaces `flex justify-start items-center`
   - `.stack` replaces `flex flex-col gap-element-gap`

7. **Spacing**: Use semantic tokens for consistency

   - `py-section-y`, `px-section-x` for section spacing
   - `p-card-padding` for card inner padding
   - `gap-element-gap` for default gaps
   - Tailwind spacing (narrow exception)
     - Allowed: one-off micro-spacing inside a leaf component (gap-1–2, p-1–2), no layout impact
     - Not allowed: section/page/layout spacing; card/button/input paddings; shared components
     - If repeated → create/extend a semantic token instead

8. **Border Radius**: Use semantic tokens
   - `rounded-button` for buttons (8px)
   - `rounded-card` for cards (12px)
   - `rounded-input` for form inputs (8px)
   - `rounded-badge` for pills/badges (full)

### Migration Context

**Current Phase**: Week 0 - Foundation  
**Status**: Design system classes added to `globals.css`. Button/Badge components will be adapted in Week 4; until then, use `.btn-*` and `.badge-*` classes.

When modifying existing components:

- Prefer semantic classes over inline utilities, following the design system conventions.
- Consult `/docs/reference-data.md` for migration priority.
- Use the new semantic color tokens (`background`, `foreground`, `foreground-strong`, `muted`, `border`, `primary-foreground`); avoid `gray-*`.
- Keep changes incremental (don't rewrite entire components at once).

### Examples

**Typography**:

```tsx
// ❌ Bad
<h1 className="text-3xl md:text-4xl font-bold">Title</h1>

// ✅ Good
<h1 className="heading-1">Title</h1>
```

**Colors**:

```tsx
// ❌ Bad
<p className="text-gray-600">Secondary text</p>

// ✅ Good
<p className="text-foreground/80">Secondary text</p>
```

**Buttons**:

```tsx
// ❌ Bad
<button className="bg-primary text-whiteCorp px-6 py-3 rounded-xl hover:bg-primarydark">
  Submit
</button>

// ✅ Good (after Week 4)
<Button variant="primary">Submit</Button>
// ✅ Good (until Week 4)
<button className="btn-primary">Submit</button>
```

**Layout**:

```tsx
// ❌ Bad
<div className="flex justify-center items-center gap-4">
  <span>Icon</span>
  <span>Text</span>
</div>

// ✅ Good
<div className="flex-center gap-element-gap">
  <span>Icon</span>
  <span>Text</span>
</div>
```

### AI Agent Reminders

- **Before creating any component**: Check if semantic classes apply
- **Before using text-gray-_/bg-gray-_/border-gray-\***: STOP. Use semantic tokens.
- **Before writing long className strings**: Check if semantic class exists
- **When reviewing code**: Flag any generic grays or repetitive patterns
- **Context retention**: Reference `/docs/README.md` (navigation) and `/docs/design-system-overview.md` when uncertain

### Resources

- Overview: `/docs/design-system-overview.md`
- Implementation Reference (ALL CODE): `/docs/implementation-reference.md`

## 21. Internationalization (next-intl)

- Library: `next-intl` 4.5 with plugin enabled in `next.config.js` (`withNextIntl`).
- Routing: `i18n/routing.ts` defines locales (`ca`, `es`, `en`), default `ca`, and `as-needed` prefix via `defineRouting`; use the exported `Link`, `redirect`, `usePathname`, `useRouter`, `getPathname` from `createNavigation`.
- Requests/messages: `i18n/request.ts` uses `getRequestConfig` to load messages from `messages/{locale}.json`. Add locales by updating `types/i18n.ts` (supported locales, mappings), adding the JSON file, and extending the loader map.
- App layout: `app/layout.tsx` wraps with `NextIntlClientProvider` using `getLocale`/`getMessages`. Server components should use `getTranslations` from `next-intl/server`; client components should use `useTranslations`/`useLocale` from `next-intl`. Don’t pass messages manually down the tree.
- Locale header: `proxy.ts` sets `x-next-intl-locale`; `utils/i18n-seo.ts` reads it. Avoid rolling your own locale detection.
- Strings: keep user-facing text in `messages/*.json`; prefer reuse of existing keys before adding new ones.
- Tests: Vitest mocks live in `test/mocks/next-intl.ts` and `test/mocks/next-intl-server.ts`; `vitest.config.ts` aliases `next-intl` and `next-intl/server` to these mocks.
