---
name: env-variable-management
description: How to add, rename or remove an environment variable in esdeveniments.cat so code, .env.example, Coolify, the deploy workflow/Dockerfile and GitHub secrets stay in sync. Use when code reads a new process.env value, when a NEXT_PUBLIC_* value is missing in production, or when touching .env.example, Dockerfile ARGs, deploy-coolify.yml secrets, Sentry, Redis or Logto config.
---

# Environment variable management

A variable missing from one location breaks a build or crashes the container. Update every location that applies. Basics (local env files, required secrets): AGENTS.md › Commands; hosting: AGENTS.md › Hosting and deploys.

`.env.example` is the inventory of every variable and its purpose. It is the only tracked env file; `.env`, `.env.local`, `.env.development`, `.env.staging` and `.env.production` are gitignored.

## How values reach the app

Coolify does **not** build. `deploy-coolify.yml` builds a Docker image in GitHub Actions, pushes it to GHCR, then pins Coolify to the `sha-<commit>` tag. So:

| Kind | Read when | Comes from |
| --- | --- | --- |
| `NEXT_PUBLIC_*` | Build time (inlined in the client bundle) | GitHub secret → workflow `build-args:` → Dockerfile `ARG` + `ENV` in the builder stage |
| Build-time private secret (`HMAC_SECRET`, `BACKEND_SERVICE_SECRET`, `SENTRY_AUTH_TOKEN`) | Build time (prerender, source maps) | GitHub secret → workflow `secrets:` → Dockerfile `RUN --mount=type=secret,...` |
| Server-only runtime value (`LOGTO_*`, `STRIPE_*`, `REDIS_URL`, `TURSO_*`, `API_URL`, `SENTRY_DSN`, …) | Runtime, by the Node server | Coolify → Application → Environment |
| Workflow-only (`COOLIFY_TOKEN`, `COOLIFY_WEBHOOK_URL`, `CLOUDFLARE_*`, `REVALIDATE_SECRET` for post-deploy calls) | During the workflow | GitHub secret → step `env:` |

The build secrets are also needed at runtime, so set them in Coolify too. The `ci` job's "Build Next.js application" step gets `HMAC_SECRET`, `BACKEND_SERVICE_SECRET`, `NEXT_PUBLIC_API_URL` and `SENTRY_AUTH_TOKEN` as step `env:`; add a new build-time value there as well if the CI build needs it.

GitHub secrets resolve per Environment (`production` on `main`, `staging` otherwise) and fall back to repo-level values. The workflow blanks `NEXT_PUBLIC_GOOGLE_ANALYTICS`/`_ADS` on non-`main` builds so prod IDs never land in staging.

## Adding a variable: the five locations

| # | Location | What to do |
| --- | --- | --- |
| 1 | Code | Read `process.env.X` on the server. Optional → safe fallback; required → fail clearly where it is used. Never prefix a secret with `NEXT_PUBLIC_`. |
| 2 | `.env.example` (+ your local `.env.local`) | Add a placeholder and a one-line comment in the right section. Never a real value. |
| 3 | Coolify (staging and production apps) | Runtime values. Redeploy to apply. |
| 4 | `.github/workflows/deploy-coolify.yml` (+ `Dockerfile`) | Build-time values only: add to `build-args:` and a matching `ARG`/`ENV` in the Dockerfile builder stage, or to `secrets:` plus a `--mount=type=secret` for private ones. |
| 5 | GitHub secrets | Value for each Environment (`staging`, `production`) or repo-level. |

A `NEXT_PUBLIC_*` value missing from step 4 is `undefined` in the client bundle even if Coolify has it.

## Local files

Copy `.env.example` to `.env.local` and fill in real values. `next dev` reads `.env.development` and `.env.local`; the `build:<env>` / `start:<env>` scripts load `.env.<env>` with `env-cmd`. With no backend secret the app still renders, with empty data.

## Notes on specific services

- **Backend**: `NEXT_PUBLIC_API_URL` is the public base (ends in `/api`); server-only `API_URL` overrides it on the server (`getApiUrl()` in `utils/api-helpers.ts`). The default comes from `config/api-defaults.json`.
- **Sentry**: the browser (`instrumentation-client.ts`) and edge (`sentry.edge.config.ts`) use `NEXT_PUBLIC_SENTRY_DSN` (build arg). The Node server (`sentry.server.config.ts`) uses `SENTRY_DSN` (Coolify runtime). `SENTRY_ORG`, `SENTRY_PROJECT` (build args) and `SENTRY_AUTH_TOKEN` (build secret) upload source maps.
- **Redis**: optional. `REDIS_URL` wins; otherwise a plain `redis://` URL is built from `REDIS_HOST`, `REDIS_PORT` (6379), `REDIS_USERNAME`, `REDIS_PASSWORD` (TLS needs `REDIS_URL`). With neither, `cache-handler.mjs` uses an in-process LRU and `lib/cache/redis-client.ts` returns `null` (callers fail open).
- **Logto**: `LOGTO_*` are runtime-only, never `NEXT_PUBLIC_`. Use one Logto instance per environment; staging GitHub secrets use the `_STAGING` suffix. Setup, guards and the var table: `docs/logto-auth-setup.md`. Token refresh also needs `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN`.

## Checklist

- [ ] Code reads it server-side, with a fallback or a clear error
- [ ] `.env.example` has a placeholder + comment
- [ ] Coolify staging and production set (runtime values)
- [ ] Build-time? Workflow `build-args:`/`secrets:` + Dockerfile `ARG`/secret mount (+ `ci` build step `env:` if needed)
- [ ] GitHub secret set for each Environment
- [ ] No secret behind a `NEXT_PUBLIC_` prefix
