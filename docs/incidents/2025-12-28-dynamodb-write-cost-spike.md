# Incident: DynamoDB Write Cost Spike

**Date:** December 28, 2025  
**Severity:** High (Cost)  
**Status:** Resolved  

## Summary

A code change in the "Favorites feature" deployment caused listing pages to become dynamic instead of static (ISR), resulting in ~200 million DynamoDB writes and a $307.50 cost spike in a single day.

## Impact

- **Financial:** $307.50 in DynamoDB `EUW3-WriteRequestUnits` charges
- **Region:** eu-west-3 (Paris)
- **Table:** `esdeveniments-frontend-production-siteRevalidationTable-*`
- **Duration:** ~24 hours (Dec 28-29, 2024)
- **User Impact:** None (site remained functional)

## Timeline

| Time | Event |
|------|-------|
| Dec 28, ~00:00 | Deployment with Favorites feature (#201) |
| Dec 28, ongoing | ~200M DynamoDB writes occur |
| Dec 29, morning | Cost spike detected via AWS billing |
| Dec 29, afternoon | Root cause identified and fix implemented |
| Dec 30, morning | Prevention measures deployed |

## Root Cause

The Favorites feature added `searchParams` to listing page components (`app/[place]/*`) to implement dynamic robots meta tags for filtered URLs.

```typescript
// BEFORE (problematic code)
export default async function Page({
  params,
  searchParams,  // ← This made the page DYNAMIC
}: Props) {
  // Used searchParams to set robots: "noindex" for filtered URLs
}
```

**Why this caused the issue:**

1. In Next.js App Router, reading `searchParams` in a page component opts the page out of static generation (ISR)
2. OpenNext/SST creates a separate DynamoDB cache entry for every unique URL+query combination
3. With thousands of filter combinations (search terms, distances, coordinates), this created millions of unique cache entries
4. Each cache entry = DynamoDB write = cost

## Resolution

### Immediate Fix

1. **Removed `searchParams`** from all listing page components:
   - `app/[place]/page.tsx`
   - `app/[place]/[byDate]/page.tsx`
   - `app/[place]/[byDate]/[category]/page.tsx`

2. **Moved robots logic to middleware** (`proxy.ts`) using `X-Robots-Tag` HTTP header:
   ```typescript
   const NON_CANONICAL_PARAMS = ["search", "distance", "lat", "lon"];
   if (hasNonCanonicalParams) {
     response.headers.set("X-Robots-Tag", "noindex, follow");
   }
   ```

3. **Updated E2E tests** to check HTTP header instead of meta tag

### Prevention Measures

1. **CloudWatch Alarm:** `DynamoDB-HighWriteCost-Alert`
   - Threshold: >100,000 writes/hour
   - Action: Email notification

2. **AWS Budget:** `DynamoDB-Monthly-50USD`
   - Monthly limit: $50
   - Alerts at 50%, 80%, 100%

3. **ESLint Rule:** Errors on `searchParams` usage in `app/[place]/**/*` files
   ```javascript
   // eslint.config.mjs
   {
     files: ["app/[place]/**/*"],
     rules: {
       "no-restricted-syntax": ["error", {
         selector: "Identifier[name='searchParams']",
         message: "COST ALERT: Reading searchParams makes pages dynamic..."
       }]
     }
   }
   ```

4. **Documentation:** Added warnings to AGENTS.md and copilot-instructions.md

## Lessons Learned

1. **Next.js App Router pages are static by default** - Reading `searchParams` or `headers()` makes them dynamic. This is a subtle but expensive mistake.

2. **HTTP headers work for SEO directives** - `X-Robots-Tag` is equivalent to `<meta name="robots">` for search engines, and can be set in middleware without affecting page caching.

3. **OpenNext/SST caching architecture** - Each unique URL creates a separate cache entry. High-cardinality query params (search terms, coordinates) can explode cache size.

4. **Cost monitoring is essential** - Set up billing alerts before incidents, not after.

## Related Files

- `proxy.ts` - X-Robots-Tag header injection
- `app/[place]/**/page.tsx` - Listing pages (must stay static)
- `eslint.config.mjs` - Prevention rule
- `AGENTS.md` - Documentation for AI agents

## References

- [Next.js Static and Dynamic Rendering](https://nextjs.org/docs/app/building-your-application/rendering/server-components#dynamic-rendering)
- [X-Robots-Tag HTTP Header](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag#xrobotstag)
- [OpenNext ISR Documentation](https://open-next.js.org/inner_workings/isr)
