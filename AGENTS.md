# Repository Guidelines

## ⚠️ CRITICAL: Load Agent Skills FIRST

**Before writing ANY code**, check `.github/skills/` for relevant skills:

| Task                      | Skill                          | Key Rule                                  |
| ------------------------- | ------------------------------ | ----------------------------------------- |
| Any new code              | `pre-implementation-checklist` | Search existing patterns FIRST            |
| Types/interfaces          | `type-system-governance`       | ALL types in `/types` directory           |
| Components                | `react-nextjs-patterns`        | Server Component default                  |
| Filters                   | `filter-system-dev`            | `config/filters.ts` only                  |
| API calls                 | `api-layer-patterns`           | Three-layer proxy pattern                 |
| URL/routing               | `url-canonicalization`         | NEVER add `searchParams` to listing pages |
| i18n/translations         | `i18n-best-practices`          | Use `Link` from `@i18n/routing`           |
| Styling/UI                | `design-system-conventions`    | Semantic classes, no `gray-*`             |
| Tests                     | `testing-patterns`             | Vitest for unit, Playwright for E2E       |
| Security/CSP              | `security-headers-csp`         | Use `fetchWithHmac`, allowlist domains    |
| Service worker            | `service-worker-updates`       | Edit `sw-template.js`, run `prebuild`     |
| Performance/images        | `bundle-optimization`          | Quality caps, Server Components default   |
| Env variables             | `env-variable-management`      | Update 4 locations: code, SST, workflow   |
| API data validation       | `data-validation-patterns`     | Zod in `lib/validation/`, safe fallbacks  |
| Evaluating PR suggestions | `code-review-evaluation`       | Cross-reference against project skills    |

**Mandatory workflow**: Search → Plan → Confirm → Implement → Verify

---

## Project Structure & Module Organization

- `app/` Next.js App Router (layouts, routes, API under `app/api`). Example: `app/[place]/page.tsx`.
- `components/` Reusable UI (`ui/`, `partials/`, `hooks/`). Prefer feature folders under `components/ui/...`.
- `lib/`, `utils/` shared logic; `config/` app config; `types/` all canonical TypeScript types.
- `public/` static assets; `styles/` Tailwind; `docs/` notes; `scripts/` build utilities (e.g., `generate-sw.mjs`).
- `test/` unit/integration (Vitest); `e2e/` Playwright.
- Path aliases in `tsconfig.json` (e.g., `@components/*`, `@utils/*`).

## Build, Test, and Development Commands

- `yarn dev` Start local dev (runs prebuild: service worker generation).
- `yarn build` Production build; `postbuild` runs `next-sitemap`.
- `yarn start` Serve built app; `yarn lint` ESLint; `yarn typecheck` TS no‑emit.
- `yarn test` Vitest; `yarn test:watch`; `yarn test:coverage`.
- `yarn test:e2e` Playwright; `yarn test:e2e:ui` UI runner. Remote: `playwright.remote.config.ts` with `PLAYWRIGHT_TEST_BASE_URL`.
- Extras: `yarn analyze` bundle analysis; `yarn scan` run react‑scan on `localhost:3000`.
- CI: Amplify builds use Node 20 + Yarn 4; prebuild generates `public/sw.js` and postbuild runs sitemap.

## Coding Style & Naming Conventions

- TypeScript strict; prefer server components by default. Add `"use client"` only when needed.
- ESLint extends `next/core-web-vitals` + TS + `@eslint-react`. Fix warnings before merge.
- Define all type aliases/interfaces in `types/` (ESLint‑enforced).
- Components: PascalCase; hooks: `useXxx`; helpers: lowerCamelCase.
- Indentation: 2 spaces; prefer path aliases; Tailwind utilities for styling; globals in `styles/`.

## Internationalization (i18n) Rules

- **Links: Always use `Link` from `@i18n/routing`** for internal navigation (not `next/link`). This ensures locale prefixes (`/es/`, `/en/`) are automatically handled. ESLint warns on `next/link` imports.
  - ✅ `import { Link } from "@i18n/routing"` - auto locale handling
  - ❌ `import Link from "next/link"` - loses locale on navigation
  - Exceptions: primitives with manual locale handling, external-only links
- **JSON-LD URLs: Use `toLocalizedUrl(path, locale)`** from `@utils/i18n-seo` for all URLs in structured data (breadcrumbs, events, etc.).
- **Breadcrumbs**: Use `generateBreadcrumbList()` from `@components/partials/seo-meta` for JSON-LD breadcrumbs—it's tested and handles locale correctly.

## React Hooks Best Practices

- **useRef vs useState for tracking flags**: Use `useRef` (not `useState`) for one-time tracking flags that don't affect rendering (e.g., analytics fired, effect ran). A ref update doesn't trigger a re-render.
  - ✅ `const hasTracked = useRef(false)` - for analytics, one-time effects
  - ❌ `const [hasTracked, setHasTracked] = useState(false)` - causes unnecessary re-render
- **Dependency arrays**: Refs don't need to be in dependency arrays (they're stable). Only include values that should trigger the effect.
- **Memoization**: Use `useMemo` for expensive computations, `useCallback` for callbacks passed to children. Don't over-optimize—profile first.

## Testing Guidelines

- Unit tests: Vitest + jsdom; React Testing Library. Files: `test/**/*.{test,spec}.{ts,tsx}`.
- Aim for meaningful coverage on new code (`yarn test:coverage`).
- E2E: Playwright in `e2e/`. Local config starts the app; remote config targets an existing URL via `PLAYWRIGHT_TEST_BASE_URL`.
- Test bootstrap: `test/setup.ts` seeds `HMAC_SECRET` for HMAC utilities.

## Commit & Pull Request Guidelines

- Conventional Commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`. Use scope when helpful (e.g., `feat(ui): ShareButton`).
- Keep messages imperative and specific; avoid `wip` on mainline branches.
- PRs include: summary, linked issues, screenshots for UI, and test plan.
- Run `yarn lint && yarn typecheck && yarn test` (and E2E if relevant) before pushing.
- Branching: use short‑lived `feat/*` or `fix/*` branches; target the default branch (or `develop` if active).

## Security & Configuration Tips

- Never commit secrets. Use `.env.development`, `.env.staging`, `.env.production` (loaded via `env-cmd`).
- `NEXT_PUBLIC_API_URL` influences the service worker (generated from `public/sw-template.js`) and tests. If it changes, re‑run prebuild/dev.
- Sentry is configured (`sentry.*.config.ts`); set DSN only in non‑local environments.
- Yarn 4 workspace; prefer `yarn` over `npm`.
- CSP: Relaxed policy with host allowlisting (see `proxy.ts`). Allows `'unsafe-inline'` for inline scripts/JSON-LD to enable ISR/PPR caching. Google Analytics, Ads, and trusted domains are allowlisted. No nonce required.
- API security: Internal API proxy layer (`app/api/*`) handles HMAC signing server-side via `*-external.ts` wrappers using `fetchWithHmac`. Client libraries call internal routes, never external API directly. Middleware enforces HMAC on most `/api/*` routes; public endpoints (GET events, news, categories, etc.) are allowlisted.
- **Fetch best practices**: Never use raw `fetch()` without timeout and response validation. Use `fetchWithHmac` for internal API calls (has built-in 10s timeout), or `safeFetch`/`fireAndForgetFetch` from `utils/safe-fetch.ts` for external webhooks/services (5s default timeout, response validation, Sentry logging).

## Agent-Specific Instructions

### Pre-Implementation Checklist (MANDATORY)

Before writing ANY new code, ALWAYS search first:

1. **Search for existing patterns** using `grep_search` or `semantic_search`:

   - The concept name (e.g., "slug validation", "price formatting")
   - Function name patterns (`isValid*`, `format*`, `build*`, `use*`)
   - The literal value (regex pattern, constant)

2. **Check canonical locations** based on what you're creating:

   - Type/interface → search `types/`
   - Validation function → search `utils/` for `isValid*`, `validate*`
   - Helper/utility → search `utils/`, `lib/`
   - Constant/config → search `utils/constants.ts`, `config/`
   - Component → search `components/ui/`
   - Hook → search `components/hooks/`

3. **Report findings** before proposing implementation:

   - "Found `isValidCategorySlugFormat` in `utils/category-mapping.ts` - will reuse"
   - "No existing pattern found - will create new utility in `utils/`"

4. **Wait for confirmation** before implementing (per copilot-instructions.md §19)

**Anti-pattern**: Writing inline code first, then searching only when asked.

### General Rules

- Prefer surgical diffs; keep file moves/renames minimal and scoped.
- Do not edit generated or build output (`public/sw.js`, `.next/**`, `tsconfig.tsbuildinfo`, `server-place-sitemap.xml`). Edit `public/sw-template.js` and run prebuild instead.
- Types live only in `types/`; avoid redefining `NavigationItem`, `SocialLinks`, `EventProps`, `CitySummaryResponseDTO` (see `types/common.ts`, `types/api/city.ts`).
- Any reusable/derived props types (e.g., Picks of an existing props interface) must be declared in `types/` (typically `types/props.ts`) rather than inline within components.
- Before introducing a new type/interface, search `types/` (and related feature folders) for existing candidates to reuse/extend, and place additions in the most appropriate shared file (e.g., `types/props.ts` for UI props, `types/api/*` for DTOs).
- Server-first by default; mark client components with `"use client"` only when necessary. Avoid exposing secrets in client code.
- API security: Internal API routes (`app/api/*`) handle HMAC signing server-side via `*-external.ts` wrappers. Middleware enforces HMAC on most `/api/*` routes; public GET endpoints (events, news, categories, places, regions, cities) are allowlisted. Never sign requests in the browser—always use internal API routes.
- Use Yarn 4 commands and Node 20 locally; run `yarn lint && yarn typecheck && yarn test` before finalizing changes.

## Architecture Overview

- Next.js App Router with server‑first rendering; client state via Zustand (`store.ts`) and client data fetching via SWR.
- API layer: Internal proxy pattern—client libraries (`lib/api/*`) call internal Next.js API routes (`app/api/*`) which proxy to external backend via `*-external.ts` wrappers with HMAC signing.
- SEO & sitemaps: `next-sitemap` runs after build; sitemap routes under `app/`; `middleware.ts` handles edge behavior, canonical redirects, and CSP.
- URL canonicalization: Middleware automatically redirects legacy query params and `/tots` segments to canonical paths (301 redirects).

## ⚠️ CRITICAL: ISR/Caching Cost Prevention

### Issue 1: Dynamic Pages from `searchParams`

**NEVER add `searchParams` to page components in `app/[place]/` routes.**

Reading `searchParams` in a page component makes the page **dynamic**, causing OpenNext/SST to create a separate DynamoDB cache entry for every unique URL+query combination. This caused a **$300+ cost spike** on Dec 28, 2025.

**Rules:**

1. Listing pages (`app/[place]/*`) must NOT read `searchParams` - keep them static (ISR)
2. Query params (`search`, `distance`, `lat`, `lon`) are handled **client-side only** via SWR
3. SEO robots `noindex` for filtered URLs is handled via `X-Robots-Tag` header in `proxy.ts`
4. CloudWatch alarm `DynamoDB-HighWriteCost-Alert` monitors for write spikes >100k/hour

**If you need query-dependent behavior:**

- Handle it in middleware (`proxy.ts`) for headers/redirects
- Handle it client-side for data fetching
- NEVER make the page component read `searchParams`

### Issue 2: Fetch Cache Explosion from `next: { revalidate }`

**NEVER add `next: { revalidate, tags }` to external API fetches in `lib/api/*-external.ts` files.**

This enables Next.js fetch cache, which on OpenNext/SST stores every unique URL as a separate entry in **both S3 and DynamoDB**. With high-cardinality APIs (100+ places × categories × dates × pages), this caused a cost spike on Jan 20, 2026 (146K cache entries per build vs baseline 150).

**Rules:**

1. External wrappers (`*-external.ts`) must use `fetchWithHmac` WITHOUT `next:` option
2. This defaults to `cache: "no-store"` which prevents unbounded cache growth
3. Internal API routes handle caching via `Cache-Control` headers instead
4. See incident: `docs/incidents/2026-01-20-fetch-cache-explosion.md`

**If you want to improve API caching:**

- Add/adjust `Cache-Control` headers in internal API routes (`app/api/*`)
- Use in-memory TTL caches (`createCache`/`createKeyedCache`) in client libraries
- NEVER use `next: { revalidate }` on external fetches

**If you need query-dependent behavior:**

- Handle it in middleware (`proxy.ts`) for headers/redirects
- Handle it client-side for data fetching
- NEVER make the page component read `searchParams`

## Local Setup

- Requirements: Node 20, Yarn 4.9+ (use Corepack).
- Install: `corepack enable && corepack prepare yarn@4.9.1 --activate && yarn install --immutable`.
- Env: set `HMAC_SECRET` (server‑only), `NEXT_PUBLIC_API_URL` (defaults handled), optional `NEXT_PUBLIC_GOOGLE_ANALYTICS`, `NEXT_PUBLIC_GOOGLE_ADS`, `SENTRY_DSN`.
- Run: `yarn dev` (generates `public/sw.js` via prebuild). Build: `yarn build`.
- Tests: `yarn test`; E2E: `yarn test:e2e` (local config starts the app).

## Feature Checklist

- Types: add/extend only in `types/` (no inline app/component types).
- UI/Pages: place components under `components/ui/<feature>/`; routes in `app/<segment>/` (server‑first; add `"use client"` only if needed).
- API: call from server code via internal API routes (`app/api/*`); these proxy to external backend with HMAC. Use query builders (`buildEventsQuery`, `buildNewsQuery`) from `utils/api-helpers.ts`. Respect HMAC middleware; public GET endpoints are allowlisted.
- Tests: add unit tests under `test/` and E2E flows under `e2e/` when user‑visible.
- SW/Caching: if adding external API usage or offline behavior, edit `public/sw-template.js` and re‑run prebuild/dev.
- Pre‑PR: `yarn lint && yarn typecheck && yarn test` (and E2E if applicable); include screenshots for UI.
