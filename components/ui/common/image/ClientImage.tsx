"use client";

import { memo, useCallback } from "react";
import ImgDefault from "@components/ui/imgDefault";
import { useImageRetry } from "@components/hooks/useImageRetry";
import { ImageComponentProps } from "types/common";
import type { ImageSizeContext } from "types/common";
import type { ClientImageInnerProps } from "types/props";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getResponsiveWidths,
} from "@utils/image-quality";
import { buildResponsivePictureSourceUrls } from "@utils/image-cache";
import type { ResponsivePictureSourceUrls } from "types/common";

/**
 * ClientImage: <picture> with a WebP source and a JPEG fallback.
 * Assumes a non-empty image URL is provided. Missing-image cases should be
 * short-circuited by the server wrapper (index.tsx) to avoid unnecessary hydration.
 */
function ClientImage({
  title = "",
  image = "",
  className = "w-full h-full flex justify-center items-center",
  priority = false,
  fetchPriority,
  alt = title,
  quality: customQuality,
  context = "card",
  cacheKey,
  location,
  region,
  date,
}: ImageComponentProps & { context?: ImageSizeContext }) {
  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    customQuality,
  });

  const responsiveWidths = getResponsiveWidths(context);

  // Generate responsive WebP and JPEG URLs for <picture> element
  const sources = buildResponsivePictureSourceUrls(image, cacheKey, {
    quality: imageQuality,
  }, responsiveWidths);

  // If URL normalization failed (e.g., overly long URL), treat as error to show fallback
  if (!sources.fallback) {
    return (
      <div
        className={className}
        role="img"
        aria-label={title || "Imatge no disponible"}
        style={{
          position: "relative",
          aspectRatio: "500 / 260",
          maxWidth: "100%",
        }}
      >
        <ImgDefault title={title} location={location} region={region} date={date} />
      </div>
    );
  }

  // Key the inner component by fallback URL to reset all hook state on navigation
  return (
    <ClientImageInner
      key={sources.fallback}
      sources={sources}
      title={title}
      className={className}
      priority={priority}
      fetchPriority={fetchPriority}
      alt={alt}
      context={context}
      location={location}
      region={region}
      date={date}
    />
  );
}

/**
 * Inner component that handles load errors with <picture> element.
 * Keyed by image URL so retry state resets on navigation.
 */
function ClientImageInner({
  sources,
  title,
  className,
  priority,
  fetchPriority,
  alt,
  context,
  location,
  region,
  date,
}: Omit<ClientImageInnerProps, "finalImageSrc" | "imageQuality"> & {
  sources: ResponsivePictureSourceUrls;
}) {
  const { hasError, handleError, getImageKey } = useImageRetry(2);

  const imageKey = getImageKey(sources.fallback);

  const handleImageError = useCallback(() => {
    handleError();
  }, [handleError]);

  const containerStyle: React.CSSProperties = {
    position: "relative",
    ...(context === "card" || context === "list"
      ? {
        aspectRatio: "500 / 260",
        overflow: "hidden",
      }
      : {}),
    maxWidth: "100%",
  };

  const sizes = getOptimalImageSizes(context);

  // Error fallback
  if (hasError) {
    return (
      <div
        className={className}
        role="img"
        aria-label={title || "Imatge no disponible"}
        style={containerStyle}
      >
        <ImgDefault title={title} location={location} region={region} date={date} />
      </div>
    );
  }

  // The image paints as soon as it decodes, without waiting for hydration:
  // a JS-driven fade kept server-rendered images at opacity 0 until React ran,
  // which delayed LCP. bg-muted is the placeholder until the image arrives.
  return (
    <div className={`${className} bg-muted`} style={containerStyle}>
      <picture key={imageKey}>
        <source srcSet={sources.webpSrcSet} type="image/webp" sizes={sizes} />
        <img
          className="object-cover w-full h-full absolute inset-0"
          src={sources.fallback}
          alt={alt}
          width={500}
          height={260}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onError={handleImageError}
          fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
          sizes={sizes}
          style={{ objectFit: "cover" }}
        />
      </picture>
    </div>
  );
}

export default memo(ClientImage);
