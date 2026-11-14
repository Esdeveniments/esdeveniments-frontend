---
name: service-worker-updates
description: How to change the Workbox service worker (caching routes, offline page, update lifecycle, push notifications). Use when editing public/sw-template.js, adding or changing a SW cache rule, debugging stale pages/API responses served by the SW, offline behavior, or when public/sw.js looks wrong. Edit the template, never public/sw.js, then run yarn prebuild.
---

# Service worker updates

## Generation

```text
public/sw-template.js → scripts/generate-sw.mjs (yarn prebuild) → public/sw.js
```

- `public/sw.js` is build output: never edit or commit it.
- `generate-sw.mjs` copies the Workbox runtime (the `workbox-*` devDependencies, pinned to one version) into `public/static/workbox-v<version>/` (gitignored, under `/static` so `proxy.ts` skips it) and replaces three placeholders:
  - `{{API_ORIGIN}}`: origin of `NEXT_PUBLIC_API_URL`, or of `apiUrl` in `config/api-defaults.json` when the env var is unset.
  - `{{BUILD_VERSION}}`: `BUILD_VERSION` → `Date.now()`. It makes `sw.js` change on every deploy, so browsers install the new SW.
  - `{{WORKBOX_PATH}}`: `/static/workbox-v<version>`, used by `importScripts` and `workbox.setConfig({ modulePathPrefix })`.
- `{{API_ORIGIN}}` and `{{BUILD_VERSION}}` use `String.replace`, which replaces only the **first** match, so use each once. `{{WORKBOX_PATH}}` uses `replaceAll`.
- To upgrade Workbox, bump every `workbox-*` devDependency to the same version; a new module needs adding to `WORKBOX_MODULES` in the script.
- `yarn dev` and `yarn build` don't run prebuild; `build:development|staging|production` do. After editing the template: `yarn prebuild`, then restart dev.

## Template layout

- Loads the self-hosted Workbox with `importScripts("{{WORKBOX_PATH}}/workbox-sw.js")`; `workbox-sw` loads `.dev.js` modules on localhost and `.prod.js` elsewhere. If `importScripts` throws, the new SW fails to install (the old one, if any, stays). `if (!self.workbox)` only covers a script that loads but doesn't define `self.workbox`; it then registers a no-op SW. Keep new code inside the `else` branch.
- Precaches `/offline` and `/static/css/offline.css`; `cleanupOutdatedCaches()` removes old precaches.
- Routes use `workbox.routing.registerRoute(...)` and `new workbox.strategies.X(...)` directly. The first matching route wins, so order matters.

## Routes (in order)

Before any Workbox route, a plain `fetch` listener calls `stopImmediatePropagation()` for Next RSC requests (`RSC: 1` header or `_rsc` param), so they bypass the SW entirely. Proxying the Flight stream through the SW broke client navigations on iOS Safari ("FetchEvent.respondWith received an error: TypeError: Load failed"). Keep it above the first `registerRoute`/`precacheAndRoute`: Workbox adds its own listener there.

| Match | Strategy | Cache name | Expiry |
| --- | --- | --- | --- |
| `/api/auth/*`, `/api/favorites` | NetworkOnly | – | – |
| Navigations (`request.mode === "navigate"`) | NetworkFirst (uses and caches the navigation preload response) + `BroadcastUpdatePlugin` + skip `private`/`no-store`; offline page on failure | `esdeveniments-pages-cache` | 50 / 7 d |
| Google ads/analytics, Sentry | NetworkOnly | – | – |
| `tiles.openfreemap.org` (listing map tiles, glyphs, sprites) | NetworkOnly (browser HTTP cache only) | – | – |
| style, script, worker, font | CacheFirst | `esdeveniments-static-assets-cache` | 100 / 30 d |
| images | StaleWhileRevalidate | `esdeveniments-images-cache` | 200 / 7 d |
| `/api/events`, `/api/events/categorized` | StaleWhileRevalidate | `esdeveniments-events-api-cache` | 50 / 10 min |
| `/api/news`, `/api/news/*` | StaleWhileRevalidate | `esdeveniments-news-api-cache` | 30 / 3 min |
| `/api/image-proxy*` | NetworkFirst (5 s timeout) | `esdeveniments-image-proxy-cache` | 100 / 7 d |
| `/api/users?q=` (profile search suggestions) | NetworkOnly (one URL per typed query) | – | – |
| other `/api/*` | StaleWhileRevalidate | `esdeveniments-local-api-cache` | 50 / 24 h |
| `url.origin === "{{API_ORIGIN}}"` | StaleWhileRevalidate | `esdeveniments-external-api-cache` | 100 / 30 min |
| anything else (`setDefaultHandler`) | NetworkFirst | `esdeveniments-default-cache` | 50 / 24 h |

Service-worker TTLs are set on purpose and don't always match the route's `s-maxage` (events: 10 min in the SW vs 30 min on `/api/events`; news: 3 min vs 10 min on `/api/news`), even where template comments say "matches server cache TTL". Check both when you change either.

Caches store only `200`s (`CacheableResponsePlugin({ statuses: [200] })`): opaque cross-origin responses (status `0`) each count several MB against the storage quota. The page, API and default caches also run `respectCacheControlPlugin`, so a response marked `private` or `no-store` is never stored.

**Any new per-user or auth endpoint must be added to the NetworkOnly route at the top.** The `/api/*` catch-all caches by URL and ignores cookies, so it once kept users "logged in" after logout (see LESSONS.md). Sending `no-store` now also keeps it out of the SW cache, but NetworkOnly is still required: it stops the SW from serving an entry stored before the header was added.

## Offline

The navigation route catches network errors and returns `cache.match("/offline")` from the precache. `setCatchHandler` does the same for `document` requests that other routes fail. The page is `app/[locale]/offline/` (served at `/offline` for the default locale).

## Update lifecycle

- `install` calls `skipWaiting()`, and a `{ type: "SKIP_WAITING" }` message does the same (sent by the registration script in `app/[locale]/layout.tsx`).
- `activate` calls `clients.claim()` and deletes `esdeveniments-pages-cache` (old HTML would cause hydration mismatches after a deploy) and `esdeveniments-local-api-cache` (hard-coded name, so a Workbox suffix bump doesn't clear it).
- `push` and `notificationclick` handle web push; only same-origin relative URLs from the payload are opened.

## Adding a cache rule

1. Add a `registerRoute` in the template, above any broader route that would match first.
2. Use a cache name starting with `esdeveniments-`, an `ExpirationPlugin` (`maxEntries` + `maxAgeSeconds`) and `CacheableResponsePlugin({ statuses: [200] })` like the neighbours (plus `respectCacheControlPlugin` for same-origin API data).
3. Set `matchOptions: { ignoreVary: true }`. Next responses vary on `rsc`, `next-router-state-tree`, `next-router-prefetch` and similar headers; without it the same URL misses the cache or is stored many times.
4. If old entries must go on deploy, delete the cache in `activate`.
5. `yarn prebuild`, restart, and check DevTools › Application › Service Workers and Cache Storage.

## Files

- `public/sw-template.js` (edit this), `scripts/generate-sw.mjs`, `config/api-defaults.json`
- `app/[locale]/offline/`, `app/[locale]/layout.tsx` (registration)
