# Performance Assessment Report — March 6, 2026

## Executive Summary

| Metric                        | Status       | Value                                              |
| ----------------------------- | ------------ | -------------------------------------------------- |
| Core Web Vitals (Desktop)     | ✅ Passed    | LCP 2.2s, INP 82ms, CLS 0.01                       |
| Core Web Vitals (Mobile)      | ✅ Passed    | LCP 2.4s, INP 194ms, CLS 0.02                      |
| Client Bundle Total           | ⚠️ Watch     | **2.16 MB** (65 JS files + 2 CSS files)            |
| Client Bundle Trend           | ✅ Improving | -22.8% since Dec 2025                              |
| Server Bundle (largest route) | ⚠️ Heavy     | `/patrocina` at 1.62 MB                            |
| CSS Output                    | ✅ Good      | 73.6 KB main + 21.4 KB secondary = **95 KB total** |
| Build Output (`.next/`)       | ℹ️ Info      | 1.4 GB total, 117 MB standalone                    |
| Total Routes                  | ℹ️ Info      | 85 (36 pages, 37 APIs, 12 sitemaps)                |

---

## 1. Bundle Size Analysis

### 1.1 Client Bundle Trend (Positive)

| Period             | Total Size | Change               |
| ------------------ | ---------- | -------------------- |
| Dec 2025           | 2.80 MB    | baseline             |
| Feb 2026           | 2.21 MB    | **-21.1%**           |
| Mar 2026 (current) | 2.16 MB    | **-2.1%** (from Feb) |

**Overall: -22.8% reduction since December.** This is excellent progress.

### 1.2 Top Client Chunks

| Size     | File                   | Assessment                                                               |
| -------- | ---------------------- | ------------------------------------------------------------------------ |
| 221.3 KB | `076751313863b3b3.js`  | ⚠️ **Largest single chunk** — likely contains framework + shared modules |
| 153.7 KB | `f6f7cc1eb4e83efd.js`  | ⚠️ Appears to contain date formatting/locale data (date-fns)             |
| 110.0 KB | `a6dad97d9634a72d.js`  | ⚠️ Core framework chunk (React internals, polyfills)                     |
| 107.1 KB | `1b0ad0f633549bbc.js`  | Shared runtime chunk                                                     |
| 86.6 KB  | `7908b07ee627a7ba.js`  | Route-specific client code                                               |
| 73.6 KB  | `d9a014a5c300453c.css` | Main CSS (Tailwind output)                                               |

### 1.3 Server Bundle by Route

| Route          | Server Size | Files | Issue                                                         |
| -------------- | ----------- | ----- | ------------------------------------------------------------- |
| `/patrocina`   | 1.62 MB     | 32    | ⚠️ **Heaviest** — includes checkout/pricing client components |
| `/sitemap`     | 1.55 MB     | 32    | ⚠️ High for a sitemap route                                   |
| `/[place]`     | 1.33 MB     | 24    | ⚠️ Main listing page, grew +6.7% since Dec 2025               |
| `/noticies`    | 1.25 MB     | 36    | Improved -5.8% since Dec 2025                                 |
| `/e/[eventId]` | 1.01 MB     | 16    | Improved -3.5% since Dec 2025                                 |

### 1.4 Client Reference Manifest Bloat

The `page_client-reference-manifest.js` files are disproportionately large:

| Route                | Manifest Size | Concern                                                   |
| -------------------- | ------------- | --------------------------------------------------------- |
| `/e/[eventId]`       | **511.9 KB**  | ⚠️ Extremely large — many "use client" modules registered |
| `/e/[eventId]/edita` | 470.2 KB      |                                                           |
| `/[place]`           | 430.8 KB      | ⚠️ Main listing page manifest is heavy                    |
| `/` (home)           | 417.9 KB      |                                                           |
| `/patrocina`         | 395.7 KB      |                                                           |

**Root cause**: Every `"use client"` component imported into a route's tree gets registered in that route's manifest, even if conditionally rendered. The barrel file safeguard is in place (per project docs), but the sheer number of client components across shared layouts contributes to this.

---

## 2. Core Web Vitals (Production CrUX Data)

### Desktop (28-day p75)

| Metric | Value    | Threshold | Status       |
| ------ | -------- | --------- | ------------ |
| LCP    | **2.2s** | < 2.5s    | ✅ Good      |
| INP    | **82ms** | < 200ms   | ✅ Good      |
| CLS    | **0.01** | < 0.1     | ✅ Excellent |
| FCP    | **1.0s** | < 1.8s    | ✅ Excellent |
| TTFB   | N/A      | —         | —            |

### Mobile (28-day p75)

| Metric | Value     | Threshold | Status                                 |
| ------ | --------- | --------- | -------------------------------------- |
| LCP    | **2.4s**  | < 2.5s    | ✅ Good (but close to threshold)       |
| INP    | **194ms** | < 200ms   | ⚠️ **Borderline** — 6ms from threshold |
| CLS    | **0.02**  | < 0.1     | ✅ Excellent                           |
| FCP    | **1.5s**  | < 1.8s    | ✅ Good                                |
| TTFB   | **1.1s**  | < 0.8s    | ⚠️ **Needs improvement**               |

---

## 3. npm Package Weight Analysis

| Package             | node_modules Size | In Bundle?        | Tree-shakeable?                              |
| ------------------- | ----------------- | ----------------- | -------------------------------------------- |
| `@sentry/nextjs`    | **102 MB**        | Yes (lazy replay) | Configured with treeshake options ✅         |
| `date-fns`          | **38 MB**         | Yes               | Tree-shakeable + `optimizePackageImports` ✅ |
| `@heroicons/react`  | **21 MB**         | Yes               | `optimizePackageImports` ✅                  |
| `react-datepicker`  | 3.9 MB            | Yes               | `optimizePackageImports` ✅                  |
| `@headlessui/react` | 2.0 MB            | Yes               | `optimizePackageImports` ✅                  |
| `react-select`      | 1.1 MB            | Yes               | `optimizePackageImports` ✅                  |
| `react-tooltip`     | 892 KB            | Yes               | `optimizePackageImports` ✅                  |
| `zod`               | 832 KB            | Server only       | ✅                                           |
| `swr`               | 472 KB            | Client            | Lightweight ✅                               |
| `react-share`       | 368 KB            | Yes               | `optimizePackageImports` ✅                  |
| `zustand`           | 244 KB            | Client            | Lightweight ✅                               |

---

## 4. Current Optimizations Already in Place ✅

The project has many performance best practices already implemented:

1. **React Compiler** enabled (`reactCompiler: true`)
2. **Inline CSS** experimental feature enabled
3. **Scroll Restoration** enabled
4. **`optimizePackageImports`** configured for all heavy packages
5. **Sentry tree-shaking** configured (removeDebugLogging, removeTracing, excludeReplayIframe, excludeReplayShadowDOM)
6. **Sentry Session Replay lazy-loaded** via dynamic import (~60KB savings)
7. **Image optimization**: AVIF/WebP formats, quality caps (35-85 range), aggressive Cache-Control (1 year)
8. **Console removal** in production
9. **Source maps hidden** from production
10. **Standalone output** for efficient Docker deployment
11. **CSS minification** via cssnano + PostCSS
12. **Server-first components** — `"use client"` only at leaf level
13. **No barrel file re-exports** policy
14. **Service Worker** for offline + caching
15. **Google Analytics/Ads** loaded with `strategy="lazyOnload"`

---

## 5. Recommendations

### 🔴 HIGH PRIORITY

#### 5.1 Mobile INP is Borderline (194ms vs 200ms threshold)

**Impact**: Risk of failing Core Web Vitals on mobile.  
**Cause**: Likely from heavy client-side JavaScript execution during interaction.  
**Actions**:

- Audit the main interaction handlers on listing pages (filter changes, scroll events, SWR refetches)
- Consider debouncing filter interactions that trigger data refetches
- Profile with Chrome DevTools Performance panel on a throttled mobile device
- Review if `react-datepicker` and `react-select` render states can be deferred (lazy mount on interaction)

#### 5.2 Mobile TTFB is 1.1s (threshold: 0.8s)

**Impact**: Directly delays LCP and FCP on mobile.  
**Cause**: Server response time, likely from edge function cold starts or API fetch latency.  
**Actions**:

- Evaluate if the ISR `s-maxage` values can be increased for high-traffic routes to reduce origin hits
- Consider stale-while-revalidate patterns more aggressively for listing pages
- Monitor Docker container memory/CPU usage and adjust Coolify resource limits if needed
- Evaluate PPR (Partial Prerendering) for the `/[place]` route to serve a static shell instantly

#### 5.3 `/[place]` Server Bundle Grew +6.7%

**Impact**: Increased server processing time for the most-visited route.  
**Cause**: Additional client components or new imports in the listing page tree.  
**Actions**:

- Audit recent changes to `/[place]` page and its component tree
- Check if any new `"use client"` components leaked into the manifest (currently 430.8 KB)
- Review if `/patrocina`-specific components are still isolated (per the Feb 2026 barrel file incident)

### 🟡 MEDIUM PRIORITY

#### 5.4 Client Reference Manifests are Oversized

**Impact**: Server-side overhead on every request to deserialize these manifests.  
**Cause**: `/e/[eventId]` has a 511.9 KB manifest — one of the largest. Every `"use client"` component transitively imported into shared layouts bloats ALL route manifests.  
**Actions**:

- Audit `app/layout.tsx` for client component imports — each one registered in EVERY route's manifest
- Consider splitting the root layout to reduce shared client component surface area
- Check if `GoogleScripts.tsx` and `GoogleScriptsHeavy.tsx` (loaded in layout) inflate the manifest
- Investigate if Sentry's `captureRouterTransitionStart` export creates unnecessary client module registrations

#### 5.5 Largest Client Chunk at 221 KB

**Impact**: Impacts initial page load parse time.  
**Cause**: Single shared chunk containing framework + shared module code.  
**Actions**:

- With Turbopack, chunk splitting is automatic, but review if `splitChunks` customization via webpack could help for the non-Turbo build path
- Consider if the 221 KB chunk serves multiple routes — if so, it may be acceptable as a shared cache-friendly chunk
- Monitor this in future builds; if it grows, investigate what's being added

#### 5.6 date-fns Contributing ~153 KB Chunk

**Impact**: The `f6f7cc1eb4e83efd.js` chunk (153.7 KB) appears to contain date formatting/locale data.  
**Actions**:

- Verify if only needed date-fns functions are imported (not wildcard `import * from 'date-fns'`)
- Check if all locale data imported is actually used — date-fns v4 should tree-shake well with `optimizePackageImports`
- Consider using only the `ca` locale for Catalan and lazy-loading `es`/`en` locales

#### 5.7 CSS Could Be Smaller

**Impact**: 73.6 KB main CSS with 615 unique selectors.  
**Tailwind v3.3.6** is being used — consider upgrading to **Tailwind v4** which has better tree-shaking and smaller output.  
**Actions**:

- Audit if all 615 selectors are actually used (Tailwind's purge should handle this, but custom CSS in `globals.css` may add unused rules)
- The design system semantic classes (`.heading-1`, `.btn-primary`, etc.) add CSS — ensure they're all actively used
- Consider running a CSS coverage tool to identify unused rules

### 🟢 LOW PRIORITY / MONITORING

#### 5.8 Build Output Size (1.4 GB)

The `.next/` directory is 1.4 GB total, primarily from Turbopack cache files. The standalone bundle at 117 MB is reasonable for a feature-rich app. The server directory at 95 MB contains route manifests and compiled server code. **No action needed**, but monitor for growth.

#### 5.9 `/sitemap` Route at 1.55 MB Server Bundle

Sitemap routes don't need client interactivity. Verify that no unnecessary client components are being pulled into the sitemap route's server bundle.

#### 5.10 Duplicate-Size Chunks (Not Actual Duplicates)

Two pairs of chunks have identical sizes but different content (verified by MD5). These are likely locale-specific variants (ca/es/en). **No action needed**.

#### 5.11 Consider Next.js 16 PPR for Listing Pages

Partial Prerendering could serve static shells for `/[place]` instantly while streaming dynamic content. This would significantly improve TTFB and LCP on mobile. However, PPR is still experimental — evaluate when stable.

---

## 6. Metrics Dashboard Summary

```
┌─────────────────────────────────────────────────┐
│         PERFORMANCE SCORECARD (Mar 2026)        │
├─────────────────────────────────────────────────┤
│ CWV Desktop:   ✅ PASSED                        │
│ CWV Mobile:    ✅ PASSED (borderline INP)        │
│ Bundle Trend:  ✅ IMPROVING (-22.8% since Dec)   │
│ Client JS:     ⚠️  2.16 MB (65 chunks)           │
│ CSS:           ✅ 95 KB (2 files, minified)      │
│ Server Bundle: ⚠️  /[place] grew +6.7%           │
│ Manifests:     ⚠️  Up to 511 KB per route         │
│ Optimizations: ✅ 15/15 best practices applied   │
└─────────────────────────────────────────────────┘
```

---

## 7. Prioritized Action Items

| #   | Priority | Action                                                                    | Expected Impact                 |
| --- | -------- | ------------------------------------------------------------------------- | ------------------------------- |
| 1   | 🔴       | Profile and reduce mobile INP (debounce interactions, lazy-mount pickers) | Keep INP under 200ms threshold  |
| 2   | 🔴       | Investigate TTFB 1.1s on mobile (cold starts, ISR cache TTLs)             | Improve to < 0.8s               |
| 3   | 🔴       | Audit `/[place]` server bundle growth (+6.7%)                             | Prevent further regression      |
| 4   | 🟡       | Reduce client reference manifest sizes (audit layout client imports)      | -100-200 KB per route manifest  |
| 5   | 🟡       | Investigate 221 KB largest chunk composition                              | Potential -50-100 KB savings    |
| 6   | 🟡       | Audit date-fns locale imports                                             | Potential -30-50 KB savings     |
| 7   | 🟡       | CSS coverage audit + consider Tailwind v4                                 | Potential -10-20 KB CSS savings |
| 8   | 🟢       | Evaluate PPR for listing pages when stable                                | Major TTFB improvement          |
| 9   | 🟢       | Review sitemap route server bundle (1.55 MB)                              | Reduce server overhead          |

---

## 8. INP Deep Dive: `/[place]` Listing Page Client-Side Investigation

Mobile INP is at **194ms** (p75) — only 6ms from the "needs improvement" threshold of 200ms. This section documents every client-side component and interaction path on the `/[place]` route to identify where those milliseconds are spent.

### 8.1 Component Tree on `/[place]`

```
PlacePageShell (Server)
├── FilterLoadingProvider (Client context — wraps everything)
│   ├── PlacePageContent (Server — awaits data, renders SSR list)
│   │   ├── FilterLoadingGate (Client — shows skeleton when isLoading)
│   │   │   └── HybridEventsList (Server)
│   │   │       ├── HeadingLayout (Server)
│   │   │       ├── SearchAwareHeading (Client — uses useUrlFilters → useSearchParams)
│   │   │       ├── SponsorBannerSlot (Server)
│   │   │       ├── SsrListWrapper (Client — uses useUrlFilters → useSearchParams)
│   │   │       │   └── List > CardServer (Server-rendered cards)
│   │   │       └── HybridEventsListClient (Client — uses useUrlFilters + useEvents/SWR)
│   │   │           └── ClientCardsList (Client, dynamic import)
│   │   │               └── List > Card > CardContentClient (Client)
│   │   ├── PlacePageExploreNav (Server, dynamic)
│   │   └── ExploreNearby (Server, dynamic)
│   └── LazyClientInteractiveLayer (Client, dynamic import, ssr: false)
│       └── ClientInteractiveLayerContent (Client)
│           ├── Search (Client — uses useSearchParams)
│           ├── FiltersClient (Client — synchronous FilterOperations calls)
│           │   └── FilterButton × N (Client — each has router.push handler)
│           └── NavigationFiltersModal (Client, dynamic import, ssr: false)
│               └── Select (react-select, dynamic, ssr: false)
```

### 8.2 `useSearchParams` Cascade (Primary INP Concern)

> **Status: Mitigated in this PR.** A shared `UrlFiltersProvider` context now deduplicates `useSearchParams` subscriptions, reducing 4 independent parse calls to 1. See Fix 2 (§8.15) and `UrlFiltersContext.tsx`.

**Finding**: `useSearchParams()` from Next.js re-renders **every subscriber** when search params change. On the `/[place]` route, **6 independent components** subscribe to `useSearchParams`:

| Component                       | Via                                     | Purpose                                      |
| ------------------------------- | --------------------------------------- | -------------------------------------------- |
| `FilterLoadingContext`          | Direct `useSearchParams()`              | Detects param changes → clears loading state |
| `Search`                        | Direct `useSearchParams()`              | Syncs input value with `?search=` param      |
| `SsrListWrapper`                | `useUrlFilters()` → `useSearchParams()` | Hides SSR list when client filters active    |
| `SearchAwareHeading`            | `useUrlFilters()` → `useSearchParams()` | Enhances heading with search term            |
| `HybridEventsListClient`        | `useUrlFilters()` → `useSearchParams()` | Extracts filter values for SWR fetch         |
| `ClientInteractiveLayerContent` | `useUrlFilters()` → `useSearchParams()` | Parses URL for filter display state          |

**INP impact**: When a user triggers a URL change (e.g., clicking a filter pill's X to remove it, or pressing Enter on search), `router.push()` updates `searchParams`. This triggers a **synchronous cascade** where all 6 subscribers re-render in the same frame. Each re-render runs `useUrlFilters()` which calls `extractURLSegments()` + `parseFiltersFromUrl()` synchronously — not expensive individually, but **4 duplicate calls** in one frame adds up.

**Quantified estimate**: Each `useUrlFilters()` call does string splitting, array operations, slug validation. ~1-2ms each × 4 = ~4-8ms of duplicated synchronous work per interaction.

### 8.3 `FilterOperations` in `FiltersClient` (Synchronous Hot Path)

**File**: [FiltersClient.tsx](components/ui/filters/FiltersClient.tsx)

On every render, `FiltersClient` executes these synchronous operations:

```
FilterOperations.getAllConfigurations()       // array creation
FilterOperations.hasActiveFilters(displayState) // iterates all configs
sortedConfigurations = visibleConfigurations
  .map(config => ({                           // map over 4-5 configs
    config,
    enabled: FilterOperations.isEnabled(config.key, displayState)  // per-config check
  }))
  .sort((a, b) => ...)                       // sort by enabled state
```

Then for each filter button, it calls:

```
FilterOperations.getDisplayText(config.key, displayState)   // per-button
FilterOperations.getRemovalUrl(config.key, segments, queryParams)  // per-button → builds URL
```

**INP impact**: `getRemovalUrl()` calls `buildFilterUrl()` for **each filter button** (4-5 buttons), which constructs URL strings synchronously. This runs on every parent re-render. Estimated ~2-4ms total.

### 8.4 `FilterButton` Click Handler (Navigation Trigger)

**File**: [FilterButton.tsx](components/ui/filters/FilterButton.tsx)

When clicking the X to remove a filter:

```typescript
handleRemove = (e) => {
  e.stopPropagation();
  sendGoogleEvent("filter_remove", {...});   // sync gtag call
  isPlainLeftClick(e);                        // sync check
  startNavigationFeedback();                  // sets global state, emits to listeners
  setLoading(true);                           // triggers FilterLoadingContext re-render
  router.push(removeUrl);                     // triggers Next.js navigation
  window.scrollTo({ top: 0, behavior: "smooth" });  // scroll
};
```

**INP impact**: This handler does 5-6 synchronous operations before yielding. Key issues:

1. `sendGoogleEvent()` calls `window.gtag()` synchronously — GA event dispatch may block for 1-5ms depending on GA queue depth
2. `setLoading(true)` triggers `FilterLoadingContext` provider re-render → all children receiving context re-render → `FilterLoadingGate` swaps to skeleton → the entire `HybridEventsList` tree unmounts/remounts
3. `router.push()` triggers `useSearchParams` cascade (see §8.2)
4. `window.scrollTo()` may trigger layout recalculation

The combination of steps 1-4 happens in a **single synchronous event handler** — no yielding or `startTransition` wrapping.

### 8.5 `Search` Component — Enter Key Handler

**File**: [search/index.tsx](components/ui/search/index.tsx)

```typescript
triggerSearch = () => {
  sendSearchTermGA(value); // sync GA call
  updateSearchUrl(value); // → startNavigationFeedback() + setLoading(true) + router.push()
};
```

**INP impact**: Same cascade as filter removal — `router.push()` triggers `useSearchParams` cascade. The `handleKeyPress` fires on `keydown` (not `keyup`), which is correct for INP but means all the synchronous work executes during the key press.

No debouncing is needed here because search is explicitly button/enter-triggered (not on-type). This is **well-designed** for INP.

### 8.6 `HybridEventsListClient` + `useEvents` Hook (SWR)

**File**: [HybridEventsListClient.tsx](components/ui/hybridEventsList/HybridEventsListClient.tsx)
**File**: [useEvents.ts](components/hooks/useEvents.ts)

**SWR configuration**:

- `suspense: !hasClientFilters` — when no client filters, uses Suspense (good, defers to React scheduler)
- `revalidateOnFocus: false` — prevents re-fetches on tab switch (good)
- `revalidateIfStale: hasClientFilters` — only re-validates when filters are active
- `dedupingInterval: 10000` — 10s dedup window (good)
- `keepPreviousData: !hasClientFilters` — avoids flash of empty state

**On filter change**: When `useSearchParams` updates, `HybridEventsListClient` re-renders via `useUrlFilters()`. The `useMemo` for `currentKey` re-evaluates, SWR key changes if filters changed, and SWR fires an async fetch. The SWR fetch itself is async and won't block INP.

However, the **synchronous work per render** includes:

- `useUrlFilters()` parsing (~1-2ms)
- `useMemo` for `realInitialEvents` — filters `initialEvents` array (~0.5ms for 12 events)
- `useMemo` for `displayedEvents` — dedup logic with `Set` operations (~0.5ms)
- `useMemo` for `notFoundTitle` — string concatenation (~0ms)

**INP impact**: Low individually (~2-3ms), but this runs as part of the 6-component cascade from §8.2.

### 8.7 `LoadMoreButton` — Uses `useTransition` ✅

**File**: [loadMoreButton/index.tsx](components/ui/loadMoreButton/index.tsx)

```typescript
const [isPending, startTransition] = useTransition();
const handleLoadMore = () => {
  startTransition(() => {
    void onLoadMore();
  });
};
```

**INP impact**: **Well-optimized**. The `useTransition` wrapping ensures the SWR `setSize` call and subsequent re-render are treated as a non-urgent update, yielding back to the browser before the next paint. This is the correct pattern for INP.

### 8.8 `useNavbarVisible` — IntersectionObserver ✅

**File**: [useNavbarVisible.ts](components/hooks/useNavbarVisible.ts)

Uses `IntersectionObserver` (not scroll events) to detect navbar visibility. Falls back to a scroll listener only if IO is unavailable, with `{ passive: true }`.

**INP impact**: Negligible. IntersectionObserver callbacks fire asynchronously and the `setVisible()` call is a simple boolean state update.

### 8.9 `useHydration` — requestAnimationFrame ✅

**File**: [useHydration.ts](components/hooks/useHydration.ts)

```typescript
useEffect(() => {
  const id = requestAnimationFrame(() => setHydrated(true));
  return () => cancelAnimationFrame(id);
}, []);
```

**INP impact**: None. Fires once after mount via rAF, single boolean state update.

### 8.10 `react-datepicker` and `react-select` on `/[place]`

**Finding**: Neither `react-datepicker` nor the full `react-select` component is directly imported on the `/[place]` route tree.

- **`react-select`**: Only imported in `NavigationFiltersModal` via `dynamic(() => import(...), { ssr: false })`. The modal itself is dynamically imported and only renders when `isModalOpen === true`. So react-select is **lazy-loaded on demand**, not during initial page interaction.
- **`react-datepicker`**: Only imported in `EventForm` which is used on `/publica` and `/e/[eventId]/edita` — **not on `/[place]` at all**.

**INP impact**: None for typical filter pill clicks. However, if a user opens the filters modal, the dynamic import of `react-select` could cause a brief parse/compile jank on low-end mobile devices (~50-100ms for the first open).

### 8.11 `FilterLoadingGate` — Full Tree Swap

**File**: [FilterLoadingGate.tsx](components/ui/common/FilterLoadingGate.tsx)

```typescript
if (isLoading) return <EventsListSkeleton />;
return <>{children}</>;
```

**INP impact**: When `setLoading(true)` is called in a filter handler, this gates the **entire** `HybridEventsList` tree. React must:

1. Unmount the current events list (12+ cards with images, links, date formatting)
2. Mount the skeleton
3. Later, when navigation completes and `setIsLoading(false)` fires, unmount skeleton and remount the full tree

The initial swap (events → skeleton) runs synchronously during the interaction frame. Unmounting 12+ `CardContentClient` components involves cleaning up their React state, translated strings, and computed values. Estimated **10-30ms** on mid-range mobile.

### 8.12 Zustand Store — Minimal ✅

**File**: [store.ts](store.ts)

```typescript
const useStore = create<Store>()(persist((set) => ({
  openModal: false,
  hydrated: false,
  userLocation: null,
  setState: (key, value) => { ... },
  setHydrated: () => { ... },
}), { ... }));
```

**INP impact**: None. The store is minimal (3 state properties), with no selectors, no derived state, and no heavy computations. The `setState` function even has an equality check to bail out early. The store is not used in any hot interaction path on `/[place]`.

### 8.13 `usePressFeedback` — Per-Button Overhead

**File**: [usePressFeedback.ts](components/hooks/usePressFeedback.ts)

Each `FilterButton` instantiates `usePressFeedback()` which registers 5 event handlers (`onPointerDown`, `onPointerUp`, `onPointerLeave`, `onBlur`, `onKeyDown`). With 4-5 filter buttons, that's 20-25 event handlers.

**INP impact**: Low. The handlers do simple `setIsPressed(true/false)` calls. But the hook uses `useState` (not `useRef`) for `isPressed`, meaning each pointer event triggers a re-render of the FilterButton. Since these handlers fire on `pointerdown` (before click), the re-render adds ~1-2ms before the click handler runs.

### 8.14 Summary: INP Budget Breakdown for Filter Removal Interaction

> **Status: Baseline captured pre-optimization.** Fixes 1-3 from §8.15 were implemented in this PR, reducing the estimated budget by ~30-70ms on mobile. The table below documents the original baseline for comparison.

Estimated synchronous work when user clicks X to remove a filter pill:

| Step                           | Source                            | Est. Duration |
| ------------------------------ | --------------------------------- | ------------- |
| 1. `sendGoogleEvent()`         | GA gtag dispatch                  | 1-5ms         |
| 2. `startNavigationFeedback()` | Listener emit                     | <1ms          |
| 3. `setLoading(true)`          | React context update              | <1ms          |
| 4. FilterLoadingGate tree swap | Unmount 12+ cards, mount skeleton | 10-30ms       |
| 5. `router.push()`             | Next.js soft navigation start     | 5-15ms        |
| 6. `useSearchParams` cascade   | 4-6 components re-render          | 8-20ms        |
| 7. Each `useUrlFilters()`      | URL parsing × 4 duplicates        | 4-8ms         |
| 8. `FiltersClient` re-render   | FilterOperations calls            | 2-4ms         |
| 9. `window.scrollTo()`         | Layout recalc                     | 1-5ms         |
| **Total estimated**            |                                   | **32-89ms**   |

On a mid-range mobile device (4× CPU slowdown), multiply by ~3-4×: **100-350ms**. This aligns with the observed p75 of 194ms.

### 8.15 Recommended Fixes (Priority Order)

> **Status: Fixes 1-3 implemented in this PR.** Fix 1 (`startTransition` wrapping) applied in `FilterButton` and `Search`. Fix 2 (`UrlFiltersProvider`) eliminates duplicate parsing. Fix 3 (`FilterLoadingGate` CSS opacity) avoids skeleton swap DOM churn. Fixes 4-5 remain as future optimizations.

#### Fix 1: Wrap filter removal in `startTransition` (High Impact)

The `FilterButton.handleRemove()` and `Search.triggerSearch()` handlers should wrap state updates in `startTransition` to let React yield before committing the tree swap:

```typescript
// In FilterButton.tsx
import { startTransition } from "react";

const handleRemove = (e) => {
  e.stopPropagation();
  sendGoogleEvent(...);
  startTransition(() => {
    setLoading(true);
    router.push(removeUrl);
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
};
```

**Expected gain**: 20-40ms on mobile. React can yield between component unmounts.

#### Fix 2: Deduplicate `useUrlFilters` calls (Medium Impact)

4 components independently call `useUrlFilters()` which each run `extractURLSegments()` + `parseFiltersFromUrl()`. Consider:

- Lifting parsed filter state into `FilterLoadingContext` (already wraps everything)
- Or using a shared context at the `PlacePageShell` level that parses once and provides to children

**Expected gain**: 3-6ms saved per interaction (eliminates 3 redundant parses).

#### Fix 3: Defer `FilterLoadingGate` skeleton swap (Medium Impact)

Instead of immediately swapping the event list for a skeleton, consider:

- Using CSS opacity/blur transition (keeps DOM in place, no unmount/mount)
- Or adding `startTransition` around `setLoading` calls

This avoids the expensive unmount of 12+ card components during the interaction frame.

**Expected gain**: 10-25ms on mobile (avoids synchronous unmount).

#### Fix 4: Move `sendGoogleEvent` to `requestIdleCallback` (Low Impact)

```typescript
const handleRemove = (e) => {
  e.stopPropagation();
  requestIdleCallback(() => sendGoogleEvent("filter_remove", {...}));
  // ... rest of handler
};
```

**Expected gain**: 1-5ms (removes GA dispatch from critical path).

#### Fix 5: Precompute `getRemovalUrl` with `useMemo` in `FiltersClient` (Low Impact)

Currently `FilterOperations.getRemovalUrl()` is called per-button on every render. Memoize the removal URLs:

```typescript
const removalUrls = useMemo(() => {
  const urls: Record<string, string> = {};
  for (const config of visibleConfigurations) {
    urls[config.key] = FilterOperations.getRemovalUrl(
      config.key,
      segments,
      queryParams,
    );
  }
  return urls;
}, [visibleConfigurations, segments, queryParams]);
```

**Expected gain**: 1-3ms on subsequent renders (URL construction avoided if segments/params unchanged).

---

_Report generated from: `yarn analyze:experimental`, `analyze:cli`, `analyze:api`, PageSpeed Insights CrUX (production), and Next.js experimental bundle analyzer at `localhost:4000`._
