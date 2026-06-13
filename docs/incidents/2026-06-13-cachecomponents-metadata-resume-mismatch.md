# cacheComponents Metadata Resume Mismatch + Oversized Cache Tag

## Summary

Two errors were flooding the self-hosted (Coolify) production logs, found while
investigating frontend memory/restart behaviour:

1. A constant PPR resume error: `Expected the resume to render <div> in this slot
   but instead it rendered <__next_metadata_boundary__>. The tree doesn't match so
   React will fallback to client rendering.` (digest `2239402817`).
2. A recurring warning: a cache tag exceeded Next.js's 256-character limit, so
   tagging silently failed for affected events.

## Impact

- **SEO / correctness:** every request hitting the resume mismatch bailed from
  server rendering to client rendering, so the server shipped an incomplete tree.
  It fired hardest on bot user-agents (matched by `htmlLimitedBots`, which forces
  a blocking render), exactly the traffic where server HTML matters most.
- **Cache correctness:** events whose id produced an oversized tag were never
  tagged, so targeted `updateTag`/`revalidateTag` invalidation didn't reach them.
- No downtime, no cost spike. Degraded SSR + log noise.

## Timeline

- Ongoing in production (last deploy 2026-05-18). Surfaced 2026-06-13 while
  reading container logs via the Coolify MCP during a memory investigation.

## Root Cause

### 1. Dynamic metadata under cacheComponents

`generateMetadata` on the event (`app/[locale]/e/[eventId]/page.tsx`) and news
article (`app/[locale]/noticies/[place]/[article]/page.tsx`) pages fetched the
entity through `getInternalApiUrl` (`utils/api-helpers.ts`), which reads
`headers().get("host")` to resolve the request origin.

With `cacheComponents: true`, reading `headers()` makes the render runtime-dynamic.
Because metadata is rendered behind the `__next_metadata_boundary__`, making it
dynamic moves that boundary into the dynamic **resume** tree, while the static PPR
**prerender** produced a plain `<div>` at the same slot. On resume the positions
disagree, React reports the tree mismatch, and falls back to client rendering.
This is the app-code branch of Next's
[`next-prerender-dynamic-metadata`](https://nextjs.org/docs/messages/next-prerender-dynamic-metadata)
rule: _Document Metadata must not depend on uncached/runtime data_. The dynamic
dependency was pulled in transitively and silently — nothing in `generateMetadata`
looked dynamic at a glance.

The page **content** was already explicitly dynamic (`await connection()` in
`EventPageContent`), so the fix is to keep metadata static, not to make it match
the dynamic content.

### 2. Oversized cache tag

A malformed event id — a whole RSS `link` + `description` collapsed into the slug
by the backend feed parser — was interpolated directly into an `event:${slug}`
tag, pushing it past Next's 256-char limit. The tag was built inline at the fetch
site, with no length guard.

## Resolution

1. **Metadata:** added request-independent readers `getEventBySlugForMetadata`
   (`lib/api/events.ts`) and `getNewsBySlugForMetadata` (`lib/api/news.ts`) that
   resolve the API origin from configuration (`INTERNAL_SITE_URL`/
   `NEXT_PUBLIC_SITE_URL`) instead of `headers()`, via a new `preferConfiguredOrigin`
   option on `getInternalApiUrl`. `generateMetadata` uses these; page content keeps
   using the header-aware reader. Verified with `next build`: `/[locale]/e/[eventId]`
   is now classified `◐` (Partial Prerender) with no dynamic-metadata errors.
2. **Tag:** added `boundedTag()` in `lib/cache/tags.ts`. Oversized values are
   truncated with a stable djb2 hash suffix so the tag stays ≤256 chars, unique,
   and identical across set (`fetch`) and invalidate (`updateTag`/`revalidateTag`).
   All slug-based builders (`eventTag`, `placeTag`, `newsPlaceTag`, `newsSlugTag`)
   route through it; `lib/api/events.ts` uses the helper instead of inline tags.

## Prevention

- **Convention:** any `generateMetadata` that needs entity data MUST use a
  `*ForMetadata` reader (request-independent), never a `headers()`-bound fetch.
  Listing pages already use cached readers, so only the two detail pages were
  affected.
- **Lint guard:** `eslint.config.mjs` flags calls to the header-aware readers
  (`getEventBySlug`/`getNewsBySlug`/`getInternalApiUrl`) inside a `generateMetadata`
  function, pointing at the `*ForMetadata` alternative.
- **Tags:** never interpolate a slug into a tag inline — always go through the
  `lib/cache/tags.ts` builders, which enforce the 256-char limit. Covered by
  `test/cache-tags.test.ts`.
- **Build check:** `next build` reports per-route prerender mode; detail routes
  should stay `◐` (Partial Prerender). A route flipping to `ƒ` (Dynamic) after a
  metadata change is the signal this regressed.

## Performance impact

- Metadata is prerendered into the static shell again, so the shell (including
  `<head>`) flushes immediately and PPR resume succeeds instead of discarding the
  server tree and re-rendering on the client. Bots get complete server HTML with
  no JS execution. Removes the constant error allocation + client-render churn.
- Correct cache tagging restores targeted revalidation for previously-untagged
  events, avoiding stale content and unnecessary full refetches.

## Lessons Learned

- Under `cacheComponents`, a single transitive `headers()`/`cookies()` call deep in
  a shared helper can silently make `generateMetadata` dynamic and break PPR. The
  blast radius of "read the request host" is larger than it looks.
- Metadata and page content have independent dynamism. Making content dynamic does
  not require (or excuse) making metadata dynamic.
- Read production logs early. This was visible for weeks; a memory investigation
  surfaced it only because we finally pulled container logs.
