# Incident: Fetch Cache Explosion (Jan 20, 2026)

## Summary

On January 20, 2026, a code change that added `next: { revalidate, tags }` to external API fetches caused S3 and DynamoDB costs to spike significantly. The change created a separate cache entry for every unique API URL, leading to unbounded cache growth.

## Timeline

| Date | Event |
|------|-------|
| Jan 17 | Baseline: 150 fetch cache entries, 400K S3 objects, ~16K DynamoDB writes/day |
| Jan 20 14:02 | Commit `00fdbdda`: Changed `removeConsole: false` in next.config.js |
| Jan 20 18:02 | Commit `f629755d`: Added `next: { revalidate, tags }` to all *-external.ts files |
| Jan 21 | Cache entries grew to 146,394 per build, S3 objects to 624K |
| Jan 22 | DynamoDB writes hit 314K/day, S3 objects at 770K |
| Jan 26 | S3 objects reached 1.46M, costs clearly elevated |
| Jan 27 | Root cause identified and fix deployed |

## Impact

| Metric | Before (Jan 17) | After (Jan 26) | Change |
|--------|-----------------|----------------|--------|
| S3 Objects | 400K | 1,460K | +265% |
| Fetch Cache Entries/Build | 150 | 146,394 | +976x |
| DynamoDB Writes/Day | 16K | 280K | +17x |
| S3 Cost/Day | ~$0.15 | ~$0.88 | +487% |
| Lambda Cost/Day | ~$0.02 | ~$0.23 | +1050% |

## Root Cause

The `next: { revalidate, tags }` option on `fetch()` calls enables Next.js's fetch cache. When running on OpenNext/SST:
- Each unique fetch URL creates a separate cache entry
- Entries are stored in both **S3** (fetch response body) and **DynamoDB** (revalidation metadata)
- With the app making API calls for 100+ places × categories × dates × pages × event slugs, this created hundreds of thousands of unique cache keys

### Why it happened

The `fetchWithHmac` wrapper has this logic:

```typescript
// Always enforce no-store for security when no Next.js cache options are provided
const cacheOption = options.next ? undefined : "no-store";
```

- **Before Jan 20**: No `next:` option → `cache: "no-store"` → No caching
- **After Jan 20**: `next: { revalidate }` provided → `cache: undefined` → Fetch cache enabled → Unbounded entries

### Problematic code (now removed)

```typescript
// lib/api/events-external.ts (BEFORE FIX)
const res = await fetchWithHmac(`${api}/events?${qs.toString()}`, {
  next: { revalidate: EVENTS_REVALIDATE, tags: ["events"] },  // ← PROBLEMATIC
});
```

## Resolution

Removed `next: { revalidate, tags }` from all `*-external.ts` files:
- `events-external.ts`
- `news-external.ts`
- `categories-external.ts`
- `cities-external.ts`
- `regions-external.ts`
- `places-external.ts`

This restores the default `cache: "no-store"` behavior.

## Lessons Learned

1. **Next.js fetch cache with OpenNext/SST can be dangerous** for APIs with high cardinality (many unique URLs)
2. **The fetch cache creates entries in both S3 AND DynamoDB**, doubling the cost impact
3. **There's no automatic cleanup** of old cache entries across deployments
4. **Intent vs. behavior mismatch**: The change intended to improve performance via caching, but created unbounded storage growth instead

## Prevention

1. Added explicit warning comments in all `*-external.ts` files:
   ```typescript
   // IMPORTANT: Do NOT add `next: { revalidate }` to external fetches.
   // This causes OpenNext/SST to create a separate S3+DynamoDB cache entry for every unique URL.
   ```

2. The internal API routes already handle caching via `Cache-Control` headers, which is a better approach for this use case

3. Consider adding a CloudWatch alarm for S3 object count growth rate

## Related Incidents

- [2025-12-28 DynamoDB Write Cost Spike](./2025-12-28-dynamodb-write-cost-spike.md) - Similar pattern caused by `searchParams` making pages dynamic
