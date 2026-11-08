import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";
import { hasCardImage } from "@utils/event-helpers";
import type { CardImagePreloadProps } from "types/props";

/**
 * Preloads the LCP image of an event grid: the first card with an image, the
 * one its list marks as priority. Same helper, widths and quality as the card.
 */
export default function CardImagePreload({ events }: CardImagePreloadProps) {
  const first = events.find(hasCardImage);
  if (!first) return null;
  const sources = buildResponsivePictureSourceUrls(
    first.imageUrl,
    first.hash || first.updatedAt,
    { quality: getOptimalImageQuality({ isPriority: true, isExternal: true }) },
    getResponsiveWidths("list"),
  );
  return (
    <link
      rel="preload"
      as="image"
      // href lets React hoist the preload into <head>.
      href={sources.webp}
      imageSrcSet={sources.webpSrcSet}
      imageSizes={getOptimalImageSizes("list")}
      type="image/webp"
      fetchPriority="high"
    />
  );
}
