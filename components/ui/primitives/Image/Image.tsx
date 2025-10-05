import { forwardRef } from "react";
import { ImageProps } from "types/ui";
import ImageServer from "./ImageServer";
import { ClientImage } from "./ClientImage";

/**
 * Image component that conditionally renders ImageServer or ClientImage.
 * Uses ImageServer when no image is provided (for fallback rendering),
 * and ClientImage when image is provided (for optimized client-side rendering).
 *
 * @example
 * ```tsx
 * <Image title="Event Title" image="/path/to/image.jpg" alt="Event image" />
 * <Image title="Event Title" location="Barcelona" region="Catalonia" />
 * ```
 */
export const Image = forwardRef<HTMLDivElement, ImageProps>((props, ref) => {
  // Use ImageServer when no image is provided (for fallback rendering)
  // Use ClientImage when image is provided (for optimized client-side rendering)
  if (!props.image) {
    return <ImageServer ref={ref} {...props} />;
  }

  return <ClientImage ref={ref} {...props} />;
});

Image.displayName = "Image";
