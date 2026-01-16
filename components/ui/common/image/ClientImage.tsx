"use client";

import { memo, useState, useCallback } from "react";
import ImgDefault from "@components/ui/imgDefault";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { useImageRetry } from "@components/hooks/useImageRetry";
import { ImageComponentProps } from "types/common";
import type { ClientImageInnerProps } from "types/props";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getServerImageQuality,
  getOptimalImageWidth,
} from "@utils/image-quality";
import { buildPictureSourceUrls } from "@utils/image-cache";

/**
 * ClientImage with modern format support (WebP > AVIF > JPEG)
 * Uses native <picture> element for proper format fallback.
 * WebP is prioritized over AVIF for faster encoding and more reliable output.
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
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const networkQualityString = useNetworkSpeed();

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    networkQuality: getServerImageQuality(networkQualityString),
    customQuality,
  });

  const imageWidth = getOptimalImageWidth(context);

  // Generate AVIF, WebP, and JPEG URLs for <picture> element
  const sources = buildPictureSourceUrls(image, cacheKey, {
    width: imageWidth,
    quality: imageQuality,
  });

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
 * Inner component that handles loading state with <picture> element.
 * Keyed by image URL so all state resets on navigation.
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
  sources: { avif: string; webp: string; fallback: string };
}) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(true);

  const { hasError, handleError, getImageKey } = useImageRetry(2);

  const imageKey = getImageKey(sources.fallback);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    setShowSkeleton(false);
  }, []);

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

  // Use native <picture> element for proper format fallback:
  // - Browser tries WebP first (faster encoding, more reliable)
  // - Falls back to AVIF (better compression but slower/riskier encoding)
  // - Falls back to JPEG (100% support)
  return (
    <div className={className} style={containerStyle}>
      {showSkeleton && (
        <div className="absolute inset-0 flex justify-center items-center bg-muted animate-fast-pulse">
          <div className="w-full h-full bg-muted animate-fast-pulse"></div>
        </div>
      )}
      <picture key={imageKey}>
        <source srcSet={sources.webp} type="image/webp" sizes={sizes} />
        <source srcSet={sources.avif} type="image/avif" sizes={sizes} />
        <img
          className="object-cover w-full h-full absolute inset-0"
          src={sources.fallback}
          alt={alt}
          width={500}
          height={260}
          loading={priority ? "eager" : "lazy"}
          decoding={priority ? "sync" : "async"}
          onError={handleImageError}
          onLoad={handleLoad}
          fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
          sizes={sizes}
          style={{
            objectFit: "cover",
            opacity: imageLoaded ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
          }}
        />
      </picture>
    </div>
  );
}

export default memo(ClientImage);
