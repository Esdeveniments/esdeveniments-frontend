# Incident: Coolify PR Preview Empty HTML / Streaming Errors (Apr 23, 2026)

## Summary

Coolify PR preview deployments (e.g., `pr-269.esdeveniments.cat`) serve pages with an empty `<main>` tag and no visible HTML content. All 5 React Suspense boundaries fail with `$RX` error calls (digest `3384162809`), meaning the streaming/SSR content never renders. Crawlers and SEO tools (orank.ai) see "only 50 characters of static text" despite the code working perfectly on localhost.

## Impact

| Metric               | Localhost        | PR Preview                                      |
| -------------------- | ---------------- | ----------------------------------------------- |
| `<h1>` tags          | 3 (in HTML)      | 0 (only in RSC flight data)                     |
| `<h2>` tags          | 10+              | 0                                               |
| `<main>` content     | 19KB real HTML   | Empty (template placeholders only)              |
| `$RX` stream errors  | 0                | 5 (all Suspense boundaries)                     |
| SEO visibility       | Full             | Nav bar only (~50 chars)                         |
| orank.ai score       | N/A              | 68/100 (C) — "invisible to AI crawlers"          |

## Root Cause

Coolify PR preview containers do not have `NEXT_PUBLIC_API_URL` (or `HMAC_SECRET`) configured as runtime environment variables. The Dockerfile passes `NEXT_PUBLIC_*` vars as build ARGs, but runtime secrets like `HMAC_SECRET` must come from Coolify env vars at container start — they are NOT baked into the image.

Without a valid `NEXT_PUBLIC_API_URL` + `HMAC_SECRET`, all server-side data fetches fail:
1. `fetchEventsInternal` and similar calls error out
2. React Suspense boundaries catch the errors and emit `$RX` error markers
3. The page serves only the static shell (nav bar) with empty `<main>`
4. The actual page content exists only in RSC flight data (JS payloads), invisible to crawlers

## How to Verify

```bash
# Check for real HTML elements (should be >0)
curl -sS "https://pr-XXX.esdeveniments.cat/" | grep -c '<h1\|<h2'

# Check for streaming errors (should be 0)
curl -sS "https://pr-XXX.esdeveniments.cat/" | grep -c 'RX('

# Compare with localhost (should have h1, h2, full content)
curl -sS "http://localhost:3000/" | grep -c '<h1\|<h2'
```

## Resolution

For PR previews to render correctly, the Coolify PR preview application must have the same runtime environment variables as staging/production:

1. **In Coolify dashboard** → PR preview application → Environment Variables
2. Add at minimum:
   - `NEXT_PUBLIC_API_URL` (same as staging)
   - `HMAC_SECRET` (same as staging)
3. Redeploy the PR preview

## Prevention

- When creating new Coolify PR preview apps, always copy env vars from the staging application
- The `isApiUrlConfigured()` guard in `fetchEventsInternal` prevents crashes but results in empty content (safe fallback)
- Consider adding a health check to PR preview CI that verifies `<h1>` tags exist in the HTML response

## Lessons Learned

1. **PR previews are NOT equivalent to localhost or staging** — they may lack runtime env vars
2. **SEO testing on PR previews is unreliable** unless env vars are verified first
3. **`$RX` error calls in the HTML** are the telltale sign of missing API configuration — all Suspense boundaries fail simultaneously
4. **The code fix (streaming refactor) was correct** — localhost had 3 `<h1>` tags, 10+ `<h2>` tags, and 19KB of real HTML in `<main>`. The PR preview issue was purely environmental.
