# Incident: robots.txt Routing Issues (OpenNext/SST)

**Date:** December 23, 2025  
**Severity:** Medium (SEO/Functionality)  
**Status:** Resolved (Workaround)  

## Summary

After migrating to SST/OpenNext, `robots.txt` started returning `403 Access Denied` errors. The root cause was OpenNext's routing priority checking S3 for static files before falling back to route handlers.

## Impact

- **SEO:** Search engines couldn't access `robots.txt`, potentially affecting crawling behavior
- **AI Bots:** AI bot blocks (GPTBot, CCBot, etc.) weren't being served
- **Sitemaps:** Sitemap declarations weren't accessible to crawlers
- **User Impact:** None (site remained functional)

## Timeline

| Time | Event |
|------|-------|
| Early Dec | Migration to SST/OpenNext |
| Dec ~20 | Noticed old `robots.txt` being served (caching issue) |
| Dec ~21 | Deleted `public/robots.txt`, converted to route handler |
| Dec ~22 | Started getting 403 errors on `robots.txt` |
| Dec 23 | Root cause identified, workaround implemented |

## Root Cause

**Three interrelated issues:**

### Issue 1: Static File Override
A static `public/robots.txt` file was overriding the dynamic `app/robots.ts` (Next.js Metadata API). Even after deletion, CloudFront continued serving a cached version.

### Issue 2: Route Handler Not Invoked
Converted to route handler (`app/robots.txt/route.ts`) for explicit cache control, but OpenNext wasn't invoking it in production.

### Issue 3: OpenNext Routing Priority (Root Cause)
OpenNext checks S3 for static files **before** trying route handlers. Since `robots.txt` was previously in `public/`, OpenNext created routing logic expecting it in S3. When the file didn't exist, CloudFront returned 403 instead of falling back to the route handler.

```
Request flow:
1. CloudFront receives /robots.txt request
2. OpenNext checks S3 for _assets/robots.txt
3. File not found → S3 returns 403 Access Denied
4. Route handler never invoked ❌
```

**Symptoms:**
- `403 Forbidden` with XML error: `<Error><Code>AccessDenied</Code></Error>`
- Other route handlers worked fine (e.g., `llms.txt`, `sitemap.xml`)
- Direct CloudFront access (bypassing Cloudflare) also returned 403
- `x-cache: Error from cloudfront` header

## Resolution

### Workaround: Upload Static File to S3

Since OpenNext checks S3 first, we uploaded `robots.txt` directly to satisfy that check:

```bash
# Generate robots.txt content (matches app/robots.txt/route.ts)
cat > /tmp/robots.txt << 'EOF'
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
aws s3 cp /tmp/robots.txt \
  s3://esdeveniments-frontend-production-siteassetsbucket-czkbdzfa/_assets/robots.txt \
  --content-type "text/plain; charset=utf-8" \
  --cache-control "public, max-age=300, s-maxage=300"
```

### Configuration Added

CloudFront invalidation in `sst.config.ts`:
```typescript
invalidation: {
  paths: ["/robots.txt"],
  wait: true,
}
```

## Prevention Measures

1. **Documentation:** This incident report and `README_INFRA.md` reference
2. **Keep in sync:** If `app/robots.txt/route.ts` is updated, manually update S3 file
3. **Future improvement:** Consider build script to generate `robots.txt` from route handler

## Lessons Learned

1. **Static files in `public/` take precedence** over Next.js Metadata API (`app/robots.ts`)

2. **OpenNext has routing priority quirks** - S3 static files are checked before route handlers for certain paths like `robots.txt`

3. **CloudFront caches 403 errors** - Even after fixing the underlying issue, CloudFront may continue serving cached errors

4. **Route handlers work in general** - The issue was specific to `robots.txt`, not route handlers overall

5. **Cloudflare can mask issues** - After purging Cloudflare cache, the 403 became visible, confirming CloudFront/OpenNext as the source

## Known Limitations

⚠️ **This is a workaround, not a fix:**
- Route handler (`app/robots.txt/route.ts`) is **not used** because S3 takes precedence
- Changes to route handler require manual S3 update
- This appears to be an OpenNext limitation/bug

## Related Files

- **Route Handler:** `app/robots.txt/route.ts` (not currently used)
- **S3 Location:** `s3://esdeveniments-frontend-production-siteassetsbucket-czkbdzfa/_assets/robots.txt`
- **SST Config:** `sst.config.ts`
- **Infrastructure Docs:** `README_INFRA.md`

## References

- [OpenNext ISR Documentation](https://open-next.js.org/inner_workings/isr)
- [Next.js Metadata API - robots.txt](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
