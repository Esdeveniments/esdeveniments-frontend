# Fix News Article Visit Tracking - 24h Deduplication

## Problem

**News Articles** (`app/noticies/[place]/[article]/page.tsx`):

- Backend automatically increments visits on EVERY server-side fetch (when `fetchNewsBySlugExternal` is called)
- This causes visits to increment on every page refresh/reload ❌
- No client-side tracking with visitor_id deduplication

**Events** (`app/e/[eventId]/page.tsx`):

- Uses client-side tracking via `EventClient.tsx` component
- Sends visit via `/api/visits` with `visitor_id` cookie
- Backend deduplicates by `eventId` + `visitor_id` within 24 hours ✅
- Only counts once per visitor per 24 hours

## Solution

Replicate the event visit tracking pattern for news articles using server-side internal API call:

1. Make a server-side call to `/api/visits` from the news article page component (server component)
2. Use `getInternalApiUrl` to call the internal API route (same pattern as events use for fetching)
3. Pass `slug` parameter to track the visit
4. The backend should deduplicate by `slug` + `visitor_id` for news articles (24h window)
5. No client-side beacon needed - this is all server-side

## Implementation Steps

### 1. Update `/components/noticies/NewsArticleDetail.tsx`

- After fetching the news detail, make a server-side call to `/api/visits` using `getInternalApiUrl`
- Use `fetch` with POST method and `slug` in the body
- Make this call non-blocking (fire-and-forget) so it doesn't slow down page rendering
- Handle errors silently (log but don't fail the page)
- Import `getInternalApiUrl` from `@utils/api-helpers`

## Files to Modify

1. **`components/noticies/NewsArticleDetail.tsx`** - Add server-side visit tracking call

**Note:** No changes needed to `/app/api/visits/route.ts` - it already accepts `slug` parameter which we'll use for news articles.

## Implementation Details

### `/components/noticies/NewsArticleDetail.tsx`

```typescript
// Add import
import { getInternalApiUrl } from "@utils/api-helpers";

// After fetching detail (around line 72, after checking if detail exists):
if (detail) {
  // Fire-and-forget server-side visit tracking (non-blocking)
  // Backend dedupes by slug + visitor_id (24h window)
  fetch(getInternalApiUrl("/api/visits"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug: detail.slug }),
  }).catch((error) => {
    // Silently fail - don't block page rendering
    console.error("Failed to track news visit:", error);
  });
}
```

## Testing

- Verify that visiting a news article page increments the visit counter
- Verify that refreshing the page does NOT increment again (within 24h)
- Test with different browsers/devices to ensure visitor_id cookie works
- Verify that the counter updates correctly in the UI
- Test that page rendering is not affected by the client component

## Notes

- The `/api/visits` endpoint already handles visitor ID via middleware (`x-visitor-id` header and `visitor_id` cookie)
- Server-side tracking ensures visits are only counted once per visitor per 24 hours (backend deduplication)
- The backend should deduplicate by `slug` + `visitor_id` within a 24-hour window (similar to how it handles events)
- We use only `slug` parameter (no `newsId` needed) - the existing endpoint already supports this
- This matches the internal API call pattern used by events (server-side, using `getInternalApiUrl`)
- The automatic server-side increment when fetching news via `fetchNewsBySlugExternal` may need to be disabled on the backend, or we can rely on this explicit visit tracking call only
