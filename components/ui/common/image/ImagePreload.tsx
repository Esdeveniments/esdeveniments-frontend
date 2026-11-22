"use client";

import { preload } from "react-dom";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";
import type { ImagePreloadProps } from "types/props";

/**
 * Preloads a page's LCP image via ReactDOM.preload (matching next/image's own
 * ImagePreload pattern). Keeping this as a client leaf ensures ReactDOM.preload
 * runs during Fizz SSR (inside streamed <Suspense> and "use cache" boundaries)
 * and emits a single deduplicated <link rel="preload"> without hitting React's
 * RSC duplicate-link bug (facebook/react#35889).
 */
export default function ImagePreload({
  image,
  context,
  cacheKey,
}: ImagePreloadProps) {
  if (!image.trim()) return null;
  const sources = buildResponsivePictureSourceUrls(
    image,
    cacheKey,
    { quality: getOptimalImageQuality({ isPriority: true, isExternal: true }) },
    getResponsiveWidths(context),
  );
  if (!sources.webp || !sources.webpSrcSet) return null;
  preload(sources.webp, {
    as: "image",
    imageSrcSet: sources.webpSrcSet,
    imageSizes: getOptimalImageSizes(context),
    type: "image/webp",
    fetchPriority: "high",
  });
  return null;
}
