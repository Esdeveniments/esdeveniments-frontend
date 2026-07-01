# LESSONS.md

Repo-specific gotchas worth sharing. Read this during research on any task here.

## Never `waitUntil: "networkidle"` in an e2e against a deployed build

`load_more_with_filters.spec.ts` did `page.goto(..., { waitUntil: "networkidle" })`. Locally it passed; against the Vercel preview it timed out `page.goto` at 45s **every** retry, hard-failing the required E2E gate and blocking every develop PR — even a docs-only one. The cause isn't the test's data or mocks (that spec fully mocks `/api/events`): analytics, ads and Sentry keep the network busy on a deployed build, so "networkidle" (500ms of silence) never fires. Use `waitUntil: "domcontentloaded"` plus an explicit auto-waiting assertion for the element you need (`expect(getByTestId(...))`), the way `home.flow.spec.ts` does reliably. For a mid-test settle after an action, bound it: `page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {})`, never an unbounded wait. Grep `e2e/` for `networkidle` before trusting the gate.

## A test that skips on its own failure mode is worse than no test

The image-proxy e2e tests skipped on any 502 (`test.skip("Test image service unavailable")`). When the dispatcher broke and 502'd every image, the suite read it as a flaky upstream and shipped green — for weeks (the May 2026 autoSelectFamily regression). If a test exists to catch failure X, it must **fail** on X, never skip. Retry to absorb genuine flakiness, then fail once retries are exhausted. Before trusting a green e2e run, grep for `if (status >= 500) test.skip` shapes.

## `yarn build` does NOT run `prebuild`

Yarn 4 (Berry) dropped automatic `pre*`/`post*` lifecycle scripts — npm runs them, Yarn doesn't. `prebuild` generates `public/sw.js` and `public/robots.txt`, both gitignored. Every deploy path must invoke it explicitly: the Dockerfile/Coolify and CI already do; Vercel needs the `vercel.json` `buildCommand` (`yarn prebuild && yarn build`). The env-specific builds (`build:development|staging|production`) already chain prebuild. A bare `yarn build` ships without the service worker or robots.txt.

## Vercel previews are a preview, not production

Production runs on Coolify/Docker/Node 22; Vercel previews are a different runtime. Sharp is bundled via the Dockerfile and excluded on Vercel — the Sharp e2e test self-skips on `*.vercel.app`. Vercel previews also sit behind a 401 protection wall, so automated probes need the `x-vercel-protection-bypass` secret. A green Vercel preview does not prove production works; gate promotion to `main` on the Coolify/Docker path.

## Image-proxy/dispatcher bugs only surface through a real socket

`buildPinnedDnsDispatcher`'s `lookup` callback runs only when undici opens a real connection — autoSelectFamily (Happy Eyeballs, default since Node 20) calls it with `{ all: true }` and expects an array of records. Mocked-fetch unit tests never reach it. `test/pinned-dns-dispatcher.test.ts` fetches through a loopback server to exercise the real path; keep that style for any proxy or dispatcher change.

## Back-merge main hotfixes into develop the same day

main and develop diverge. A fix that lands directly on main (a hotfix) does not reach develop on its own, so develop can re-ship a bug main already fixed — and merging develop→main can even revert main's fix. This caused the Jun 11 2026 incident: `097e1275 fix(cache): scope Redis entries by build id` sat on main for weeks while develop kept the broken handler. The `branch-drift` CI workflow flags when main is ahead of develop on infra files (`cache-handler.mjs`, `next.config.js`, `Dockerfile`, `proxy.ts`). When you see that warning, back-merge before promoting.

## The Redis cacheHandler is self-hosted-only — and HTTP 200 ≠ rendered

`next.config.js` enables the Redis `cacheHandler` only off-Vercel (`isVercel ? {} : { cacheHandler }`). So localhost and Vercel can never reproduce cache-handler bugs; only Coolify (persistent Redis across deploys) can. Keys are scoped by `buildId` so a new build never reads a previous build's prerendered shell — a stale shell makes React's resume mismatch (`Expected the resume to render ...`), fall back to client rendering, and emit HTML with no SSR `<title>`/description/canonical. The page still returns 200, so assert metadata in the **raw** HTML, not the status code. See [docs/incidents/2026-06-11-coolify-redis-stale-prerender.md](docs/incidents/2026-06-11-coolify-redis-stale-prerender.md).

## Don't assert data-conditional UI in an e2e against uncontrolled live data

`place-page-explore-nav.spec.ts` asserted the place explore nav on `/barcelona` against whatever the backend held. Once #313 gated that nav on a place having `>= SITEMAP_MIN_EVENTS_FOR_EXPANSION` events, the e2e broke in any test-data environment (a place can legitimately fall below the threshold) and rotted as test events aged past "upcoming". A page that fetches its gating data **server-side** can't be made deterministic with Playwright route interception either (that only mocks browser requests). Test such logic at the layer that owns its inputs: a component test with controlled props (see `test/components/ui/placePageExploreNav.test.tsx`). Reserve e2e for critical journeys against **seeded** data.

## Never lower preview/test-env fidelity to make a test pass

It's tempting to drop a threshold (e.g. `SITEMAP_MIN_EVENTS_FOR_EXPANSION`) or relax gating in non-prod so a flaky test goes green. Don't: that makes the preview behave differently from production, which is the exact parity gap that caused the cache and image-proxy incidents. Fix the mis-layered test, not the environment. Environment parity is the asset.

## Places API cost is controlled in three layers — two of them are NOT in this repo

`/api/places/nearby` (Google `searchNearby`, billed per request) has its cost held down by three controls, and only the first lives in git:

1. **Code** — `lib/cache/redis-client.ts` + `lib/places/nearby-cache-key.ts` cache results in Redis keyed by `~1.1km-snapped` coordinates. This is a **separate Redis layer from `cache-handler.mjs`** on purpose: the Next handler scopes keys by `buildId` and wipes them every deploy, which is wrong for data that should outlive deploys. The app cache is deploy-independent (12h TTL) and fails open.
2. **Cloudflare WAF** (dashboard, zone `esdeveniments.cat`) — managed-challenge for SG/JP/CN bot traffic + a per-IP rate-limit on the endpoint.
3. **GCP quota** (`places.googleapis.com/SearchNearbyRequest`, project `esdeveniments-3`) — **50/day** consumer override. This is the hard ceiling. The €10 "budget" is only an alert, never a cap.

So if restaurants suddenly stop showing, or a request 429s, the cause may be the WAF or the quota — not the code. See [docs/incidents/2026-06-26-places-api-cost.md](docs/incidents/2026-06-26-places-api-cost.md).

## Never block DE / Hetzner / datacenter ASNs at the Cloudflare edge — that's the own origin

~40% of Cloudflare traffic shows country **DE** hitting `api.esdeveniments.cat` on SSR data paths (`/api/events`, `/api/places/regions/options`, …). That is **not** a bot — it's the Coolify box on **Hetzner** (ASN 24940, Germany) calling its own backend through Cloudflare on every render. A disabled "block non-ES" WAF rule already exists from a past attempt, and a Cloudflare AI assistant will recommend challenging datacenter ASNs (incl. 24940 / AWS). Applying either takes down SSR. Use *managed challenge* on named bot-source countries (SG/JP/CN), never *block* by geography/ASN, and always verify origin egress before any country/ASN edge rule.

## Behind Coolify/Traefik, `request.nextUrl.origin` is the container's internal bind

In a route handler on the self-hosted box, `request.nextUrl.origin` (and `request.url`) is `https://0.0.0.0:3000`, **not** the public host — Next sees the internal bind, not what the browser used. This silently broke the Logto OIDC `redirect_uri` on the first preview deploy: it pointed at `0.0.0.0:3000/api/auth/callback`, which the IdP rejects (and tests on localhost never caught it, because there the bind *is* the public origin). Curiously, the same value is correct inside `proxy.ts` (middleware sees the real host), so the bug only bites route handlers.

Rule: any externally-facing URL built in a route handler (OAuth redirect URIs, post-logout URIs, absolute links in emails/webhooks) must derive the origin from `x-forwarded-host` / `x-forwarded-proto`, not `nextUrl.origin`. Use `getRequestOrigin()` in `lib/auth/logto.ts`. It's safe to trust the forwarded headers because the proxy overwrites client-supplied ones, and Logto's exact-match redirect allowlist is the real gate. This can only be caught against a real proxied deployment — the `prod-arch-smoke` localhost build can't see it; the post-deploy smoke in `deploy-coolify.yml` asserts the deployed sign-in `redirect_uri` matches `DEPLOY_URL`.

## The service worker must never cache `/api/auth/*` — a stale cache outlives logout

Logout looked broken on the first Logto preview: after sign-out the navbar stayed logged-in and `/api/auth/me` kept returning 200 with the user. The cookies were actually cleared (a `curl` and a `?cb=` cache-buster both returned 401) — the lie was in the **service worker**. The catch-all `/api/` `StaleWhileRevalidate` route in `public/sw-template.js` cached `/api/auth/me`; it only gates on status 200 and ignores the route's `Cache-Control: no-store` (the `respectCacheControlPlugin` is wired into the pages cache, not the API cache). So the SW served the logged-in response from before logout. `/api/auth/sign-out` likewise landed in the pages cache as a navigation. Note `cache: 'no-store'` on a `fetch` does NOT bypass the SW — that flag only touches the HTTP cache, so the symptom survives a hard fetch and only `curl` (no SW) tells the truth.

Fix: a `NetworkOnly` route for `/api/auth/*` registered **before** the navigation and catch-all `/api/` routes (Workbox is first-match-wins). Any future auth-state or per-user endpoint needs the same treatment — never let it fall into a caching strategy. `test/service-worker.test.ts` asserts the auth route exists and is ordered before the catch-all. Generated `public/sw.js` is gitignored; edit the template and run `yarn prebuild`.

## The CSRF origin allowlist makes `/api/favorites` a localhost-only false green

The favorites POST is CSRF-guarded by an origin allowlist that includes `localhost:3000` in dev. So on localhost the write passes; it only **403s on a non-localhost / non-www host** — i.e. a Coolify PR preview or staging. Same shape as the proxy-origin bug: the environment that's convenient to test on is exactly the one that can't reproduce the failure. Test any origin/CSRF-gated write (favorites, and future authed mutations) on the Coolify preview, and if a POST 403s only off-localhost, suspect the allowlist host set, not the client. Manual runbook: `docs/logto-auth-setup.md`.

## `NEXT_PUBLIC_*` are baked at build (from GitHub) — not read from Coolify at runtime

The prebuilt-image deploy (PR #371) builds the image in GitHub Actions and runs it in Coolify, so env vars split in two: `NEXT_PUBLIC_*` are inlined **at build** from the **GitHub** environment secrets; runtime secrets (`HMAC_SECRET`, `REDIS_URL`, `STRIPE_*`, …) are read **at runtime** from **Coolify**. The `getApiUrl`/`getApiOrigin` "indirect lookup" in `utils/api-helpers.ts` was meant to keep `NEXT_PUBLIC_API_URL` runtime-readable, but it does **not** — Turbopack still inlines it (grep `/app/.next/server` and you'll find literal copies). So for a Docker-Image app the Coolify `NEXT_PUBLIC_*` values are dead; GitHub's are authoritative.

On 2026-06-27 the GitHub `staging` secret `NEXT_PUBLIC_API_URL` was missing the `/api` suffix → every fetch hit `/events` (→ 500) → `fetchEventsExternal` swallowed it into an empty list → blank events with HTTP 200 and **no logs** (`removeConsole` had stripped the error; now fixed to keep `console.error`). The Coolify-built (dockerfile) staging app was fine because its build bakes Coolify's own correct value, which hid the mismatch. Rules: GitHub secrets are the source of truth for `NEXT_PUBLIC_*` in image builds; `NEXT_PUBLIC_API_URL` must include `/api` (backend serves `/api/events`); the prod `:main` build uses **repo-level** secrets (there is no `production` GH environment) so verify `https://api.esdeveniments.cat/api` before cutover; confirm a baked value with `docker exec <c> sh -c "grep -rhoE 'https://api[a-zA-Z0-9._/-]*' /app/.next/server | sort -u"`. The post-deploy smoke test now asserts `/api/events` returns data so this can't ship silently again. See [docs/ci-build-push-migration.md](docs/ci-build-push-migration.md).
