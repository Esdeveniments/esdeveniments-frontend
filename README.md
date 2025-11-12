# Que Fer — Next.js App

Production‑ready Next.js 15 + TypeScript app using the App Router. Includes TailwindCSS, SWR, Zustand, Vitest, Playwright, Sentry, and a Workbox‑based service worker.

For contribution rules, see AGENTS.md.

## Quickstart

1) Requirements: Node 20 and Yarn 4 (Corepack)

```bash
corepack enable && corepack prepare yarn@4.9.1 --activate
yarn install --immutable
```

2) Environment

Create `.env.development` (and set in CI/hosting for others):
- HMAC_SECRET=your-server-secret
- NEXT_PUBLIC_API_URL=https://api-pre.esdeveniments.cat (or prod)
- Optional: NEXT_PUBLIC_GOOGLE_ANALYTICS, NEXT_PUBLIC_GOOGLE_ADS, SENTRY_DSN

3) Run

```bash
yarn dev
# build: generates sw, builds app, then sitemaps
yarn build && yarn start
```

## Scripts

- dev: start Next.js (prebuild generates `public/sw.js` from `public/sw-template.js`)
- build/start: production build and serve; postbuild runs `next-sitemap`
- lint/typecheck: ESLint and `tsc --noEmit`
- test/test:watch/test:coverage: Vitest (jsdom, RTL)
- test:e2e, test:e2e:ui, test:e2e:debug: Playwright
- analyze, scan: bundle analysis and react-scan for localhost

## Structure

- app/ (routes, layouts, API under app/api)
- components/ (ui/, partials/, hooks/)
- lib/, utils/, config/, types/
- styles/, public/, scripts/ (e.g., `generate-sw.mjs`), docs/
- test/ (Vitest), e2e/ (Playwright)
- Path aliases in tsconfig: `@components/*`, `@utils/*`, etc.

## Testing

- Unit/integration: `yarn test`; coverage: `yarn test:coverage`
- E2E local: `yarn test:e2e` (starts dev server)
- E2E remote: use `playwright.remote.config.ts` with `PLAYWRIGHT_TEST_BASE_URL`

## Security & API

- Internal API proxy layer: Client libraries (`lib/api/*`) call internal Next.js API routes (`app/api/*`) which proxy to external backend with HMAC signing via `*-external.ts` wrappers. Never call external API directly from pages/components.
- Middleware enforces HMAC on most `/api/*` routes (`x-hmac`, `x-timestamp`); public GET endpoints (events, news, categories, places, regions, cities) are allowlisted. Avoid signing in the browser—always use internal API routes.
- CSP: Relaxed policy with host allowlisting for Google Analytics, Ads, and trusted domains. Inline scripts are allowed via `'unsafe-inline'` to enable ISR/PPR caching. JSON-LD rendered server-side via `JsonLdServer` component. See `proxy.ts` for full CSP configuration.

## Deploy

- AWS Amplify config (`amplify.yml`) uses Node 20 + Yarn 4, immutable installs, prebuild SW generation, and Next sitemap postbuild. Set environment variables in hosting.

