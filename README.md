# Que Fer — Next.js App

Production‑ready Next.js 16 + TypeScript app using the App Router. Includes TailwindCSS, SWR, Zustand, Vitest, Playwright, Sentry, and a Workbox‑based service worker.

For contribution rules, see AGENTS.md.

## Quickstart

1. Requirements: Node 22 and Yarn 4 (Corepack)

```bash
corepack enable && corepack prepare yarn@4.12.0 --activate
yarn install --immutable
```

1. Environment

Create `.env.development` (and set in CI/hosting for others):

- HMAC_SECRET=your-server-secret
- NEXT_PUBLIC_API_URL=`https://api.esdeveniments.cat/api`
- Optional: NEXT_PUBLIC_GOOGLE_ANALYTICS, NEXT_PUBLIC_GOOGLE_ADS, SENTRY_DSN, REDIS_URL

1. Run

```bash
yarn dev
# build: generates sw, builds app, then sitemaps
yarn build && yarn start
```

## Scripts

- dev: start Next.js (prebuild generates `public/sw.js` from `public/sw-template.js`)
- dev:inspect: start Next.js with Node.js debugger enabled (`next dev --inspect`)
- build/start: production build and serve; postbuild runs `next-sitemap`
- lint/typecheck: ESLint and `tsc --noEmit`
- test/test:watch/test:coverage: Vitest (jsdom, RTL)
- test:e2e, test:e2e:ui, test:e2e:debug: Playwright
- analyze, analyze:browser, analyze:server: bundle analysis with @next/bundle-analyzer
- analyze:experimental: Next.js 16.1 experimental bundle analyzer (interactive UI with Turbopack)
- upgrade: upgrade Next.js to latest version using `next upgrade`
- scan: react-scan for localhost

## Structure

- app/ (routes, layouts, API under app/api)
- components/ (ui/, partials/, hooks/)
- lib/, utils/, config/, types/
- styles/, public/, scripts/ (e.g., `generate-sw.mjs`), docs/
- test/ (Vitest), e2e/ (Playwright)
- Path aliases in tsconfig: `@components/*`, `@utils/*`, etc.
- Next.js 16 note: the old `middleware.ts` is now `proxy.ts`; keep locale detection, canonical redirects, CSP, and cache headers centralized there.

## Testing

- Unit/integration: `yarn test`; coverage: `yarn test:coverage`
- E2E local: `yarn test:e2e` (starts dev server)
- E2E remote: use `playwright.remote.config.ts` with `PLAYWRIGHT_TEST_BASE_URL`

## Bundle size regressions

CI enforces a bundle-size regression gate after `yarn build`.

- Baseline + thresholds: `bundle-size-baseline.json`
- Current report (generated): `bundle-sizes.json`

Run locally:

```bash
yarn build
node scripts/analyze-bundles-cli.mjs --format json > bundle-sizes.json
node scripts/compare-bundle-sizes.mjs --baseline bundle-size-baseline.json --current bundle-sizes.json
```

Update the baseline (only when the increase is intentional):

1) Run the commands above
2) Copy the updated numbers from `bundle-sizes.json` into `bundle-size-baseline.json`
3) Bump `lastUpdated`

## Security & API

- Internal API proxy layer: Client libraries (`lib/api/*`) call internal Next.js API routes (`app/api/*`) which proxy to external backend with HMAC signing via `*-external.ts` wrappers. Never call external API directly from pages/components.
- Middleware enforces HMAC on most `/api/*` routes (`x-hmac`, `x-timestamp`); public GET endpoints (events, news, categories, places, regions, cities) are allowlisted. Avoid signing in the browser—always use internal API routes.
- CSP: Relaxed policy with host allowlisting for Google Analytics, Ads, and trusted domains. Inline scripts are allowed via `'unsafe-inline'` to enable ISR/PPR caching. JSON-LD rendered server-side via `JsonLdServer` component. See `proxy.ts` for full CSP configuration.

## Deploy

Deployed via **Docker on Coolify** (self-hosted PaaS).

- **Dockerfile**: Multi-stage build → `node:22-slim` with standalone output
- **Cache handler**: `@fortedigital/nextjs-cache-handler` with Redis (falls back to LRU when Redis is unavailable)
- **CI**: `.github/workflows/ci.yml` runs lint, typecheck, tests, build, bundle size check
- **Deploy workflow**: `.github/workflows/deploy-coolify.yml` triggers Coolify webhook on push to main
- **Health check**: `/api/health` — Docker HEALTHCHECK and deploy verification endpoint
- **Environment variables**: See `.github/skills/env-variable-management/SKILL.md` for the 5-location checklist

### Docker build locally

```bash
# Build: NEXT_PUBLIC_* inlined by Next.js, HMAC_SECRET needed for ISR static generation
docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api.esdeveniments.cat/api \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.esdeveniments.cat \
  --build-arg HMAC_SECRET=your-secret \
  -t esdeveniments-frontend .

# Run: server-side secrets provided at runtime (not baked into image)
docker run -p 3000:3000 \
  -e HMAC_SECRET=your-secret \
  -e REVALIDATE_SECRET=your-revalidate-secret \
  -e REDIS_URL=redis://localhost:6379 \
  esdeveniments-frontend
```

