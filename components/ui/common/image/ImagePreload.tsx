import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";
import type { ImagePreloadProps } from "types/props";

/**
 * Preloads a page's LCP image. Same helper, widths, sizes and quality as the
 * priority ImageServer that renders it, so the browser reuses the response.
 */
export default function ImagePreload({ image, context }: ImagePreloadProps) {
  const sources = buildResponsivePictureSourceUrls(
    image,
    undefined,
    { quality: getOptimalImageQuality({ isPriority: true, isExternal: true }) },
    getResponsiveWidths(context),
  );
  if (!sources.webpSrcSet) return null;
  return (
    <link
      rel="preload"
      as="image"
      // href lets React hoist the preload into <head>.
      href={sources.webp}
      imageSrcSet={sources.webpSrcSet}
      imageSizes={getOptimalImageSizes(context)}
      type="image/webp"
      fetchPriority="high"
    />
  );
}
