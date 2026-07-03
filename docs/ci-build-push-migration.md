# Build in CI, deploy prebuilt image (Coolify)

The Next.js build used to run on the Coolify host (`build_pack: dockerfile`,
no dedicated build server). That host also runs prod + staging + the backends +
databases on 4 vCPUs, so every on-server build starved prod of CPU and caused
timeouts/500s during deploys.

This change moves the build to a GitHub runner. `deploy-coolify.yml` now builds
the image and pushes it to GHCR (`build-and-push` job); Coolify deploys that
prebuilt image instead of building on the host. The Dockerfile and
`output: "standalone"` are unchanged.

## Status (2026-07-03)

- **Staging: cut over.** `esdeveniments-staging` (`nykpqplcbakwtuzezzuet80d`,
  `build_pack: dockerfile`) is disabled. `staging.esdeveniments.cat` and
  `COOLIFY_WEBHOOK_URL_STAGING` now point at the Docker Image app
  `ic2hbmmww2c64e5ugmg6j27t`.
- **Prod: half cut over, mind the gap.** `COOLIFY_WEBHOOK_URL` now points at
  the Docker Image app `g110g13khtoev6lvlzwcxad3` (verified healthy, serving
  real event data, `BUILD_VERSION` removed), but `www.esdeveniments.cat` still
  resolves to the old `ohrtinmo1t8sz798wrq1gav3`.

  **Until the domain moves too, every push to `main` will fail its CI health
  gate.** The webhook now deploys the new app, but `deploy-coolify.yml` polls
  `https://www.esdeveniments.cat/api/health` for the new commit SHA — which
  lands on the new app, not on the domain the workflow checks. Expect a
  `::error::Container did NOT swap` failure (after the ~15 min timeout) on the
  next `main` push, skipping the Cloudflare purge + smoke tests, even though
  the underlying deploy to the new app is fine. This resolves itself the
  moment the domain moves over; until then, don't debug that failure as a real
  incident. Move `www.esdeveniments.cat` to `g110g13khtoev6lvlzwcxad3` (and
  disable `ohrtinmo1t8sz798wrq1gav3`) to finish the cutover and clear this.

## One-time setup (do these before merging the workflow)

### 1. GitHub secrets for the build

The build inlines `NEXT_PUBLIC_*` at build time, so they must exist in GitHub.
Most are already repo-level secrets. Add the gaps:

**Repo-level** (`Settings → Secrets → Actions`):
- `NEXT_PUBLIC_API_URL` = `https://api.esdeveniments.cat/api` — repo-level is the
  **production** build value (there is no GitHub `production` environment, so the
  `:main` build falls back to repo-level). It MUST be the prod API **with `/api`**.
  Verify this before cutting prod over to the image, or prod goes silently
  events-blank exactly like staging did on 2026-06-27.
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — copy from the Coolify prod app env. Without it
  the push CTA is missing in the image.

**`staging` environment** (these override the repo-level prod values on the
`develop` build, since `NEXT_PUBLIC_*` are baked per environment):
- `NEXT_PUBLIC_API_URL` = `https://api-preproduction.esdeveniments.cat/api` — **must include the `/api` suffix** (the backend serves `/api/events`; bare `/events` → 500). Omitting it caused a silent events-blank outage on 2026-06-27 (see the warning below).
- `NEXT_PUBLIC_SITE_URL` = `https://staging.esdeveniments.cat`
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = copy from the Coolify staging app env
- Any other `NEXT_PUBLIC_*` that differs from prod for staging.

> **⚠️ These are baked into the image at BUILD time — Coolify runtime values are ignored.**
> `NEXT_PUBLIC_*` are inlined by the build, and the "indirect lookup" in
> `utils/api-helpers.ts` (`getApiUrl`/`getApiOrigin`) does **not** actually escape
> that inlining — Turbopack still folds it (verified: literal copies in
> `.next/server`). So whatever these GitHub secrets hold **at build time** is what
> ships; the matching Coolify env vars do nothing for the image app. Get one wrong
> and it used to fail **silently** — `fetchEventsExternal` returns an empty list and
> PPR still returns HTTP 200, and `removeConsole` stripped the error log too. Three
> guards now catch this: `console.error`/`console.warn` are kept in production
> (`removeConsole: { exclude: ['error', 'warn'] }`), the post-deploy smoke test
> asserts `/api/events` returns data, and you can inspect the baked value with
> `docker exec <container> sh -c "grep -rhoE 'https://api[a-zA-Z0-9._/-]*' /app/.next/server | sort -u"`.

**Analytics on non-prod:** a GitHub *environment* secret falls back to the
repo-level (prod) secret when unset, so the staging image inlines the prod
analytics IDs. That no longer pollutes prod analytics, because GA and Auto Ads
are gated to the production host at runtime (see `app/GoogleScripts.tsx`, PR
#374): they only fire on `www.esdeveniments.cat`, never on staging or previews.
So you do not need to clear those IDs in the staging environment. (Setting a
GitHub secret to an empty string isn't even possible — the API rejects it with
HTTP 422.)

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

This was done by standing up a **new** Docker Image app next to each old
Dockerfile app rather than converting in place (staging: `ic2hbmmww2c64e5ugmg6j27t`
replacing `nykpqplcbakwtuzezzuet80d`; prod: `g110g13khtoev6lvlzwcxad3` replacing
`ohrtinmo1t8sz798wrq1gav3`). Either approach works; if you convert in place
instead, the same steps apply to the existing app UUID.

1. Change the source from **Dockerfile / GitHub** to **Docker Image**:
   - prod → `ghcr.io/esdeveniments/esdeveniments-frontend:main`
   - staging → `ghcr.io/esdeveniments/esdeveniments-frontend:develop`
2. Add the GHCR pull credential (if the package is private).
3. Copy the old app's env vars over. **If you use Coolify's bulk copy/clone,
   it also copies `BUILD_VERSION` — delete it afterward.** The image already
   bakes `BUILD_VERSION=<git sha>` at build time, and a runtime copy shadows
   it, breaking the `/api/health` version gate the deploy workflow polls. This
   bit both the staging and prod cutovers on 2026-07-03; it's not excluded
   automatically by any copy method.
4. Deploy trigger: a **Docker Image** app does not auto-deploy from git pushes
   the way a Dockerfile/GitHub app does, so confirm the workflow's
   `COOLIFY_WEBHOOK_URL` is this app's **Deploy Webhook** (Coolify → app →
   Webhooks, the "Deploy Webhook (auth required)" URL — not the app's public
   FQDN, and not the "Manual Git Webhooks" section further down the same
   page). The deploy job POSTs it explicitly, which makes Coolify re-pull the
   moving tag (`:main` / `:develop`) and swap the container. After the first
   prebuilt deploy, verify `/api/health` reports the new commit — if the tag
   didn't re-pull, enable "force pull" / check the webhook points at the right
   app.
5. Verify on the app's own sslip.io URL *before* moving the real domain over:
   `/api/health` returns 200, `/api/events?size=1` returns real content (not
   `[]`), and (once Logto is live on that branch) `/api/auth/sign-in` 307s to
   the IdP. Only then move the domain and flip the webhook secret, so a bad
   cutover never touches live traffic.
6. If you're driving this via an AI agent against the Coolify MCP/API: the
   token backing it may have read + env-var-write scope but lack `deploy` and
   application `write` scope. Manual redeploys and domain/fqdn changes then
   need to happen in the dashboard — the agent can prepare and verify
   everything else.

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

## Make the API base runtime-controlled (`API_URL`)

`NEXT_PUBLIC_API_URL` is baked into the image at build time (Turbopack inlines it;
the `getApiUrl` "indirect lookup" does not prevent this). So for a Docker-Image app
the Coolify `NEXT_PUBLIC_API_URL` is ignored, and a wrong build value silently breaks
data fetches (the 2026-06-27 outage).

`getApiUrl`/`getApiOrigin` now prefer a **non-public `API_URL`**. Non-public vars are
never inlined (same as `HMAC_SECRET`), so `API_URL` is read at runtime and the Coolify
value always wins. Resolution order: `API_URL` (runtime) → `NEXT_PUBLIC_API_URL`
(build-time fallback) → JSON default.

To adopt:
1. Set `API_URL` in each Coolify frontend app (runtime) to the backend base —
   staging `https://api-preproduction.esdeveniments.cat/api`, prod
   `https://api.esdeveniments.cat/api`.
2. Leave `NEXT_PUBLIC_API_URL` as the build-time fallback (still used for build-time
   ISR prerender).
3. Verify: `docker exec <container> printenv API_URL` and confirm `/api/events`
   returns data.

This makes dynamic fetches immune to a wrong build value; the post-deploy smoke test
still guards the build-time prerender path.
