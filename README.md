# Que Fer — Next.js App

Production‑ready Next.js 16 + TypeScript app using the App Router. Includes TailwindCSS, SWR, next-intl, Vitest, Playwright, Sentry, and a Workbox‑based service worker.

For contribution rules and architecture, see AGENTS.md (the single source of truth for humans and AI agents).

## Quickstart

1. Requirements: Node 26 and Yarn 4 (Corepack)

```bash
npm install -g corepack && corepack enable && corepack prepare yarn@4.12.0 --activate
yarn install --immutable
```

1. Environment

Copy `.env.example` to `.env.development` (gitignored) and set:

- HMAC_SECRET=your-server-secret
- BACKEND_SERVICE_SECRET=your-backend-service-key (must match the v2 backend)
- NEXT_PUBLIC_API_URL=`https://api.esdeveniments.cat/api`
- Optional: NEXT_PUBLIC_GOOGLE_ANALYTICS, NEXT_PUBLIC_GOOGLE_ADS, NEXT_PUBLIC_SENTRY_DSN (browser/edge), SENTRY_DSN (Node server), REDIS_URL
- Auth (sign-in, profile, favorites): LOGTO_* — see `docs/logto-auth-setup.md`

1. Run

```bash
yarn prebuild   # generates public/sw.js and public/robots.txt
yarn dev
# production build (plain `yarn build` doesn't read .env.development)
yarn build:development && yarn start:development
```

## Scripts

- prebuild: generate `public/sw.js` (from `public/sw-template.js`) and `public/robots.txt`. `dev` and `build` do not run it.
- dev: start Next.js.
- dev:inspect: start Next.js with Node.js debugger enabled (`next dev --inspect`)
- build/start: production build and serve. Sitemaps are App Router routes (`app/sitemap.xml`, `app/server-*-sitemap.xml`).
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
- E2E local: `yarn test:e2e` (Playwright starts `E2E_TEST_MODE=1 yarn dev`)
- E2E remote: `PLAYWRIGHT_TEST_BASE_URL=<url> yarn test:e2e --config playwright.remote.config.ts`

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

- Internal API proxy layer: Client libraries (`lib/api/*`) call internal Next.js API routes (`app/api/*`) which proxy to the backend via `*-external.ts` wrappers using `fetchWithHmac` (sends `X-Backend-Key`, plus legacy HMAC headers while `HMAC_SECRET` is set). Never call external API directly from pages/components.
- `proxy.ts` enforces the frontend's own HMAC gate on most `/api/*` routes (`x-hmac`, `x-timestamp`); public GET endpoints (events, news, categories, places, regions, cities) are allowlisted. Avoid signing in the browser—always use internal API routes.
- CSP: Relaxed policy with host allowlisting for Google Analytics, Ads, and trusted domains. Inline scripts are allowed via `'unsafe-inline'` to enable ISR/PPR caching. JSON-LD rendered server-side via `JsonLdServer` component. See `proxy.ts` for full CSP configuration.

## Deploy

Deployed via **Docker on Coolify** (self-hosted PaaS).

- **Dockerfile**: Multi-stage build → `node:26-slim` with standalone output
- **Cache handler**: `@fortedigital/nextjs-cache-handler` with Redis (falls back to LRU when Redis is unavailable)
- **CI**: `.github/workflows/ci.yml` runs lint, typecheck, tests, build, bundle size check
- **Deploy workflow**: `.github/workflows/deploy-coolify.yml` builds and deploys on push to `main` (production) and `develop` (staging)
- **Health check**: `/api/health` — Docker HEALTHCHECK and deploy verification endpoint
- **Environment variables**: See `.claude/skills/env-variable-management/SKILL.md` for the 5-location checklist

### Docker build locally

Export `HMAC_SECRET`, `BACKEND_SERVICE_SECRET` and
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` (`openssl rand -base64 32`) in your shell, and set
`NEXT_PUBLIC_API_URL` to the v2 backend URL. The build preflight rejects a
missing key or a backend without the v2 endpoints. BuildKit mounts the secrets
for the build without storing them in image layers, except
`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`: Next writes it into the build output, so it
ships inside the image. Don't share images built with a real key.

```bash
# Build: public configuration is inlined; credentials use BuildKit secrets.
docker build \
  --build-arg NEXT_PUBLIC_API_URL="$NEXT_PUBLIC_API_URL" \
  --build-arg NEXT_PUBLIC_SITE_URL=https://www.esdeveniments.cat \
  --secret id=HMAC_SECRET,env=HMAC_SECRET \
  --secret id=BACKEND_SERVICE_SECRET,env=BACKEND_SERVICE_SECRET \
  --secret id=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY,env=NEXT_SERVER_ACTIONS_ENCRYPTION_KEY \
  -t esdeveniments-frontend .

# Run: server-side secrets provided at runtime (not baked into image)
docker run -p 3000:3000 \
  -e HMAC_SECRET \
  -e BACKEND_SERVICE_SECRET \
  -e NEXT_PUBLIC_API_URL \
  -e REVALIDATE_SECRET=your-revalidate-secret \
  -e REDIS_URL=redis://localhost:6379 \
  esdeveniments-frontend
```
