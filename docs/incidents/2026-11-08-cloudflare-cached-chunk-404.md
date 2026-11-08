# Incident: Cloudflare Cached a 404 for a New JS Chunk After Deploy (Nov 8, 2026)

## Summary

Right after release #722 reached production, www.esdeveniments.cat rendered as a bare, unstyled page (logo, language button, a giant spinner icon). The HTML returned 200, but the CSS and JS it referenced returned 404 from Cloudflare:

```
Refused to apply style from '/_next/static/chunks/23780idue2bxl.css' because its MIME type ('text/html') is not a supported stylesheet MIME type
GET /_next/static/chunks/3rvwdu1kj9ai6.js net::ERR_ABORTED 404 (Not Found)
```

The origin was healthy the whole time. Purging Cloudflare fixed it.

## Impact

| Metric        | Normal          | During incident                                      |
| ------------- | --------------- | ---------------------------------------------------- |
| Pages         | Styled, working | Unstyled and not interactive (cached HTML)           |
| Fresh HTML    | Working         | One JS chunk missing (`111_sgx6-63zu.js` cached 404) |
| Duration      | —               | ~27 min (14:03 → ~14:30 UTC)                         |
| `/api/health` | 200             | 200 (no alert)                                       |

## Timeline (UTC)

| Time        | Event                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13:54       | Deploy to Coolify starts for `7fb3aff1` (release #722)                                                                                              |
| 14:03:04    | `/api/health` reports the new commit; workflow purges Cloudflare (`purge_everything`, 200)                                                          |
| 14:03:05–09 | Old container still in the Traefik pool. Smoke tests and visitors refill Cloudflare with old HTML (old chunk names) and a 404 for a new-build chunk |
| 14:03:13    | Smoke tests pass (they check status codes and data, not assets)                                                                                     |
| ~14:27      | Reported down. `cf-cache-status: HIT`, `age ≈ 1500` on the 404 chunk; the same URL with a query string returns 200 from origin                      |
| ~14:30      | Cloudflare purged again; all assets on `/`, `/barcelona`, `/es` return 200                                                                          |

## Root cause

1. **Purge during the container overlap.** Coolify rolling updates keep the old container serving until the new one is healthy, plus its stop grace period (30 s by default). The deploy workflow purged as soon as `/api/health` returned the new commit once. During the overlap, Traefik still sent some requests to the old container, so Cloudflare re-cached old HTML and a 404 for a chunk that exists only in the new build.
2. **Cloudflare caches 404s on `/_next/static`.** The 404 carried `Cache-Control: private, no-store`, yet it was a cache `HIT` 25 minutes later. The `/_next/static` cache rule overrides the origin's cache headers for every status code, so a transient 404 lives as long as a real asset.
3. **Smoke tests didn't load assets.** A 200 page whose JS/CSS 404s passed every check.

## Resolution

Manual `purge_everything` once only the new container was answering.

## Prevention

- **Wait for the old container to leave** (`.github/workflows/deploy-coolify.yml`, end of "Wait for Coolify deployment to complete", every branch): continue only once 10 health checks in a row report the new commit (max 3 min). The purge and every asset check run after it.
- **Purge, verify assets, retry once** (production, "Purge Cloudflare CDN cache"): `scripts/check-static-assets.sh` loads every `/_next/static` JS/CSS referenced by `/` and `/barcelona` through Cloudflare. If any fails, purge again; if it still fails, the deploy fails.
- **Smoke tests check assets** on every deploy (staging and production) with the same script.
- **Cloudflare (manual, dashboard):** in the cache rule that matches `/_next/static`, under Edge TTL add a **Status Code TTL**: range `400`–`599` → **No store**. Hashed chunk names never change content, so only 200s should be cached. The CI token only has Cache Purge permission, so this can't be applied or checked from CI.

`deploymentId` was considered and not used: since Next 16.2 it makes the build ID constant, and `cache-handler.mjs` namespaces Redis keys by build ID, which would bring back [the stale prerender incident](./2026-06-11-coolify-redis-stale-prerender.md). It also doesn't stop a CDN from caching a 404.

## Lessons learned

- A CDN purge is only safe once one build version is answering.
- HTTP 200 on the HTML says nothing about its assets. Check what the page references.
- Cache rules that override origin headers apply to errors too unless status codes are scoped.
