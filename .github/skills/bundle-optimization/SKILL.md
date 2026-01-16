---
name: bundle-optimization
description: Guide for optimizing bundle size and images. Server Components by default, use image quality caps.
---

# Bundle Optimization Skill

## Purpose

Guide for optimizing bundle size and image performance. Ensure fast page loads and good Core Web Vitals.

## Bundle Analysis Commands

```bash
yarn analyze              # Full bundle analysis (client + server)
yarn analyze:browser      # Browser bundles only
yarn analyze:server       # Server bundles only
yarn analyze:experimental # Next.js 16.1 interactive analyzer (Turbopack-compatible)
```

## Image Optimization

### Quality Caps

External images use quality caps to reduce bandwidth:

| Context      | Quality | Use Case              |
| ------------ | ------- | --------------------- |
| Default      | 50      | Standard images       |
| Priority/LCP | 60      | Above-the-fold images |

### Helper Functions

```typescript
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
} from "@utils/image-helpers";

// Get quality based on context
const quality = getOptimalImageQuality("hero"); // 60
const quality = getOptimalImageQuality("card"); // 50

// Get responsive sizes
const sizes = getOptimalImageSizes("card");
// "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
```

### Image Component Usage

```tsx
import Image from "next/image";
import { getOptimalImageQuality, getOptimalImageSizes } from "@utils/image-helpers";

// ✅ CORRECT - Using helpers
<Image
  src={event.imageUrl}
  alt={event.title}
  width={400}
  height={300}
  quality={getOptimalImageQuality("card")}
  sizes={getOptimalImageSizes("card")}
  loading="lazy"
/>

// ✅ CORRECT - Priority for LCP images
<Image
  src={event.imageUrl}
  alt={event.title}
  fill
  priority
  quality={getOptimalImageQuality("hero")}
  sizes={getOptimalImageSizes("hero")}
/>
```

### Image Retry Logic

For unreliable image sources:

```typescript
import { useImageRetry, getImageKey } from "@hooks/useImageRetry";

function EventImage({ src, alt }) {
  const { key, handleError, retryCount } = useImageRetry(src);

  return (
    <Image
      key={key}
      src={src}
      alt={alt}
      onError={handleError}
      // Exponential backoff on retry
    />
  );
}
```

### Preloading Critical Images

```typescript
import { preloadImage } from "@utils/image-helpers";

// Preload LCP image
preloadImage(heroImageUrl);
```

**Caution**: `preloadImage` has coupling to internal Next.js `_next/image` URL format. Use sparingly.

## Cache Busting

### Versioned URLs

```typescript
import { getVersionedUrl } from "@utils/version-helpers";

// Add cache-busting version param
const url = getVersionedUrl("/static/data.json");
// "/static/data.json?v=1234567890"
```

`BUILD_VERSION` resolves to:

- Development: timestamp
- Production: build ID or package version

## Code Splitting Best Practices

### Dynamic Imports

```typescript
import dynamic from "next/dynamic";

// ✅ CORRECT - Lazy load heavy components
const HeavyChart = dynamic(() => import("@components/ui/HeavyChart"), {
  loading: () => <ChartSkeleton />,
});

// ❌ WRONG - ssr: false in Server Components
// Don't use ssr: false inside Server Components
// Instead, create a client component wrapper
```

### Server Component Default

Most components should be Server Components (no JS shipped):

```tsx
// ✅ Server Component - Zero JS
export function EventList({ events }) {
  return (
    <ul>
      {events.map((event) => (
        <li key={event.id}>{event.title}</li>
      ))}
    </ul>
  );
}
```

### Client Components - Only When Needed

```tsx
"use client";

// Only add "use client" for:
// - useState, useEffect
// - Event handlers (onClick, etc.)
// - Browser APIs
// - Third-party client-only libraries
```

## Bundle Size Targets

Monitor these in bundle analysis:

| Metric        | Target  | Action if Exceeded   |
| ------------- | ------- | -------------------- |
| First Load JS | < 100kB | Split or lazy load   |
| Shared chunks | < 50kB  | Check for large deps |
| Page-specific | < 30kB  | Review page imports  |

## Common Bundle Bloaters

1. **Large date libraries** → Use native Intl or date-fns (tree-shakeable)
2. **Full icon libraries** → Import specific icons only
3. **Unused dependencies** → Audit with `yarn analyze`
4. **Client-side only code in shared** → Move to client components

## Optimization Checklist

### Images

- [ ] Using quality caps via `getOptimalImageQuality`?
- [ ] Using responsive sizes via `getOptimalImageSizes`?
- [ ] Priority on LCP images only?
- [ ] Lazy loading below-the-fold images?

### Bundles

- [ ] Server Component by default?
- [ ] Dynamic import for heavy components?
- [ ] Running `yarn analyze` for new dependencies?
- [ ] Checking First Load JS size?

### Caching

- [ ] Using `getVersionedUrl` for static assets?
- [ ] Appropriate cache headers on API routes?

## Files to Reference

- [utils/image-helpers.ts](utils/image-helpers.ts) - Image optimization helpers
- [components/hooks/useImageRetry.ts](components/hooks/useImageRetry.ts) - Retry logic
- [utils/version-helpers.ts](utils/version-helpers.ts) - Cache busting
- [next.config.js](next.config.js) - Image domains, optimization config
- [bundle-size-baseline.json](bundle-size-baseline.json) - Size tracking
