# Repository Guidelines

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
- ESLint extends `next/core-web-vitals` + TS. Fix warnings before merge.
- Define all type aliases/interfaces in `types/` (ESLint‑enforced).
- Components: PascalCase; hooks: `useXxx`; helpers: lowerCamelCase.
- Indentation: 2 spaces; prefer path aliases; Tailwind utilities for styling; globals in `styles/`.

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
- CSP nonce: middleware injects `x-nonce`; pass it to `<Script nonce={...}>` (see `app/layout.tsx:28`, `app/GoogleScripts.tsx:7`).

## Agent-Specific Instructions

- Prefer surgical diffs; keep file moves/renames minimal and scoped.
- Do not edit generated or build output (`public/sw.js`, `.next/**`, `tsconfig.tsbuildinfo`, `server-place-sitemap.xml`). Edit `public/sw-template.js` and run prebuild instead.
- Types live only in `types/`; avoid redefining `NavigationItem`, `SocialLinks`, `EventProps`, `CitySummaryResponseDTO` (see `types/common.ts`, `types/api/city.ts`).
- Server-first by default; mark client components with `"use client"` only when necessary. Avoid exposing secrets in client code.
- API security: middleware enforces HMAC on most `/api/*`. For browser-callable endpoints, prefer a server proxy or a narrow allowlist entry; never sign requests in the browser.
- Use Yarn 4 commands and Node 20 locally; run `yarn lint && yarn typecheck && yarn test` before finalizing changes.

## Architecture Overview

- Next.js App Router with server‑first rendering; client state via Zustand (`store.ts`) and client data fetching via SWR.
- SEO & sitemaps: `next-sitemap` runs after build; sitemap routes under `app/`; `middleware.ts` handles edge behavior.

## Local Setup

- Requirements: Node 20, Yarn 4.9+ (use Corepack).
- Install: `corepack enable && corepack prepare yarn@4.9.1 --activate && yarn install --immutable`.
- Env: set `HMAC_SECRET` (server‑only), `NEXT_PUBLIC_API_URL` (defaults handled), optional `NEXT_PUBLIC_GOOGLE_ANALYTICS`, `NEXT_PUBLIC_GOOGLE_ADS`, `SENTRY_DSN`.
- Run: `yarn dev` (generates `public/sw.js` via prebuild). Build: `yarn build`.
- Tests: `yarn test`; E2E: `yarn test:e2e` (local config starts the app).

## Feature Checklist

- Types: add/extend only in `types/` (no inline app/component types).
- UI/Pages: place components under `components/ui/<feature>/`; routes in `app/<segment>/` (server‑first; add `"use client"` only if needed).
- API: call from server code or via internal API; respect HMAC middleware. For public endpoints, use or extend allowlist carefully.
- Tests: add unit tests under `test/` and E2E flows under `e2e/` when user‑visible.
- SW/Caching: if adding external API usage or offline behavior, edit `public/sw-template.js` and re‑run prebuild/dev.
- Pre‑PR: `yarn lint && yarn typecheck && yarn test` (and E2E if applicable); include screenshots for UI.
