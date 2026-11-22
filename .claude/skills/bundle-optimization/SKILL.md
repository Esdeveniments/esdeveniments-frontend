---
name: bundle-optimization
description: Image and bundle performance for esdeveniments.cat. Use when adding or changing images, the LCP image or its preload, card icons, prefetching, new client dependencies, or when checking bundle size, Core Web Vitals (LCP, TBT) or `yarn analyze` output.
---

# Performance: images and bundles

Measured rules and numbers are in AGENTS.md › Performance and `docs/performance/baselines.md`. This skill shows how to apply them.

## Images

External images don't use `next/image`. They go through `/api/image-proxy` (Sharp) and render as `<picture>` (WebP + JPEG fallback).

```tsx
import Image from "@components/ui/common/image"; // picks ImageServer or ClientImage

<Image image={event.imageUrl} title={event.title} context="card" />           // lazy
<Image image={event.imageUrl} title={event.title} context="list" priority />  // the one LCP image
```

- `components/ui/common/image/index.tsx` renders `ImageServer` (no image, no hydration) or `ClientImage` (retries via `useImageRetry`). Use `ImageServer` directly only where no retry is needed.
- Quality: 50 for every external image, priority or not (`getOptimalImageQuality` in `utils/image-quality.ts`). Allowed values are `images.qualities` in `next.config.js`.
- Sizes and widths: `getOptimalImageSizes(context)` and `getResponsiveWidths(context)` (`card`, `hero`, `list`, `detail`). Read the strings in `utils/image-quality.ts`; don't copy them.
- URLs: `buildResponsivePictureSourceUrls` (`utils/image-cache.ts`). Never hand-build `/api/image-proxy` URLs.
- Retries: see `components/ui/common/image/ClientImage.tsx` (`useImageRetry(2)`, `key={getImageKey(...)}`, `onError={handleError}`).
- Direct fallback: when the proxy fails on an `https` image (some council servers only accept Spanish IPs), `ClientImage` and the event hero load the original once, then show the default image. Build that URL with `directImageUrl` (drops our `v` key, string-based) and keep `referrerPolicy="no-referrer"` on those `<img>` only. It is the full original, not a resized card.

## One LCP image + preload

`priority` sets `loading="eager"` and `fetchPriority="high"`. Give it to one image per page. On listings that is the first card **with an image** (`hasCardImage`, `utils/event-helpers.ts`); ads and imageless events can't be the LCP.

Preload that same image with `<ImagePreload>` (`components/ui/common/image/ImagePreload.tsx`), passing the same `context` and `cacheKey` as the `<img>` so widths, sizes, and quality match and the browser doesn't download it twice:

```tsx
import ImagePreload from "@components/ui/common/image/ImagePreload";

<ImagePreload image={event.imageUrl} cacheKey={event.updatedAt} context="hero" />
```

`ImagePreload` is a `"use client"` leaf that calls `ReactDOM.preload()` and returns `null` (the same pattern `next/image` uses). Avoid JSX `<link rel="preload" href imageSrcSet>` in Server Components: React 19 emits both a Flight hint and the JSX tag, duplicating `<link>` elements (`facebook/react#35889`). Avoid calling `ReactDOM.preload()` directly in a Server Component inside streamed `<Suspense>` or `"use cache"`: Fizz drops the HTML `<link>` when Flight `:HL` arrives after the shell flushes.

Real code: `components/ui/common/image/ImagePreload.tsx` (shared leaf), `components/ui/common/image/CardImagePreload.tsx` (listings and festivity pages), `app/[locale]/e/[eventId]/page.tsx` (event hero), `components/noticies/NewsList.tsx` (featured news card), and `components/ui/festaMajor/FestaMajorPageView.tsx` (town hub cover). The home hero is a static AVIF/WebP set in `config/hero-image.ts` preloaded with server-side `preload()` in `app/[locale]/page.tsx`, one hint per `<picture>` source.

## Repeated icons

Icons on every card (map pin, hearts) use the sprite in `components/ui/common/IconSprite.tsx`, rendered once in the root layout:

```tsx
import { SPRITE_ICON } from "@components/ui/common/IconSprite";

<svg aria-hidden="true" className="h-4 w-4">
  <use href={`#${SPRITE_ICON.mapPin}`} />
</svg>
```

Add an icon to the sprite only if it repeats many times per page.

## Bundles

- Server Components by default and `"use client"` at the leaf (`react-nextjs-patterns`). No local re-export barrels: see `react-nextjs-patterns` › No local barrel files.
- Third-party scripts: follow the load timing in AGENTS.md › Performance (Funding Choices in `<head>`, AdSense after consent + interaction, GA `lazyOnload`).
- Client i18n: only the namespaces in `lib/i18n/client-namespaces.ts` reach the client. Add a namespace there only if a client component needs it, and to `ROUTE_CLIENT_PATHS` when only one route reads it.
- Prefetch: `partialPrefetching` is on. Never `prefetch={true}`; `PressableAnchor` defaults to `false`.
- Before adding a client dependency, check it with `yarn analyze` (or `yarn analyze:experimental`).

CI (`.github/workflows/ci.yml`) builds, runs `scripts/analyze-bundles-cli.mjs` and compares with `bundle-size-baseline.json` via `scripts/compare-bundle-sizes.mjs`; it fails on regressions above the thresholds there. Update the baseline only for intended growth.

## Cache busting

`BUILD_VERSION` (git SHA in CI/Docker, timestamp locally) is stamped into `public/sw.js` and reported by `/api/health`. There is no versioned-URL helper: `_next/static` files are content-hashed, and a changed public asset should get a new file name.

## Files

- `utils/image-quality.ts`, `utils/image-cache.ts`
- `components/ui/common/image/` (`index.tsx`, `ImageServer.tsx`, `ClientImage.tsx`, `ImagePreload.tsx`, `CardImagePreload.tsx`), `components/hooks/useImageRetry.ts`
- `components/ui/common/IconSprite.tsx`, `config/hero-image.ts`
- `next.config.js` (`images.qualities`), `bundle-size-baseline.json`
