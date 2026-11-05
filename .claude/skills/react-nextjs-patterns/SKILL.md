---
name: react-nextjs-patterns
description: Repo-specific React 19 + Next.js 16 App Router patterns for esdeveniments.cat. Use when creating or editing pages, layouts, Server/Client Components, hooks, "use cache" functions, Suspense boundaries, links/prefetch, or when you hit cacheComponents/PPR errors ("Couldn't find all resumable slots", "Expected the resume to render"), client manifest bloat, or barrel-file imports.
---

# React and Next.js patterns

Next 16 App Router with `cacheComponents: true` and `partialPrefetching: true` (`next.config.js`). Pages live under `app/[locale]/`. Base rules are in AGENTS.md › Rendering and › Hard rules; this skill shows how they look in this repo.

## Pages and params

`params` is a Promise: `await` it in async code, or `use(params)` in a sync component (the `[place]` page does this). Get the locale from `next/root-params`, not from `params` or headers.

Type props with the global helpers that `next typegen` generates (`yarn typecheck` runs it): `PageProps<"/[locale]/…">`, `LayoutProps<…>`, and `RouteContext<"/api/…">` for route handlers. Don't hand-write `{ params: Promise<{ … }> }`.

```tsx
// app/[locale]/[place]/page.tsx (shortened)
import { locale as rootLocale } from "next/root-params";

export async function generateMetadata({
  params,
}: PageProps<"/[locale]/[place]">) {
  const { place } = await params;
  const locale = (await rootLocale()) as AppLocale;
  // ...
}
```

Never read `searchParams` in `app/[locale]/[place]/**`: see the `url-canonicalization` skill.

## Server first, small client leaves

- Server Component by default. Add `"use client"` only to the smallest leaf that needs state, effects, event handlers or browser APIs. Props types go in `types/props.ts`.
- Pass server data down as props, or pass server-rendered JSX into client components as `children`/slots.
- `next/dynamic` is fine inside client components (e.g. `components/ui/card/AdCardClient.tsx`). Never use `next/dynamic` with `ssr: false` in a Server Component: import a `"use client"` component directly instead.
- Internal links: `Link` from `@i18n/routing`, never `next/link` (AGENTS.md › i18n).

## Listings: SSR list + SWR

Don't build a new list or `useSWR` call for events. Reuse:

- `components/ui/hybridEventsList/index.tsx` (`HybridEventsList`, server): renders `initialEvents` as given. The page calls `insertAds` (`lib/api/events.ts`) before passing them, as `app/[locale]/[place]/page.tsx` does; a new listing that skips it has no SSR ad slots.
- `components/ui/hybridEventsList/HybridEventsListClient.tsx` + `components/hooks/useEvents.ts` (`useSWRInfinite`): load more and client filters (`search`, `distance`, `lat`, `lon`, `from`, `to`).

The append/dedupe/ads contract is in AGENTS.md › Rendering. `getInternalApiUrl` (`utils/api-helpers.ts`) is async and server-only, and so are the `lib/api/*` helpers; client code fetches relative `/api/*` URLs (e.g. `components/hooks/useEvents.ts`).

## Loading UI

What users see while a page loads is the fallback of the nearest `<Suspense>` *below the shared layout*:

- Direct visit: the static shell. Client navigation: only the part below the layout the two routes share re-renders, so the root layout's `<Suspense fallback={<AppShellSkeleton />}>` never shows on a navigation.
- `loading.tsx` is a `<Suspense>` around the page. If the page returns its own `<Suspense>` straight away (the sync `[place]` page does, to flush the shell early), that inner boundary catches everything and `loading.tsx` only shows while `params` resolve.

So a page-level fallback must be the visible skeleton, with any SEO-only markup next to it:

```tsx
// app/[locale]/[place]/page.tsx
<Suspense
  fallback={
    <>
      <h1 className="sr-only">{placeLabel}</h1>
      <PlacePageSkeleton />
    </>
  }
>
  <PlacePageGate place={place} />
</Suspense>
```

Reuse the folder's `loading.tsx` skeleton so both paths look the same. The home page does the same: `HomeContent` waits on `connection()`, so its fallback is `HomePageSkeleton` (built from `HomeHero`, the same hero frame and LCP image as the real page) next to the crawler-only `HomeStaticFallback`.

The fallback only covers the wait; keep the wait short. Before a page renders, start every read that doesn't depend on another one, and `await` them together (`Promise.all`) or pass the promise down to the component that needs it. Don't `await` one backend call and then start the next unless the second needs the first's result. The listing pages used to chain categories → place lookup → event count → events. Now they start the place lookup and count right after validating the slug, and fetch the rich page size without waiting for the count, trimming it afterwards (`buildPlaceEventsPromise`, `buildPlaceByDateEventsPromise`). `fallback={null}` is fine for small parts of a page (sponsor slot, scripts), never for the whole body. Next's instant-navigation validation only checks that a boundary exists, not that its fallback shows anything: test the fallback with `renderToString` and a reader that never resolves (`test/place-page-loading-fallback.test.tsx`, `test/home-page-loading-fallback.test.tsx`).

## Prefetch

`partialPrefetching` makes links prefetch the route's shared shell. Never set `prefetch={true}` on a `<Link>`. `PressableAnchor` (`components/ui/primitives/PressableAnchor.tsx`) defaults to `prefetch={false}`; keep it.

## cacheComponents: time and data must not change the tree

With `cacheComponents`, React stores a prerendered tree and later resumes it. If a server component renders a *different shape* on resume (an element appears, disappears or changes type), you get "Couldn't find all resumable slots" or "Expected the resume to render `<Fragment>` … but instead it rendered `<script>`", and the page falls back to client rendering (bad for SEO and LCP).

Triggers: `new Date()`/`Date.now()` deciding what renders, or data that changes over time deciding whether an element exists (e.g. JSON-LD only when there are events).

Fix one of two ways:

```tsx
import { connection } from "next/server";

async function StructuredData({ eventsPromise }: StructuredDataProps) {
  await connection(); // render at request time, never from a stored tree
  const events = await eventsPromise;
  return events.length > 0 ? <JsonLdServer data={buildSchema(events)} /> : null;
}
```

Or run the code inside `"use cache"` with an explicit `cacheLife` (time is then frozen per cache entry). Real `connection()` uses: `app/[locale]/page.tsx`, `components/ui/sponsor/SponsorBannerSlot.tsx`, `components/noticies/NewsList.tsx`. Dates used only for text are fine without either.

## "use cache"

Used to make pages storable (ISR) while still reading time or data: `app/[locale]/e/[eventId]/page.tsx` (`EventPageBody`), `lib/api/events.ts`, `lib/api/news.ts`, `lib/api/profiles.ts`, `components/ui/common/footer/index.tsx`.

```tsx
async function EventPageBody({ slug, locale, sidebarSponsorSlot }: EventPageBodyProps) {
  "use cache";
  cacheLife({ stale: 300, revalidate: 900, expire: 86400 });
  cacheTag(eventsTag, eventTag(slug));
  setRequestLocale(locale); // the layout's call does not reach inside "use cache"
  // ...render; {sidebarSponsorSlot} is passed through untouched
}
```

Rules:

- No `headers()`, `cookies()` or `connection()` inside. Read the locale outside (`rootLocale()`) and pass it in, then call `setRequestLocale(locale)` inside so next-intl doesn't fall back to `headers()`.
- Request-time parts (sponsor banner, latest news) are rendered outside and passed in as slot props; the cache stores them as holes.
- Always set `cacheLife`; add `cacheTag` when something revalidates it.
- The store is `use-cache-handler.mjs` (registered as `cacheHandlers.default` in `next.config.js`, in-memory, per process). Don't remove it: `cacheMaxMemorySize: 0` disables the built-in store (AGENTS.md › Hard rules).

## No local barrel files

Never add an `index.ts` that re-exports `"use client"` components used by different routes. In the RSC build, every `"use client"` module re-exported by a barrel is registered in the client reference manifest of every route that imports the barrel, even if that route uses one export. In Feb 2026 `components/ui/sponsor/index.ts` (since removed) pulled `CheckoutButton`, `PlaceSelector` and `PricingSectionClient` (only used on `/patrocina`) into `/[place]`: +24 KB. `optimizePackageImports` only helps npm packages.

```ts
// ❌ import { SponsorBannerSlot } from "@components/ui/sponsor";
// ✅
import SponsorBannerSlot from "@components/ui/sponsor/SponsorBannerSlot";
```

A folder `index.tsx` that *is* a component (e.g. `components/ui/hybridEventsList/index.tsx`) is fine; re-export-only barrels are not.

## Hooks

- `useRef` for flags that don't affect rendering (analytics sent, effect ran); refs don't go in dependency arrays.
- Complete dependency arrays. The React Compiler is on (`reactCompiler: true`), so add `useMemo`/`useCallback` only when profiling shows a need.

## Checklist

- [ ] Server Component unless it needs client APIs; `"use client"` at the leaf
- [ ] `params` awaited in async components or unwrapped with `use(params)` in sync ones; locale from `rootLocale()`
- [ ] No `searchParams` in listing pages
- [ ] Time or changing data that affects the tree → `connection()` or `"use cache"` + `cacheLife`
- [ ] No `prefetch={true}`; `Link` from `@i18n/routing`
- [ ] Direct file imports, no re-export barrels
- [ ] Props types in `types/props.ts`; UI classes per `design-system-conventions`
