---
name: env-variable-management
description: How to add, rename or remove an environment variable in esdeveniments.cat so code, .env.example, Coolify, the deploy workflow/Dockerfile and GitHub secrets stay in sync. Use when code reads a new process.env value, when a NEXT_PUBLIC_* value is missing in production, or when touching .env.example, Dockerfile ARGs, deploy-coolify.yml secrets, Sentry, Redis or Logto config.
---

# Environment variable management

A variable missing from one location breaks a build or crashes the container. Update every location that applies. Basics (local env files, required secrets): AGENTS.md › Commands; hosting: AGENTS.md › Hosting and deploys.

`.env.example` lists every variable a deploy must set, with its purpose. Optional tuning and platform values (`STRIPE_TAX_MODE`, `HMAC_*_TOLERANCE_MS`, `VERCEL_*`, …) are read only in code; grep `process.env` for the full set. It is the only tracked env file; `.env`, `.env.local`, `.env.development`, `.env.staging` and `.env.production` are gitignored.

## How values reach the app

Coolify does **not** build. `deploy-coolify.yml` builds a Docker image in GitHub Actions, pushes it to GHCR, then pins Coolify to the `sha-<commit>` tag. So:

| Kind | Read when | Comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_*` | Build time (inlined in the client bundle) | GitHub secret → workflow `build-args:` → Dockerfile `ARG` + `ENV` in the builder stage |
| Build-time private secret (`HMAC_SECRET`, `BACKEND_SERVICE_SECRET`, `SENTRY_AUTH_TOKEN`, `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`) | Build time (prerender, source maps, Server Action IDs) | GitHub secret → workflow `secrets:` → Dockerfile `RUN --mount=type=secret,...` |
| Server-only runtime value (`LOGTO_*`, `STRIPE_*`, `REDIS_URL`, `TURSO_*`, `API_URL`, `SENTRY_DSN`, `REVALIDATE_SECRET`, …) | Runtime, by the Node server | Coolify → Application → Environment |
| Workflow-only (`COOLIFY_TOKEN`, `COOLIFY_WEBHOOK_URL`) | During the workflow | GitHub secret → step `env:` |

`REVALIDATE_SECRET` is both: `app/api/revalidate/route.ts` reads it at runtime (Coolify), and `deploy-coolify.yml` sends the same value from a GitHub secret on post-deploy calls.

`HEALTH_SECRET` is both too: `app/api/health/route.ts` reads it at runtime (Coolify) from the `x-health-secret` header, and `deploy-coolify.yml` sends it from a GitHub secret (never in the query string, so it stays out of access logs). While it is unset, both sides fall back to `REVALIDATE_SECRET`, so set it in Coolify (staging and production) and GitHub together, then deploy.

`CLOUDFLARE_ZONE_ID` and `CLOUDFLARE_API_TOKEN` are both too: the post-deploy purge in `deploy-coolify.yml` uses the GitHub secrets, and the app reads them at runtime (Coolify) to purge Cache-Tags on publish, edit and delete (`lib/cdn/cloudflare-purge.ts`). The token needs the zone's Cache Purge permission. Without them the purge is skipped and pages stay stale until `s-maxage` expires; `/api/health` (authenticated) reports `cloudflarePurgeConfigured`.

`HMAC_SECRET` and `BACKEND_SERVICE_SECRET` are also needed at runtime, so set them in Coolify too. `SENTRY_AUTH_TOKEN` is build-only (read in `next.config.js`); keep it out of Coolify.

`NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` is build-only and required: Next salts every Server Action ID with it, so a fixed key keeps the actions of pages already open in a browser working across deploys (without it, each deploy makes them fail with "Failed to find Server Action"). Use a separate value per Environment (`openssl rand -base64 32`); the "Verify Server Actions encryption key" step fails the deploy when it is missing or invalid. Don't set it in Coolify: at runtime it would replace the build key for encrypting values that inline `"use server"` closures capture. Rotating it breaks open pages once, like a deploy did before. The `e2e-tests` job's "Build Next.js application" step in `deploy-coolify.yml` gets `HMAC_SECRET`, `BACKEND_SERVICE_SECRET`, `NEXT_PUBLIC_API_URL` and `SENTRY_AUTH_TOKEN` as step `env:`; add a new build-time value there as well if the CI build needs it.

GitHub secrets resolve per Environment (`production` on `main`, `staging` otherwise) and fall back to repo-level values. The workflow blanks `NEXT_PUBLIC_GOOGLE_ANALYTICS`/`_ADS` on non-`main` builds so prod IDs never land in staging.

PR E2E (`ci.yml` `e2e` job) runs against the preproduction API with the `staging` Environment's secrets (`deployment: false`), so PR E2E doesn't use the production keys (the `quality` build and `prod-arch-smoke.yml` still read the repo-level secrets). Dependabot PRs see only Dependabot secrets, so the Dependabot `BACKEND_SERVICE_SECRET` and `HMAC_SECRET` hold the preproduction values. Don't add a repo-level `NEXT_PUBLIC_API_URL` variable: the `e2e` job's preproduction fallback must win wherever the Environment variable isn't visible.

## Adding a variable: the five locations

| # | Location | What to do |
| --- | --- | --- |
| 1 | Code | Read `process.env.X` on the server. Optional → safe fallback; required → fail clearly where it is used (backend reads still return a safe fallback, see `api-layer-patterns`). Never prefix a secret with `NEXT_PUBLIC_`. |
| 2 | `.env.example` (+ your local `.env.local`) | Add a placeholder and a one-line comment in the right section. Never a real value. |
| 3 | Coolify (staging and production apps) | Runtime values. Redeploy to apply. |
| 4 | `.github/workflows/deploy-coolify.yml` (+ `Dockerfile`) | Build-time values only: add to `build-args:` and a matching `ARG`/`ENV` in the Dockerfile builder stage, or to `secrets:` plus a `--mount=type=secret` for private ones. |
| 5 | GitHub secrets | Value for each Environment (`staging`, `production`) or repo-level. |

A `NEXT_PUBLIC_*` value missing from step 4 is `undefined` in the client bundle even if Coolify has it.

## Local files

Copy `.env.example` to `.env.local` and fill in real values. `next dev` reads `.env.development` and `.env.local`; the `build:<env>` / `start:<env>` scripts load `.env.<env>` with `env-cmd`. With no backend secret the app still renders, with empty data.

## Notes on specific services

- **Backend**: `NEXT_PUBLIC_API_URL` is the public base (ends in `/api`); server-only `API_URL` overrides it on the server (`getApiUrl()` in `utils/api-helpers.ts`). The default comes from `config/api-defaults.json`.
- **Sentry**: the browser (`instrumentation-client.ts`) and edge (`sentry.edge.config.ts`) use `NEXT_PUBLIC_SENTRY_DSN` (build arg). The Node server (`sentry.server.config.ts`) uses `SENTRY_DSN` (Coolify runtime). `SENTRY_AUTH_TOKEN` (build secret) turns on source-map upload; org and project are hard-coded in `next.config.js`, so the Dockerfile's `SENTRY_ORG`/`SENTRY_PROJECT` ARGs have no effect.
- **Redis**: optional. `REDIS_URL` wins; otherwise a plain `redis://` URL is built from `REDIS_HOST`, `REDIS_PORT` (6379), `REDIS_USERNAME`, `REDIS_PASSWORD` (TLS needs `REDIS_URL`). With neither, `cache-handler.mjs` uses an in-process LRU and `lib/cache/redis-client.ts` returns `null` (callers fail open).
- **Logto**: `LOGTO_*` are runtime-only, never `NEXT_PUBLIC_`. Use one Logto instance per environment; staging GitHub secrets use the `_STAGING` suffix. Setup, guards and the var table: `docs/logto-auth-setup.md`. Token refresh also needs `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.

## Checklist

- [ ] Code reads it server-side, with a fallback or a clear error
- [ ] `.env.example` has a placeholder + comment
- [ ] Coolify staging and production set (runtime values)
- [ ] Build-time? Workflow `build-args:`/`secrets:` + Dockerfile `ARG`/secret mount (+ `ci` build step `env:` if needed)
- [ ] GitHub secret set for each Environment
- [ ] No secret behind a `NEXT_PUBLIC_` prefix
