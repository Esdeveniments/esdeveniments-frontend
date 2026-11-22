import { hasCardImage } from "@utils/event-helpers";
import ImagePreload from "@components/ui/common/image/ImagePreload";
import type { CardImagePreloadProps } from "types/props";

/**
 * Preloads the LCP image of an event grid: the first card with an image, the
 * one its list marks as priority. Same helper, widths and quality as the card.
 */
export default function CardImagePreload({ events }: CardImagePreloadProps) {
  const first = events.find(hasCardImage);
  if (!first) return null;
  return (
    <ImagePreload
      image={first.imageUrl}
      cacheKey={first.hash || first.updatedAt}
      context="list"
    />
  );
}
