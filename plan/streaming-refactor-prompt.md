# Streaming Refactor: "Push Dynamic Access Down"

## Prompt for AI Agent

You are refactoring the Next.js 16 App Router application at `que-fer/` to implement proper React streaming SSR using the "push dynamic access down" pattern from the Next.js streaming guide (https://nextjs.org/docs/app/guides/streaming).

---

## Background & Problem

### What we already fixed (don't redo this)
We removed an unnecessary outer `<Suspense fallback={null}>` from `app/[locale]/layout.tsx` that was wrapping `<AdProvider>` + `<BaseLayout>` (nav/main/footer). This caused crawlers to see empty `<main>` (0 chars, 0 headings) because React deferred all structural HTML into streaming `<script>` tags. After removing it, crawlers see 7,031 chars of visible text, 2 h1s, 18 h2s, nav, footer.

**Current state**: Layout sends all structural HTML (nav, footer) immediately. But pages are still **blocking** — they `await` all data before rendering anything. The "Blocking Route" Next.js warning fires because `getLocaleSafely()` → `headers()` is called without a Suspense boundary.

### The goal of THIS refactor
Convert async pages from "await everything then render" to "render sync shell immediately, stream data via Suspense". This gives:
1. **Instant TTFB** — static shell (headings, skeleton UI) flushes immediately
2. **Better streaming** — data-dependent content streams in as it resolves
3. **Crawler-safe** — shell contains headings, nav, links before data arrives
4. **No "Blocking Route" warning** — dynamic access is inside Suspense boundaries

---

## Current Architecture

### Layout (`app/[locale]/layout.tsx`)
- Async. Awaits `rootLocale()`, `getMessages()`. Renders `<html>`, `<body>`, providers.
- `<BaseLayout>` (sync) renders `<Navbar />`, `<main>{children}</main>`, `<Footer />`.
- `<Suspense fallback={null}>` only wraps `<GoogleScripts />`.
- **No outer Suspense** — this is correct, don't add one back.

### BaseLayout (`components/ui/layout/base/index.tsx`)
- Sync component. `<Navbar />` + `<main>` + `<Footer />` with inner Suspense around NavigationProgress and Footer.

### Dynamic trigger
- `getLocaleSafely()` in `utils/i18n-seo.ts` calls `headers()` — this makes every page that calls it dynamic.
- `generatePagesData()` calls `getLocaleSafely()` internally.
- `rootLocale()` from `next/root-params` is also async but is a Next.js primitive.

---

## Pages to Refactor (Priority Order)

### 1. Homepage (`app/[locale]/page.tsx`) — HIGH PRIORITY
**Current**: Async. `await Promise.all([getTranslations×2, generatePagesData])`. Then renders h1, noscript block, JSON-LD, `<ServerEventsCategorized>`.
**Already good**: Passes `categorizedEventsPromise` and `categoriesPromise` as unwrapped promises to `<ServerEventsCategorized>`.
**Refactor**:
- Make the page component sync (or minimal async for `rootLocale()` only).
- Move `generatePagesData()` and translations into a separate async component wrapped in `<Suspense>`.
- The h1, hero, and structural HTML should render in the sync shell.
- `<ServerEventsCategorized>` already accepts promises — keep that pattern.

### 2. Place page (`app/[locale]/[place]/page.tsx`) — HIGH PRIORITY
**Current**: Async. Awaits `params`, `getLocaleSafely()`, checks `categoriesPromise` for redirect.
**Already good**: Passes `eventsPromise`, `placeShellDataPromise` as promises to `<PlacePageShell>`.
**Refactor**:
- Split redirect logic (needs await) from rendering.
- Wrap data-dependent parts in Suspense with skeleton fallbacks.

### 3. Place+Date page (`app/[locale]/[place]/[byDate]/page.tsx`) — MEDIUM
**Current**: Awaits everything (params, locale, translations, generatePagesData, categories, events, insertAds) then passes results to `<PlacePageShell>`.
**Refactor**:
- Convert to promise-passing pattern like homepage/place page.
- Wrap data-fetching in Suspense with skeleton fallback.

### 4. Place+Date+Category page (`app/[locale]/[place]/[byDate]/[category]/page.tsx`) — MEDIUM
**Current**: Same waterfall pattern as [byDate].
**Refactor**: Same approach.

### 5. Event detail (`app/[locale]/e/[eventId]/page.tsx`) — MEDIUM
**Current**: Heaviest page. Awaits `getEventBySlug`, `connection()`, 8× `getTranslations`, JSON-LD generation, image sources.
**Already has**: 2 Suspense boundaries (LazyRestaurantPromotion, LatestNewsSection).
**Refactor**:
- Render event shell (title, basic metadata) immediately.
- Stream heavier content (translations, JSON-LD, related events, news) via Suspense.

### 6. News pages (`app/[locale]/noticies/page.tsx`, `noticies/[place]/page.tsx`) — LOW
**Current**: Async, awaits locale + translations. Light data.
**Refactor**: Move translations into Suspense child.

### 7. Static pages (qui-som, patrocina, preferits, legal) — SKIP
These only await locale + translations. Not worth the complexity.

---

## Pattern to Follow

### Before (blocking):
```tsx
export default async function Page() {
  const locale = await rootLocale();
  const [t, pageData] = await Promise.all([
    getTranslations({ locale, namespace: "App.Home" }),
    generatePagesData({ place: "", byDate: "" }),
  ]);
  
  return (
    <>
      <h1>{pageData.title}</h1>
      <DataHeavyComponent data={pageData} />
    </>
  );
}
```

### After (streaming):
```tsx
export default async function Page() {
  const locale = await rootLocale();
  // Start promises but don't await
  const pageDataPromise = generatePagesData({ place: "", byDate: "" });
  const translationsPromise = getTranslations({ locale, namespace: "App.Home" });

  return (
    <>
      {/* Sync shell — renders immediately */}
      <StaticHeading />  {/* or known-at-build-time content */}
      
      {/* Async content — streams when ready */}
      <Suspense fallback={<Skeleton />}>
        <DynamicContent 
          pageDataPromise={pageDataPromise}
          translationsPromise={translationsPromise}
        />
      </Suspense>
    </>
  );
}

// This component awaits the promises
async function DynamicContent({ pageDataPromise, translationsPromise }) {
  const [pageData, t] = await Promise.all([pageDataPromise, translationsPromise]);
  return <DataHeavyComponent data={pageData} />;
}
```

---

## Critical Rules

1. **NEVER add `searchParams` to listing pages** (`app/[place]/*`) — caused $300 cost spike. Keep them static/ISR.
2. **NEVER add outer Suspense back to layout.tsx** — we just removed it. Nav/main/footer must be in initial HTML flush.
3. **All types in `/types` directory** — never inline.
4. **Server Components by default** — `"use client"` only at leaves.
5. **Use `Link` from `@i18n/routing`** — never `next/link`.
6. **Semantic design classes** — never `gray-*`.
7. **Don't break existing Suspense boundaries** in PlacePageShell, event detail, etc. — extend them.
8. **Test each page individually** — `curl -s http://localhost:3000/<route>` and verify structural HTML is in initial flush.
9. **`generatePagesData` calls `headers()` internally** — it MUST be inside a Suspense boundary or the "Blocking Route" warning persists.
10. **`cacheComponents` determinism** — any component using `new Date()` for conditional rendering must call `await connection()` first.
11. **Skeleton fallbacks should be meaningful** — not `null`. Show layout structure (heading placeholders, list skeletons).

## Verification

After each page refactor:
```bash
# 1. Typecheck
yarn typecheck

# 2. Start dev server
yarn dev

# 3. Check initial HTML contains structural content
curl -s http://localhost:3000/<route> | python3 -c "
import re, sys
html = sys.stdin.read()
no_script = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL)
main = re.search(r'<main[^>]*>(.*?)</main>', no_script, re.DOTALL)
main_text = re.sub(r'<[^>]+>', ' ', main.group(1)).strip() if main else ''
h1 = len(re.findall(r'<h1[^>]*>', no_script))
h2 = len(re.findall(r'<h2[^>]*>', no_script))
nav = len(re.findall(r'<nav[^>]*>', no_script))
print(f'main:{len(main_text)} h1:{h1} h2:{h2} nav:{nav}')
assert len(main_text) > 100, 'FAIL: main content too small'
assert h1 >= 1, 'FAIL: no h1 in initial HTML'
assert nav >= 1, 'FAIL: no nav in initial HTML'
print('PASS')
"

# 4. Check TTFB didn't regress
curl -s -o /dev/null -w 'TTFB:%{time_starttransfer}s Total:%{time_total}s\n' http://localhost:3000/<route>

# 5. Check no "Blocking Route" warning (ideally)
# The warning should only appear if dynamic access is outside Suspense

# 6. Run tests
yarn test
```

## Scope
- Do NOT refactor layout.tsx — it's already correct.
- Do NOT touch static pages (qui-som, patrocina, legal, offline).
- Do one page at a time, verify, then move to next.
- Start with homepage (most visible, already partially using promise-passing).
