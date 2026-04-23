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
| 16:07 UTC       | Fix deployed to codebase (RSC requests get `private, no-store`)                              |

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

1. **`proxy.ts` now detects RSC requests** via the `RSC: 1` header and excludes them from CDN caching
2. **All proxy tests pass** (25/25) with the new logic

### Cloudflare Cache Rule Reminder

If modifying the Cloudflare cache rule for `www.esdeveniments.cat`, be aware that:
- Cloudflare doesn't vary cache by custom request headers (only `Accept-Encoding`)
- Any cached page URL can receive both HTML and RSC requests
- The cache rule should ideally exclude RSC responses, but since Cloudflare can't match on `RSC` header in Free/Pro plans, the server-side `private, no-store` approach is the correct solution

## Lessons Learned

1. **CDN cache poisoning via response type mismatch** is a real risk with Next.js RSC + Cloudflare. Any CDN that doesn't vary by `RSC` header (or `Content-Type`) can serve the wrong response type.
2. **`Vary` header doesn't work on Cloudflare Free/Pro/Business** for custom headers — only `Accept-Encoding` is respected.
3. **Cache purges are a high-risk moment** — the first request to refill the cache determines what all users see. After purging, it's worth verifying the response `Content-Type`.
4. **Self-resolving ≠ safe** — the issue resolved after 30 min via TTL, but could have affected SEO (Googlebot indexing RSC payload) and user trust.
5. **RSC responses should never be CDN-cached** unless the CDN supports proper cache key differentiation (Enterprise Cloudflare or CloudFront with custom cache policy).
