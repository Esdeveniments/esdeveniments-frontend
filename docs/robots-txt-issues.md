# robots.txt Issues & Resolution Journey

**Timeline:** December 2025

This document documents the complete journey of `robots.txt` issues encountered during the migration to SST/OpenNext, from initial caching problems to the final workaround.

---

## Issue 1: Old robots.txt Being Served (Caching Problem)

**Problem:** Production was serving an old version of `robots.txt` instead of the updated one with AI bot blocks and new sitemaps.

**Root Causes Identified:**
1. **Static file override**: A static `public/robots.txt` file was overriding the dynamic `app/robots.ts` (Next.js Metadata API)
2. **CloudFront caching**: Even after removing the static file, CloudFront continued serving a cached version
3. **Next.js Metadata API limitations**: The Metadata API doesn't provide explicit cache control, making it difficult to force cache invalidation

**Initial Fix Attempts:**
- Deleted `public/robots.txt` from repository
- Deleted `robots.txt` from S3 assets bucket
- Invalidated CloudFront cache for `/robots.txt`
- **Result**: Still serving old cached version

---

## Issue 2: Route Handler Conversion

**Solution:** Converted from Next.js Metadata API (`app/robots.ts`) to a route handler (`app/robots.txt/route.ts`) to gain explicit control over cache headers.

**Changes Made:**
1. **Deleted** `app/robots.ts` (Metadata API approach)
2. **Created** `app/robots.txt/route.ts` with:
   - Explicit `Cache-Control` headers (`s-maxage=300` for 5-minute edge cache)
   - `dynamic = "force-dynamic"` to prevent Next.js caching
   - `revalidate = 0` to ensure fresh generation
   - Debug headers (`X-Robots-Source`) to verify route handler usage

**Configuration Updates:**
- Added CloudFront invalidation in `sst.config.ts`:
  ```typescript
  invalidation: {
    paths: ["/robots.txt"],
    wait: true, // Wait for invalidation to complete
  }
  ```

**Result:** Route handler was deployed correctly, but still not being invoked in production.

---

## Issue 3: OpenNext Routing Priority (403 Error)

**Problem:** `robots.txt` returns `403 Access Denied` from CloudFront, even though the route handler exists and is correctly deployed.

**Root Cause:**
OpenNext (SST's Next.js adapter) checks S3 for static files **before** trying route handlers. Since `robots.txt` was previously in `public/`, OpenNext created routing logic that expects it in S3. When the file doesn't exist in S3, CloudFront returns a 403 error instead of falling back to the route handler.

**Symptoms:**
- `robots.txt` returns `403 Forbidden` with XML error: `<Error><Code>AccessDenied</Code><Message>Access Denied</Message></Error>`
- Other route handlers work fine (e.g., `llms.txt`, `sitemap.xml`)
- Error persists even after CloudFront cache invalidation
- Direct CloudFront access (bypassing Cloudflare) also returns 403
- `x-cache: Error from cloudfront` header indicates CloudFront is generating the error

**Investigation:**
- Verified route handler exists and is built correctly (`.open-next/server-functions/default/.next/server/app/robots.txt/route.js`)
- Confirmed other route handlers work (proving route handlers function in general)
- Tested direct CloudFront access (confirmed issue is at CloudFront/OpenNext level, not Cloudflare)
- Checked S3 bucket (confirmed `robots.txt` doesn't exist in `_assets/`)

---

## Cache Purge Incident (Cloudflare)

**What happened:** After purging Cloudflare cache, requests to `robots.txt` started returning `403 Access Denied`.

**Why it matters:** This confirmed that CloudFront/OpenNext was the true source of the 403 (Cloudflare was just forwarding the error). However, if Cloudflare WAF or cache rules are customized in the future, they could also mask or amplify similar errors—worth double-checking WAF/caching if the symptom reappears.

**Actions taken:** Retested via direct CloudFront URL and origin (bypassing Cloudflare); the same 403 was observed, ruling out Cloudflare as the root cause for this incident.

---

## Final Solution (Workaround)

**Workaround:** Upload `robots.txt` directly to the S3 assets bucket to satisfy OpenNext's S3 check:

```bash
# Generate robots.txt content (matches app/robots.txt/route.ts)
cat > /tmp/robots.txt << 'EOF'
# Generated robots.txt - matches app/robots.txt/route.ts

User-Agent: *
Allow: /
Disallow: /_next/
Disallow: /api/
Disallow: /e2e/
Disallow: /offline/
Disallow: /login/

User-Agent: GPTBot
Disallow: /

User-Agent: CCBot
Disallow: /

User-Agent: Google-Extended
Disallow: /

User-Agent: Bytespider
Disallow: /

Host: https://www.esdeveniments.cat

Sitemap: https://www.esdeveniments.cat/sitemap.xml
Sitemap: https://www.esdeveniments.cat/server-static-sitemap.xml
Sitemap: https://www.esdeveniments.cat/server-sitemap.xml
Sitemap: https://www.esdeveniments.cat/server-news-sitemap.xml
Sitemap: https://www.esdeveniments.cat/server-place-sitemap.xml
Sitemap: https://www.esdeveniments.cat/server-google-news-sitemap.xml
EOF

# Upload to S3 assets bucket
aws s3 cp /tmp/robots.txt s3://esdeveniments-frontend-production-siteassetsbucket-czkbdzfa/_assets/robots.txt \
  --content-type "text/plain; charset=utf-8" \
  --cache-control "public, max-age=300, s-maxage=300"
```

**Important Notes:**
- ⚠️ **This is a workaround**: Since S3 static files take precedence over route handlers in OpenNext, the route handler (`app/robots.txt/route.ts`) will **not** be used. The file is now static in S3.
- 🔄 **Keep in sync**: If you update `app/robots.txt/route.ts`, you must manually update the S3 file to match.
- 📝 **Future improvement**: Consider creating a build script that generates `robots.txt` from the route handler code during deployment to keep them synchronized.
- 🐛 **OpenNext limitation**: This appears to be a limitation/bug in OpenNext's routing priority logic. Route handlers should take precedence over S3 static files, but for `robots.txt` specifically, OpenNext checks S3 first.

**S3 Bucket Location:**
- **Bucket:** `esdeveniments-frontend-production-siteassetsbucket-czkbdzfa`
- **Path:** `_assets/robots.txt`

**Current Status:**
- ✅ `robots.txt` is accessible and returns correct content
- ✅ AI bot blocks are in place (GPTBot, CCBot, Google-Extended, Bytespider)
- ✅ All sitemaps are declared
- ✅ Cache headers are set (5-minute TTL)

**Date Resolved:** December 23, 2025

---

## Lessons Learned

1. **Static files in `public/` take precedence** over Next.js Metadata API (`app/robots.ts`)
2. **OpenNext has routing priority issues** - S3 static files are checked before route handlers for certain paths
3. **CloudFront caches 403 errors** - Even after fixing the underlying issue, CloudFront may continue serving cached errors
4. **Route handlers work in general** - The issue is specific to `robots.txt`, not route handlers in general

---

## Related Files

- **Route Handler:** `app/robots.txt/route.ts` (not currently used due to workaround)
- **SST Config:** `sst.config.ts` (contains CloudFront invalidation configuration)
- **Infrastructure Docs:** `README_INFRA.md` (references this document)

