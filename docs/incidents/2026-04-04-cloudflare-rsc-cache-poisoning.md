# Incident: Cloudflare RSC Cache Poisoning (Apr 4, 2026)

## Summary

After calling `/api/revalidate` to purge caches, Cloudflare cached a Next.js RSC flight response (`text/x-component`) for `/es` and served it to all visitors instead of HTML. Users visiting `https://www.esdeveniments.cat/es` saw raw JSON-like RSC payload:

```
0:{"tree":{"name":"","param":null,...},"staleTime":300,"buildId":"ml3sMP0MH4akTvHr_s71Z"}
```

The issue self-resolved after ~30 minutes when the `s-maxage=1800` TTL expired, but could recur on any cache purge.

## Impact

| Metric          | Normal    | During Incident                                  |
| --------------- | --------- | ------------------------------------------------ |
| `/es` response  | HTML page | Raw RSC flight payload (`text/x-component`)      |
| User experience | Normal    | Blank page with JSON-like text                   |
| SEO             | Normal    | Googlebot would index RSC payload instead of HTML |
| Duration        | —         | ~30 minutes (self-resolved via TTL expiry)       |
| Pages affected  | —         | `/es` confirmed; other locale paths were OK      |

## Timeline

| Time            | Event                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------- |
| ~11:30 UTC      | Called `POST /api/revalidate` with tags `["places", "regions", "cities"]`                    |
| ~11:30 UTC      | Cloudflare cache purged for `/es/`, `/ca/`, `/api/places`, `/api/regions`, `/api/cities`     |
| ~11:30-11:31    | First request to `/es` was an RSC client navigation (`RSC: 1` header)                       |
| ~11:31 UTC      | Cloudflare cached the RSC response (`text/x-component`, 295 bytes) for `/es`                |
| ~11:31-12:01    | All visitors to `/es` received cached RSC payload instead of HTML                           |
| ~12:01 UTC      | `s-maxage=1800` expired; Cloudflare fetched fresh HTML response; issue self-resolved         |
| 13:22 UTC       | Investigated; confirmed `cf-cache-status: HIT` with `content-type: text/x-component`        |
| 13:59 UTC       | Revalidation re-run confirmed `/es` now returns `text/html` correctly                       |
| 2026-04-20      | This doc backfilled into the repo (batch commit, no code change alongside it)               |
| 2026-07-31 14:34 UTC | **Recurred on `/en`** — the `isRscRequest` fix below was never actually committed (`git log -S"isRscRequest"` had zero hits). Implemented for real in `proxy.ts` (commit `0cdf6f8e`) + regression test in `test/proxy.test.ts`. Deployed correctly via CI. |
| 2026-07-31 19:01 UTC | An untracked Coolify deployment (no GitHub Actions run, no webhook, no API call) silently reverted the 14:34 fix — see "Recurrence #2" below. |
| 2026-08-01      | **Recurrence #2 discovered**: origin still served `public, s-maxage=1800` for RSC requests; the Cloudflare bypass rule added in response also turned out not to be firing. Both root-caused and fixed — see below. |

## Root Cause

### How Next.js RSC works

Next.js App Router uses two response types for the same URL:
- **HTML** (`text/html`): For full page loads (browser navigation, crawlers)
- **RSC flight** (`text/x-component`): For client-side navigations (sent when the browser includes an `RSC: 1` request header)

### Why Cloudflare cached the wrong response

1. `/api/revalidate` purged Cloudflare's cache for `/es/` prefix
2. The first request to refill the cache happened to be an RSC client navigation (with `RSC: 1` header)
3. The origin returned `text/x-component` with `Cache-Control: public, s-maxage=1800` (the same cache headers as HTML)
4. Cloudflare cached this response **without distinguishing** the `RSC` header
5. Subsequent HTML requests to `/es` received the cached RSC payload

### Why `Vary: RSC` doesn't fix this

The initial fix attempt was to add `Vary: RSC` so Cloudflare would maintain separate cache entries. However, **Cloudflare Free/Pro/Business plans only respect `Vary: Accept-Encoding`**. Custom headers in `Vary` are silently ignored. Adding `RSC` to the cache key requires Enterprise plan's custom cache key feature.

## Resolution

Set `Cache-Control: private, no-store` for RSC requests in `proxy.ts`:

```typescript
const isRscRequest = request.headers.get("RSC") === "1";

response.headers.set(
  "Cache-Control",
  isPersonalizedHtml || isRscRequest
    ? "private, no-store"
    : "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
);
```

This ensures:
- **HTML responses**: Cached by CDN (`s-maxage=1800`) — good for performance
- **RSC responses**: Never cached by CDN (`private, no-store`) — prevents poisoning

RSC responses are small (~300 bytes) and fast to generate, so CDN caching provides negligible benefit. The HTML responses are the ones that matter for cold loads, SEO, and TTFB.

## Prevention

1. **`proxy.ts` now detects RSC requests** via the `RSC: 1` header and excludes them from CDN caching (implemented 2026-07-31, see below — the original "16:07 UTC" fix never actually shipped)
2. **Regression test** in `test/proxy.test.ts` asserts `Cache-Control: private, no-store` for a request carrying `RSC: 1`

### Cloudflare Cache Rule Reminder

If modifying the Cloudflare cache rule for `www.esdeveniments.cat`, be aware that:
- Cloudflare doesn't vary cache by custom request headers (only `Accept-Encoding`)
- Any cached page URL can receive both HTML and RSC requests
- The cache rule should ideally exclude RSC responses, but since Cloudflare can't match on `RSC` header in Free/Pro plans, the server-side `private, no-store` approach is the correct solution
- **Cache Rules apply cumulatively, and where two rules set the same field (e.g. Cache Eligibility) for a matching request, the LAST matching rule in the ordered list wins** — not the first. A narrow bypass rule placed *above* a broad "cache everything" rule gets silently overridden. Any bypass rule (RSC, AI bots, `/_next/image`) must sit *below* the broad HTML-caching rule in the Cache Rules list.

## Recurrence #2 (2026-08-01): two independent bugs stacked

Reported again on `/en` ("weird text instead of the website"). Live reproduction (not assumption) found **two separate, unrelated bugs**, either of which alone would have caused this:

### Bug A: the 2026-07-31 fix never stayed deployed

`proxy.ts` commit `0cdf6f8e` built and deployed correctly via GitHub Actions at 14:25-14:35 UTC on 2026-07-31 (confirmed via `gh run list` + Coolify deployment log timestamps). But an untracked Coolify deployment at 19:01 UTC the same day — no GitHub Actions run, no webhook, no API call, `force_rebuild: false` — silently reverted production to pre-fix behavior. Confirmed live on 2026-08-01: sending the literal header `proxy.ts` checks for (`RSC: 1`) still got `Cache-Control: public, max-age=0, s-maxage=1800` back from origin, even though Next.js itself correctly returned `content-type: text/x-component` for the same request — proving the header reached the process but the `isRscRequest` code path was simply not present in the running binary.

Root cause: Coolify's `esdeveniments-production` app was configured with `docker_registry_image_tag: "main"` — a **floating** registry tag — with `health_check_enabled: true` (path `/`, 30s interval, 3 retries). CI already pushes an immutable `sha-<commit>` tag alongside `:main` (`.github/workflows/deploy-coolify.yml`, `build-and-push` job), but nothing used it. A health-check-triggered container restart recreates the container from whatever's locally cached under the `:main` tag, bypassing the deploy pipeline entirely — this box has prior history of the same class of bug (`3e1d8bc8` "clear zero-byte image cache files on boot", the Jul 7 crash incident in `cbd429df`).

**Fix:** after a successful image build, the `deploy` job in `.github/workflows/deploy-coolify.yml` PATCHes the Coolify app's `docker_registry_image_tag` to `sha-${{ github.sha }}` before triggering the deploy webhook. Emergency `skip_ci` deployments intentionally retain the currently configured tag, since no commit image was built to pin to. The app itself no longer references the floating `:main`/`:develop` tag — `build-and-push` still pushes it to the registry alongside the immutable `sha-<commit>` tag, so a future manual re-point back to it would revive this bug class, but a restart alone can no longer resurrect it.

### Bug B: the Cloudflare bypass rule was firing on the wrong side of an ordering conflict

Independent of Bug A: a fresh URL fetched with `RSC: 1` + `Accept: text/x-component`, then fetched again with a plain `Accept: text/html` (simulating a normal visitor), came back `cf-cache-status: HIT` with `content-type: text/x-component` — live reproduction of the poisoning, reproduced on demand on a URL created solely for this test.

The zone's Cache Rules, in order:

| Order | Rule | Action |
|---|---|---|
| 1 | RSC flight payloads — never cache | Bypass |
| 2 | Bypass cache for AI bots | Bypass |
| 3 | Cache HTML pages - regular traffic (non-bots) | Eligible for cache |
| 4 | Bypass cache for Next.js images | Bypass |

Rule 3 has no RSC or bot-UA exclusion and matches `/en` (and effectively any non-`/api/` HTML path). Per the Cache Rules last-match-wins semantics documented above, rule 3 overrode rules 1 and 2's bypass for any request that also matched rule 3 — meaning **both the RSC bypass and the AI-bot bypass had been silently inert** since rule 3 was added or last reordered.

**Fix:** reorder so "Cache HTML pages - regular traffic" is evaluated first (position 1), with all bypass rules below it.

## Lessons Learned

1. **CDN cache poisoning via response type mismatch** is a real risk with Next.js RSC + Cloudflare. Any CDN that doesn't vary by `RSC` header (or `Content-Type`) can serve the wrong response type.
2. **`Vary` header doesn't work on Cloudflare Free/Pro/Business** for custom headers — only `Accept-Encoding` is respected.
3. **Cache purges are a high-risk moment** — the first request to refill the cache determines what all users see. After purging, it's worth verifying the response `Content-Type`.
4. **Self-resolving ≠ safe** — the issue resolved after 30 min via TTL, but could have affected SEO (Googlebot indexing RSC payload) and user trust.
5. **RSC responses should never be CDN-cached** unless the CDN supports proper cache key differentiation (Enterprise Cloudflare or CloudFront with custom cache policy).
6. **A "Resolution" section in an incident doc is not proof the fix shipped.** This doc was backfilled 16 days after the incident in a batch commit unrelated to `proxy.ts`, and the described fix was never committed — the same bug recurred on `/en` three months later. Verify fixes described in incident docs against `git log -S` or the current file, don't trust the prose.
7. **A correct deploy is not proof the fix stays deployed.** A floating registry tag (`:main`) plus a health-check-triggered container restart can silently revert a correctly-shipped fix hours later, with no CI run, webhook, or API call in the audit trail. Pin deploys to immutable per-commit tags.
8. **A "Bypass cache" rule is not proof requests are bypassed.** Cloudflare Cache Rules are last-match-wins per field across the whole ordered list — a bypass rule sitting above a broad "eligible for cache" rule is silently overridden. Reproduce the actual `cf-cache-status` on a fresh URL before trusting a rule is doing anything.
