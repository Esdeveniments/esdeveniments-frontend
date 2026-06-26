# Build in CI, deploy prebuilt image (Coolify)

The Next.js build used to run on the Coolify host (`build_pack: dockerfile`,
no dedicated build server). That host also runs prod + staging + the backends +
databases on 4 vCPUs, so every on-server build starved prod of CPU and caused
timeouts/500s during deploys.

This change moves the build to a GitHub runner. `deploy-coolify.yml` now builds
the image and pushes it to GHCR (`build-and-push` job); Coolify deploys that
prebuilt image instead of building on the host. The Dockerfile and
`output: "standalone"` are unchanged.

## One-time setup (do these before merging the workflow)

### 1. GitHub secrets for the build

The build inlines `NEXT_PUBLIC_*` at build time, so they must exist in GitHub.
Most are already repo-level secrets. Add the gaps:

**Repo-level** (`Settings → Secrets → Actions`):
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — copy from the Coolify prod app env. Without it
  the push CTA is missing in the image.

**`staging` environment** (these override the repo-level prod values on the
`develop` build, since `NEXT_PUBLIC_*` are baked per environment):
- `NEXT_PUBLIC_API_URL` = `https://api-preproduction.esdeveniments.cat`
- `NEXT_PUBLIC_SITE_URL` = `https://staging.esdeveniments.cat`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = copy from the Coolify staging app env
- Any other `NEXT_PUBLIC_*` that differs from prod for staging.

`NEXT_PUBLIC_CONTACT_EMAIL` is not set anywhere today (builds empty); add it if
you want it inlined.

Runtime-only vars (Redis, Turso, Stripe webhooks, VAPID private key, Cloudflare,
Places, revalidate secret) stay in Coolify as container env. The prebuilt image
does not bake them, so nothing to copy.

### 2. GHCR package visibility

The image is `ghcr.io/esdeveniments/esdeveniments-frontend`. Keep it **private**
and add a read-only pull credential in Coolify, or make the package public to
skip pull auth. Private is recommended.

### 3. Coolify app reconfiguration (prod and staging frontend apps)

For each frontend app (prod `ohrtinmo1t8sz798wrq1gav3`, staging
`nykpqplcbakwtuzezzuet80d`):
1. Change the source from **Dockerfile / GitHub** to **Docker Image**:
   - prod → `ghcr.io/esdeveniments/esdeveniments-frontend:main`
   - staging → `ghcr.io/esdeveniments/esdeveniments-frontend:develop`
2. Add the GHCR pull credential (if the package is private).
3. **Remove `BUILD_VERSION` from the app's runtime env vars.** The image bakes
   `BUILD_VERSION=<git sha>` at build time, and a runtime override would shadow
   it, breaking the `/api/health` version gate the deploy workflow waits on.
4. Keep the existing deploy webhook. It now triggers a pull-and-redeploy of the
   new tag instead of an on-host build.

## How it flows after migration

1. Push to `main`/`develop` → CI runs quality, unit, e2e (main).
2. `build-and-push` builds the image on the runner and pushes
   `:<branch>` + `:sha-<commit>` to GHCR.
3. `deploy` hits the Coolify webhook → Coolify pulls the new `:<branch>` image
   and swaps the container. No build on the host.
4. The deploy job's health gate confirms `/api/health` reports the new commit,
   then purges Cloudflare and runs smoke tests (unchanged).

## Rollback

If a prebuilt deploy misbehaves, switch the Coolify app source back to
Dockerfile/GitHub in the dashboard (one toggle). Revert the workflow change via
git. No data is touched; this is all build/deploy plumbing.

## Not covered here (follow-ups)

- The **backend** (`esdeveniments-back-pro`) also builds on the host and is the
  app that actually fell over on 2026-06-26. It needs the same treatment in its
  own repo.
- Right-size the frontend container memory (currently 1.5 GB, OOM-prone) and
  consider moving staging + pre environments off the prod box.
