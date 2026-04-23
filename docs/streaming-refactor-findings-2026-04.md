# Streaming Refactor — Findings & Implementation Notes

Complements [`../plan/streaming-refactor-prompt.md`](../plan/streaming-refactor-prompt.md). Documents what was actually implemented, what was verified, and remaining trade-offs.

**Branch**: `feat/streaming-push-dynamic-access-down`
**Date**: 2026-04-23
**Next.js**: 16.2.1 (Turbopack, PPR, `cacheComponents: true`)

---

## Problem (measured, not theoretical)

On PR-269 before this fix, the PPR static shell of the homepage contained:

| Route | Static shell chars | `<h1>` | `<noscript>` |
| ----- | ------------------ | ------ | ------------ |
| `/`   | 52 (just navbar)   | 0      | 0            |
| `/es` | 52                 | 0      | 0            |
| `/en` | 52                 | 0      | 0            |

Production `www.esdeveniments.cat` showed the same pattern (pre-existing issue, not a PR-269 regression).

### Root cause

With PPR + `cacheComponents: true`, **any `async Page()` function has its entire JSX return serialized as the RSC streaming payload**. Only sync content rendered *before* any `await` goes into the static HTML shell.

The homepage was:

```tsx
export default async function Page() {
  const locale = await rootLocale();                 // ← first await
  const [t, tTopAgenda, pageData] = await Promise.all([/* … */]);
  // …
  return <>{/* h1, noscript, navigation schema, events */}</>;  // ← all streamed, nothing in shell
}
```

Crawlers that don't execute JS (some SEO tools, older social bots, LLM scrapers without `text/html` rendering) see only the static shell → empty body.

---

## Fix — "Push dynamic access down"

Reference: [Next.js streaming guide — Push dynamic access down](https://nextjs.org/docs/app/guides/streaming#push-dynamic-access-down).

### Pattern

1. Make `Page()` **sync**. All `await`s go below.
2. Return the static SEO-critical content (`<h1>`, `<noscript>`, hero preload) directly in JSX — this lands in the static HTML shell.
3. Wrap all async/data-dependent work in `<Suspense>` children — these stream in.

### Implementation on [`app/[locale]/page.tsx`](../app/[locale]/page.tsx)

```tsx
// Locale resolved synchronously via React 19's use() on params
export default function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  return (
    <>
      <link rel="preload" as="image" href="/static/images/hero-castellers.webp" />
      <Suspense fallback={<HomeStaticFallback locale={locale as AppLocale} />}>
        <HomeContent />
      </Suspense>
    </>
  );
}

// Sync; no async access; renders into PPR static shell
function HomeStaticFallback({ locale }: { locale: AppLocale }) {
  const content = STATIC_FALLBACK_CONTENT[locale] ?? STATIC_FALLBACK_CONTENT.ca;
  return (
    <>
      <h1 className="sr-only">{content.h1}</h1>
      <noscript>…</noscript>
    </>
  );
}

// All async work here; streams in after shell
async function HomeContent() {
  const locale = (await rootLocale()) as AppLocale;
  // … fetch events, translations, schema, render <ServerEventsCategorized>
}
```

### Key discoveries

- **Suspense fallback IS the static shell**: the `fallback` prop of `<Suspense>` is what gets prerendered; the child stays as a streaming hole. This is the correct "push down" primitive.
- **`use(params)` is sync-usable in Page**: React 19's `use()` unwraps the `params` promise without triggering Suspense, because Next.js has already resolved `params` for each static route (via `generateStaticParams` equivalent for `[locale]`).
- **`html lang` comes from the layout**: verified it correctly matches per-locale static shells (`/es` → `lang="es"`, `/en` → `lang="en"`).

---

## Results (measured on this branch)

Local production build (`yarn build` + `node .next/standalone/server.js`):

| Route | Static shell chars | `<h1>` | `<noscript>` | `html lang` | H1 language |
| ----- | ------------------ | ------ | ------------ | ----------- | ----------- |
| `/` (ca) | **609** | 1 | 1 | `ca` | Catalan ✅ |
| `/es` | **625** | 1 | 1 | `es` | Spanish ✅ |
| `/en` | **573** | 1 | 1 | `en` | English ✅ |

All routes still show `◐` (Partial Prerender) in `yarn build` output — PPR is preserved.

### CI verification

- `yarn typecheck` — 0 errors
- `yarn lint` — 0 errors (only pre-existing warnings unrelated to this change)
- `yarn test` — 1763/1763 tests pass (Vitest unit + integration)

Not run locally: e2e (`yarn test:e2e`) — requires full environment setup.

---

## Known trade-offs

### 1. Hardcoded fallback strings (violates `i18n-best-practices` skill)

`STATIC_FALLBACK_CONTENT` duplicates strings that also exist in `messages/*.json`. This is **intentional**:

- The fallback must render synchronously (PPR static shell constraint)
- `getTranslations()` from `next-intl/server` is async
- Reading translations sync would require either bundling them inline or a custom loader

**Mitigation**: strings are SEO-critical text that rarely changes. If translations in `messages/*.json` are updated, these need manual sync. Consider extracting to a small sync-safe dictionary file if this becomes a maintenance burden.

### 2. No error-boundary handling for HomeContent

If `HomeContent` throws on server, the fallback persists as the final UI. This is not worse than the previous behavior (which also had no explicit error boundary), but it's worth noting.

**Mitigation**: Next.js `error.tsx` conventions handle this at route level if needed.

### 3. Brief fallback flash for JS-enabled users

For a user with JS enabled on a slow connection, the fallback `<h1>` may briefly appear with `sr-only` class before `HomeContent` replaces it. Not user-visible (screen reader only), but screen readers may announce both.

**Mitigation**: the fallback and streamed content both use `sr-only`, and the streamed `HomeContent` no longer renders a duplicate `<h1>` (removed in this refactor).

---

## Remaining work (not done in this PR)

Other pages using the same blocking pattern — same fix applies:

- `app/[locale]/[place]/page.tsx` (place listing)
- `app/[locale]/[place]/[byDate]/page.tsx`
- `app/[locale]/[place]/[byDate]/[category]/page.tsx`
- `app/[locale]/noticies/page.tsx` + `[slug]/page.tsx`
- `app/[locale]/esdeveniment/[eventId]/page.tsx`

Baseline measurement for place page: **0 chars, 0 h1, 0 noscript** in static shell.

Each page needs its own `StaticFallback` component with appropriate per-locale content and URL-param-derived text (e.g., the city/category name from `params`).

---

## Verification commands

```bash
# Build and serve
yarn prebuild && yarn build
cp -r .next/static .next/standalone/.next/static
cd .next/standalone && PORT=3000 node server.js

# Inspect static shell for each locale
for loc in ca es en; do
  python3 -c "
import re
with open(f'.next/standalone/.next/server/app/$loc.html') as f: html = f.read()
body = html[html.find('<body>')+6:]
clean = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL)
text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', clean)).strip()
h1s = re.findall(r'<h1[^>]*>.*?</h1>', clean, re.DOTALL)
print(f'/$loc: chars={len(text)} h1={len(h1s)}')
"
done

# Full response (via curl)
curl -s http://localhost:3000/es | grep -oE '<h1[^>]*sr-only[^>]*>[^<]*</h1>'
```

---

## References

- Next.js Streaming guide: https://nextjs.org/docs/app/guides/streaming
- React 19 `use()` hook: https://react.dev/reference/react/use
- [`../plan/streaming-refactor-prompt.md`](../plan/streaming-refactor-prompt.md) — original refactor plan
