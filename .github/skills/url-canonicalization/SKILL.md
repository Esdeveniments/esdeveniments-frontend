---
name: url-canonicalization
description: Canonical URL and caching rules for listing pages (/place/date/category). Use when touching app/[locale]/[place]/** pages, adding or reading query params (search, distance, lat, lon, price, from, to), building or parsing listing URLs, changing redirects or noindex in proxy.ts, or anything near searchParams. CRITICAL - never read searchParams in listing pages ($300 incident).
---

# URL canonicalization

## Never read `searchParams` in listing pages

Applies to every page under `app/[locale]/[place]/` (`page.tsx`, `[byDate]/page.tsx`, `[byDate]/[category]/page.tsx`).

Reading `searchParams` makes the page dynamic: Next renders and stores one entry per URL + query string. Every `?search=…` or `?lat=…` becomes its own cache entry. On 28 Dec 2025 this caused a $300+ hosting spike.

```tsx
// ❌ Never
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<PlaceStaticPathParams>;
  searchParams: Promise<{ search?: string }>;
}) { /* ... */ }

// ✅ Only params; the page stays cacheable
export default function Page({
  params,
}: {
  params: Promise<PlaceStaticPathParams>;
}) {
  const { place } = use(params);
  return (
    <Suspense fallback={<h1 className="sr-only">{formatPlaceName(place)}</h1>}>
      <PlacePageGate place={place} />
    </Suspense>
  );
}
```

The server renders the canonical, query-free list. Query filters (`search`, `distance`, `lat`, `lon`, `price`, `from`, `to`) are read and applied on the client by `HybridEventsListClient` + `components/hooks/useEvents.ts` (`useSWRInfinite`). Anything else that depends on the query goes in `proxy.ts` (headers, redirects) or the client.

## Canonical shape

`/place(/date)?(/category)?`, omitting `tots`:

| date | category | URL |
| --- | --- | --- |
| `tots` | `tots` | `/place` |
| `tots` | other | `/place/category` |
| other | `tots` | `/place/date` |
| other | other | `/place/date/category` |

Query params only for client filters. `distance` is omitted at its default (50); `price` only when `gratis` or `pagament`; `from`/`to` only as a pair (they replace the date segment).

## Build and parse with the helpers

All in `utils/url-filters.ts`:

- Build: `buildCanonicalUrl(filters, dynamicCategories?)` (wraps `buildCanonicalUrlDynamic`), `buildFilterUrl(segments, query, changes, dynamicCategories?)` for filter changes.
- Parse: `parseFiltersFromUrl`, `urlToFilterState`, `getRedirectUrl`, `hasActiveClientFilters`.
- Validate category slugs with `isValidCategorySlug`. Invalid place fallback: `buildFallbackUrlForInvalidPlace`.

`utils/url-parsing.ts` only has `extractURLSegments` (and a debug helper). Never build listing URLs with template strings like `` `/${place}/${date}/${category}` ``.

## Redirects and noindex (`proxy.ts`)

- `handleCanonicalRedirects` (`utils/middleware-redirects.ts`) sends 301s for legacy `?category=&date=` query params and `tots` segments (`/barcelona/tots/concerts` → `/barcelona/concerts`). Only the params in `ALLOWED_QUERY_PARAMS` (same file: `search`, `distance`, `price`, `from`, `to`, `lat`, `lon`) survive the redirect; any other param is dropped.
- `X-Robots-Tag: noindex, follow` for listings with any of `search`, `distance`, `price`, `from`, `to`, `lat`, `lon` (`NON_CANONICAL_PARAMS`), and for `/place/<avui|dema|setmana|cap-de-setmana>/category`. Non-production hosts get `noindex, nofollow`.
- A new client query param must be added to both `NON_CANONICAL_PARAMS` (`proxy.ts`) and `ALLOWED_QUERY_PARAMS`.

## Checklist

- [ ] No `searchParams` in `app/[locale]/[place]/**`
- [ ] New query param: parsed/built in `utils/url-filters.ts`, handled client-side, added to `NON_CANONICAL_PARAMS` and `ALLOWED_QUERY_PARAMS`
- [ ] URLs built with the helpers, no `/tots/` segments
- [ ] Filter changes: see `filter-system-dev`
