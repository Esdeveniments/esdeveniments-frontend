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
}: PageProps<"/[locale]/[place]">) { /* ... */ }

// ✅ Only params; the page stays cacheable
// (`PageProps` types `searchParams` too; reading it is what makes the page dynamic)
export default function Page({ params }: PageProps<"/[locale]/[place]">) {
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
- Validate category slugs with `isValidCategorySlug`.

`utils/url-parsing.ts` only has `extractURLSegments` (and a debug helper). Never build listing URLs with template strings like `` `/${place}/${date}/${category}` ``.

## Redirects and noindex (`proxy.ts`, `utils/proxy-page-headers.ts`)

- `handleCanonicalRedirects` (`utils/middleware-redirects.ts`) sends 301s for legacy `?category=&date=` query params and `tots` segments (`/barcelona/tots/concerts` → `/barcelona/concerts`). Only the params in `ALLOWED_QUERY_PARAMS` (same file: `search`, `distance`, `price`, `from`, `to`, `lat`, `lon`) survive the redirect; any other param is dropped.
- `X-Robots-Tag: noindex, follow` for listings with any of `search`, `distance`, `price`, `from`, `to`, `lat`, `lon` (`ALLOWED_QUERY_PARAMS`), and for `/place/<avui|dema|setmana|cap-de-setmana>/category`. Non-production hosts get `noindex, nofollow`.
- A new client query param goes in `ALLOWED_QUERY_PARAMS` (`utils/middleware-redirects.ts`): that one list drives both the redirect allowlist and the noindex check.
- Unknown place slugs (GET/HEAD, 1–3 segments, not `catalunya`, not in `NON_PLACE_FIRST_SEGMENTS`) go through `checkPlace` (`utils/proxy-place.ts`) → `resolvePlaceForProxy` (`lib/api/places-proxy.ts`): an alias 301s to the real slug with the query kept, a missing place is rewritten with `status: 404`, and any backend error or a 1.5 s timeout serves the page as before and skips the check for 30 s. It reads the aggregated places list first (1 h in-memory cache shared with the app, so `/api/revalidate` clears it) and asks `/places/{slug}` only for slugs not in it, such as provinces. Pages can't set this status themselves: the root layout's `<Suspense>` streams a 200 first. The page's late check (`getPlaceAliasOrInvalidPlaceRedirectUrl`) still redirects aliases and calls `notFound()` for a missing place, never a redirect to a fallback (a redirect would send visitors away from the 404).
- Unknown category slugs (`/barcelona/concerts`, `/barcelona/avui/concerts`) go through `checkCategory` (same file) → `getCategoriesForProxy` (`lib/api/categories-proxy.ts`): a 301 to the path `getRedirectUrl(parseFiltersFromUrl(...))` returns, so Proxy and the page always agree; the query is kept. `/place/date` skips the backend. Both lists share `createProxyListLoader` (`lib/api/proxy-list.ts`: `createCache` with the app's `globalKey`, so one fetch serves both; 1 h TTL; a 1.5 s deadline stops the wait without aborting the shared fetch; 30 s back-off) and fail open. The 301 is `private, max-age=3600`; the page's `redirect()` stays as the fallback.
- A new top-level route folder in `app/[locale]/` must be added to `NON_PLACE_FIRST_SEGMENTS` (`utils/middleware-redirects.ts`), or Proxy treats it as a place; `test/middleware-redirects-non-place.test.ts` fails until you do.

## Checklist

- [ ] No `searchParams` in `app/[locale]/[place]/**`
- [ ] New query param: parsed/built in `utils/url-filters.ts`, handled client-side, added to `ALLOWED_QUERY_PARAMS`
- [ ] URLs built with the helpers, no `/tots/` segments
- [ ] New top-level route folder added to `NON_PLACE_FIRST_SEGMENTS`
- [ ] Filter changes: see `filter-system-dev`
