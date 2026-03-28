# Claude Code Project Instructions

## Project Overview

**Esdeveniments** is a Catalan-language events platform (`www.esdeveniments.cat`) built with Next.js 16 (App Router), deployed on AWS via SST v3 + OpenNext. It serves event listings, news, and place-based discovery across Catalonia with full i18n support (Catalan, Spanish, English).

## Agent Skills System

This project uses `.github/skills/*/SKILL.md` for detailed coding instructions. **Load the relevant skill before writing code.**

| Task              | Skill                          | Key Rule                                  |
| ----------------- | ------------------------------ | ----------------------------------------- |
| Any new code      | `pre-implementation-checklist` | Search existing patterns FIRST            |
| Types/interfaces  | `type-system-governance`       | ALL types in `/types` directory only      |
| Components        | `react-nextjs-patterns`        | Server Components by default              |
| Filters           | `filter-system-dev`            | `config/filters.ts` only                  |
| API calls         | `api-layer-patterns`           | Three-layer proxy pattern                 |
| URL/routing       | `url-canonicalization`         | NEVER add `searchParams` to listing pages |
| i18n/translations | `i18n-best-practices`          | Use `Link` from `@i18n/routing`           |
| Styling/UI        | `design-system-conventions`    | Semantic classes, no `gray-*`             |
| Tests             | `testing-patterns`             | Vitest for unit, Playwright for E2E       |
| Security/CSP      | `security-headers-csp`         | Use `fetchWithHmac`, allowlist domains    |
| Service worker    | `service-worker-updates`       | Edit `sw-template.js`, run `prebuild`     |
| Performance       | `bundle-optimization`          | Quality caps, Server Components default   |
| Env variables     | `env-variable-management`      | Update 4 locations: code, SST, workflow   |
| API validation    | `data-validation-patterns`     | Zod in `lib/validation/`, safe fallbacks  |
| PR review         | `code-review-evaluation`       | Cross-reference against project skills    |

See `AGENTS.md` for complete repository guidelines.

---

## Technology Stack

| Layer            | Technology                                                        |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, React 19, React Compiler, Turbopack dev) |
| Language         | TypeScript 5.9 (strict mode)                                     |
| Styling          | Tailwind CSS 3.3 + PostCSS + cssnano                             |
| State (client)   | Zustand (persisted to localStorage) + SWR for data fetching      |
| i18n             | next-intl 4.x (3 locales: `ca`, `es`, `en`)                     |
| Validation       | Zod 3.24                                                         |
| Testing          | Vitest 4 + React Testing Library (unit), Playwright 1.56 (E2E)   |
| Monitoring       | Sentry (client, server, edge configs)                            |
| Deployment       | SST v3 + OpenNext on AWS (Lambda + CloudFront + DynamoDB + S3)   |
| CI/CD            | GitHub Actions (CI on push/PR, deploy on main)                   |
| Package manager  | Yarn 4.12 (Corepack)                                             |
| Node             | 22.x                                                             |

---

## Project Structure

```
.
├── app/                          # Next.js App Router
│   ├── [locale]/                 # i18n locale segment
│   │   ├── [place]/              # Dynamic place pages (city/region events)
│   │   │   └── [byDate]/         # Date-filtered events
│   │   ├── noticies/             # News section
│   │   ├── patrocina/            # Sponsorship pages
│   │   ├── publica/              # Event submission
│   │   ├── preferits/            # Favorites
│   │   ├── compartir-tiktok/     # TikTok sharing
│   │   ├── qui-som/              # About us
│   │   ├── politica-privacitat/  # Privacy policy
│   │   ├── termes-servei/        # Terms of service
│   │   └── sitemap/              # HTML sitemaps
│   ├── api/                      # API routes (internal proxy layer)
│   │   ├── events/               # Events CRUD
│   │   ├── news/                 # News endpoints
│   │   ├── categories/           # Categories
│   │   ├── places/               # Places lookup
│   │   ├── cities/               # City data
│   │   ├── regions/              # Region data
│   │   ├── sponsors/             # Sponsor management
│   │   ├── favorites/            # User favorites
│   │   ├── image-proxy/          # Image optimization (Sharp)
│   │   ├── publica/              # Event publication
│   │   ├── revalidate/           # ISR revalidation
│   │   └── ...                   # More API routes
│   ├── sitemap-events/           # Dynamic event sitemaps
│   ├── sitemap-places/           # Dynamic place sitemaps
│   └── manifest.ts               # PWA manifest
├── components/
│   ├── ui/                       # Feature-organized UI components
│   │   ├── card/                 # Event cards
│   │   ├── filters/              # Filter components
│   │   ├── hero/                 # Hero sections
│   │   ├── maps/                 # Map components
│   │   ├── search/               # Search UI
│   │   ├── sponsor/              # Sponsor banners
│   │   └── ...                   # ~30 feature folders
│   ├── hooks/                    # Custom React hooks
│   ├── partials/                 # Page section partials (SEO, layout)
│   ├── context/                  # React context providers
│   ├── noticies/                 # News-specific components
│   └── sitemap/                  # Sitemap components
├── lib/
│   ├── api/                      # API client libraries
│   │   ├── events.ts             # Client-side event fetching
│   │   ├── events-external.ts    # Server-side external API (HMAC)
│   │   ├── news.ts / news-external.ts
│   │   ├── categories.ts / categories-external.ts
│   │   ├── places.ts / places-external.ts
│   │   ├── cities.ts / cities-external.ts
│   │   ├── regions.ts / regions-external.ts
│   │   └── cache.ts              # In-memory TTL cache utilities
│   ├── validation/               # Zod schemas
│   ├── helpers/                  # Server helpers
│   ├── dates.ts                  # Date utilities
│   └── db/                       # DynamoDB utilities
├── types/                        # ALL TypeScript types (enforced)
│   ├── api/                      # API response DTOs
│   ├── common.ts                 # Shared types
│   ├── props.ts                  # Component prop types
│   ├── event.ts                  # Event types
│   ├── filters.ts                # Filter types
│   ├── i18n.ts                   # i18n types & locale constants
│   ├── store.ts                  # Zustand store types
│   └── ...                       # ~30 type files
├── utils/                        # Utility functions
│   ├── api-helpers.ts            # Query builders (buildEventsQuery, etc.)
│   ├── hmac.ts                   # HMAC signing/verification
│   ├── safe-fetch.ts             # Safe fetch wrappers with timeouts
│   ├── url-filters.ts            # URL <-> filter state mapping
│   ├── category-mapping.ts       # Category slug validation
│   ├── i18n-seo.ts               # Localized URL generation
│   └── ...                       # ~50 utility files
├── config/
│   ├── filters.ts                # Filter configuration (single source)
│   ├── categories.ts             # Category definitions
│   ├── api-defaults.json         # Default API URL
│   ├── pricing.ts                # Pricing config
│   └── sponsors.ts               # Sponsor config
├── i18n/
│   ├── routing.ts                # next-intl routing (exports Link, etc.)
│   └── request.ts                # Server-side i18n request config
├── messages/                     # Translation files
│   ├── ca.json                   # Catalan (primary)
│   ├── es.json                   # Spanish
│   └── en.json                   # English
├── styles/                       # Global CSS / Tailwind
├── store.ts                      # Zustand store (root)
├── proxy.ts                      # Middleware (locale, redirects, CSP, HMAC)
├── test/                         # Vitest tests
├── e2e/                          # Playwright E2E tests
├── scripts/                      # Build scripts (SW generation, robots, etc.)
├── public/                       # Static assets (sw-template.js, images)
├── docs/                         # Documentation & incident reports
├── sst.config.ts                 # SST deployment config (AWS)
├── open-next.config.ts           # OpenNext config (Sharp installation)
└── .github/
    ├── skills/                   # 16 agent skill files
    └── workflows/                # CI, deploy, rollback, monitoring
```

---

## Critical Rules (Always Apply)

### 1. Types in `/types` only
Never inline type definitions in components or pages. All types, interfaces, and derived prop types go in `types/`.

### 2. Server Components by default
Add `"use client"` only at leaf components that truly need browser APIs. Never at layout or page level.

### 3. Use `Link` from `@i18n/routing`
```ts
// CORRECT
import { Link } from "@i18n/routing";

// WRONG - loses locale on navigation
import Link from "next/link";
```

### 4. NEVER add `searchParams` to listing pages
Reading `searchParams` in `app/[place]/` pages makes them dynamic, causing DynamoDB cache explosion. This caused a **$300 cost spike** (Dec 2025). Query params are handled client-side via SWR only.

### 5. NEVER use `next: { revalidate }` on external API fetches
This creates unbounded S3 + DynamoDB cache entries. Use `fetchWithHmac` (defaults to `no-store`). Add caching via `Cache-Control` headers in API routes or in-memory TTL caches instead.

### 6. Use semantic design classes
Never use raw `gray-*` Tailwind colors. Use the project's semantic color tokens.

### 7. No barrel files mixing route contexts
Never create `index.ts` files that re-export `"use client"` components from different routes. Use direct file imports to prevent client-reference-manifest bloat.

### 8. Never delete `open-next.config.ts`
It's the primary mechanism for installing Sharp in Lambda. Both `open-next.config.ts` and `sst.config.ts` must use x86_64/x64. Do NOT switch to arm64.

---

## Architecture

### API Layer (Three-Layer Proxy Pattern)

```
Browser → lib/api/*.ts (client lib)
       → app/api/*/route.ts (internal proxy, adds Cache-Control)
       → lib/api/*-external.ts (server-side, HMAC-signed via fetchWithHmac)
       → External backend API
```

- **Client libraries** (`lib/api/events.ts`): Called from components, hit internal `/api/*` routes
- **API routes** (`app/api/events/route.ts`): Proxy layer, sets `Cache-Control` headers
- **External wrappers** (`lib/api/events-external.ts`): Server-only, signs with HMAC via `fetchWithHmac`
- Never call external API directly from the browser
- HMAC middleware in `proxy.ts` protects most `/api/*` routes; public GETs are allowlisted

### State Management

- **Server**: Data fetched in Server Components via external wrappers
- **Client state**: Zustand store (`store.ts`) - minimal UI state (modal, hydration, location)
- **Client data**: SWR for client-side data fetching (search, filters, pagination)
- **URL state**: Filter state encoded in URL segments, not query params

### Internationalization (i18n)

- **next-intl** with 3 locales: `ca` (default), `es`, `en`
- Route structure: `/[locale]/[place]/...` (locale prefix strategy via `types/i18n.ts`)
- Translation files: `messages/ca.json`, `messages/es.json`, `messages/en.json`
- Always use `Link` from `@i18n/routing` (auto-adds locale prefix)
- JSON-LD URLs: Use `toLocalizedUrl(path, locale)` from `@utils/i18n-seo`
- i18n checks: `yarn i18n:check` validates keys; `yarn i18n:validate` checks placeholders

### Middleware (`proxy.ts`)

Handles: locale detection (cookie → Accept-Language → default), canonical URL redirects (301 for legacy patterns), CSP headers, HMAC verification for API routes, `X-Robots-Tag` for filtered URLs.

### Deployment (SST v3 + OpenNext → AWS)

- **Lambda** (Node 22, x86_64) serves Next.js via OpenNext adapter
- **CloudFront** CDN in front
- **DynamoDB** for ISR cache entries
- **S3** for static assets and cache
- Deploy: Push to `main` → GitHub Actions → SST deploy to `eu-west-3`
- Rollback: GitHub Actions workflow "Rollback (SST)" → deploys `last-successful-deploy` tag

---

## Commands

| Command                 | Purpose                                              |
| ----------------------- | ---------------------------------------------------- |
| `yarn dev`              | Dev server (port 3000, Turbopack, auto-prebuild)     |
| `yarn build`            | Production build (run `yarn prebuild` first)         |
| `yarn build:development`| Build with `.env.development` (includes prebuild)    |
| `yarn lint`             | ESLint (0 errors expected)                           |
| `yarn typecheck`        | `tsc --noEmit` (must pass cleanly)                   |
| `yarn test`             | Vitest unit/integration (~1400 tests)                |
| `yarn test:watch`       | Vitest in watch mode                                 |
| `yarn test:coverage`    | Vitest with coverage report                          |
| `yarn test:e2e`         | Playwright E2E tests                                 |
| `yarn i18n:check`       | Validate translation keys across locales             |
| `yarn i18n:validate`    | Validate i18n placeholder consistency                |
| `yarn analyze`          | Bundle size analysis                                 |
| `yarn prebuild`         | Generate `public/sw.js` + `robots.txt`               |

**Pre-push hook runs**: `yarn typecheck && yarn test --run && yarn i18n:check`

**Verification before PR**: `yarn lint && yarn typecheck && yarn test`

---

## Path Aliases (tsconfig.json)

| Alias             | Path              |
| ----------------- | ----------------- |
| `@app/*`          | `./app/*`         |
| `@components/*`   | `./components/*`  |
| `@styles/*`       | `./styles/*`      |
| `@utils/*`        | `./utils/*`       |
| `@lib/*`          | `./lib/*`         |
| `@config/*`       | `./config/*`      |
| `@i18n/*`         | `./i18n/*`        |
| `@store`          | `./store.ts`      |
| `@public/*`       | `./public/*`      |
| `types/*`         | `./types/*`       |

---

## Coding Conventions

- **TypeScript strict mode** with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- **ESLint**: `next/core-web-vitals` + `@eslint-react` + `react-hooks` (flat config, ESLint 9)
- **Components**: PascalCase filenames and exports
- **Hooks**: `useXxx` naming, placed in `components/hooks/`
- **Utilities**: lowerCamelCase, placed in `utils/`
- **Indentation**: 2 spaces
- **Imports**: Always use path aliases (`@components/*`, `@utils/*`, etc.)
- **No barrel files**: Direct file imports only (e.g., `from "@components/ui/sponsor/SponsorBannerSlot"`)
- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `test:`, `refactor:`

---

## Testing

### Unit Tests (Vitest)
- Config: `vitest.config.ts` with jsdom environment
- Location: `test/**/*.{test,spec}.{ts,tsx}`
- Setup: `test/setup.ts` (seeds `HMAC_SECRET`, global mocks)
- Mocks: `test/mocks/` for `next-intl`, `server-only`, etc.
- Coverage thresholds: 50% (statements, branches, functions, lines)

### E2E Tests (Playwright)
- Location: `e2e/`
- Local config: `playwright.config.ts` (starts dev server)
- Remote config: `playwright.remote.config.ts` (uses `PLAYWRIGHT_TEST_BASE_URL`)

---

## Security

- **HMAC**: All non-public API routes require HMAC signature. Signing happens server-side in `*-external.ts` via `fetchWithHmac`. Never sign in the browser.
- **CSP**: Relaxed policy with host allowlisting in `proxy.ts`. `unsafe-inline` allowed for ISR/PPR caching compatibility.
- **Secrets**: Never commit `.env.*` files. Required: `HMAC_SECRET` (server), `NEXT_PUBLIC_API_URL`.
- **Fetch safety**: Use `fetchWithHmac` (internal API, 10s timeout), `safeFetch`/`fireAndForgetFetch` (external services, 5s timeout). Never raw `fetch()` without timeout.
- **Sentry**: Configured in `sentry.{client,server,edge}.config.ts`. DSN set only in deployed environments.

---

## Cost Prevention (Incident Learnings)

1. **DynamoDB write spike** (Dec 2025, $300): `searchParams` in page components → dynamic pages → unbounded cache entries. Fix: client-side-only query params via SWR.
2. **Fetch cache explosion** (Jan 2026, 146K entries): `next: { revalidate }` on external fetches → S3+DynamoDB growth. Fix: `no-store` default, cache via headers/in-memory.
3. **Sharp architecture mismatch** (Feb 2026): arm64 Sharp on x64 Lambda. Fix: lock both `open-next.config.ts` and `sst.config.ts` to x86_64/x64.
4. **Barrel file manifest bloat** (Feb 2026, +24KB): `index.ts` re-exporting `"use client"` components leaked into unrelated route manifests. Fix: direct file imports only.

---

## Generated/Build Files (Do NOT Edit)

- `public/sw.js` - Generated by `scripts/generate-sw.mjs`. Edit `public/sw-template.js` instead.
- `.next/` - Build output
- `tsconfig.tsbuildinfo` - TypeScript incremental cache
- `server-place-sitemap.xml` - Generated sitemap

---

## Workflow for AI Assistants

1. **Read `tasks/lessons.md`** at session start for project-specific corrections
2. **Search existing patterns FIRST** — grep for the concept, function names, related types
3. **Check canonical locations** — `types/` for types, `utils/` for helpers, `config/` for config, `components/hooks/` for hooks
4. **Load relevant skill** from `.github/skills/*/SKILL.md`
5. **Plan before building** — for anything non-trivial (3+ steps or architectural decisions), write a plan to `tasks/todo.md` and confirm before implementing
6. **Implement** following skill checklists
7. **Verify before declaring done** — `yarn typecheck && yarn lint` (and `yarn test` if tests affected). Demonstrate correctness, don't just assert it
8. **If something goes sideways, STOP and re-plan** — don't push through a failing approach

---

## Process Rules

### Planning
- Default to planning for non-trivial work. Write checkable items to `tasks/todo.md`.
- Mark items complete as you go. Add a review section when done.
- For simple, obvious fixes — just do them. Don't over-process.

### Subagent Usage
- Offload research, exploration, and parallel analysis to subagents to keep the main context clean.
- One focused task per subagent. Don't overload a single subagent with unrelated concerns.
- For complex problems, prefer multiple focused subagents over sequential searching in the main thread.

### Self-Correction
- After ANY correction from the user, append the lesson to `tasks/lessons.md` with the pattern and the fix.
- Write it as a rule: "When X, do Y instead of Z."
- Review `tasks/lessons.md` at session start for relevant project context.

### Verification
- Never mark a task complete without proving it works (run tests, check types, show output).
- For bug fixes: diff the behavior before and after when relevant.
- For CI failures: diagnose and fix autonomously — don't ask for hand-holding.

### Quality Bar
- For non-trivial changes, pause and ask: "Is there a simpler way that matches existing patterns?"
- If a fix feels hacky, step back and implement the clean solution. This codebase has established patterns — use them.
- Don't over-engineer simple fixes. Three similar lines beat a premature abstraction.
