"use client";

import { memo, useState, useCallback } from "react";
import NextImage from "next/image";
import ImgDefault from "@components/ui/imgDefault";
import { env } from "@utils/helpers";
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
import { buildOptimizedImageUrl } from "@utils/image-cache";

/**
 * ClientImage
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

  // Pass width and quality to the proxy for server-side optimization
  const finalImageSrc = buildOptimizedImageUrl(image, cacheKey, {
    width: imageWidth,
    quality: imageQuality,
  });

  // If URL normalization failed (e.g., overly long URL), treat as error to show fallback
  if (!finalImageSrc) {
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

  // Key the inner component by finalImageSrc to reset all hook state on navigation
  return (
    <ClientImageInner
      key={finalImageSrc}
      finalImageSrc={finalImageSrc}
      title={title}
      className={className}
      priority={priority}
      fetchPriority={fetchPriority}
      alt={alt}
      imageQuality={imageQuality}
      context={context}
      location={location}
      region={region}
      date={date}
    />
  );
}

/**
 * Inner component that handles loading state.
 * Keyed by image URL so all state resets on navigation.
 */
function ClientImageInner({
  finalImageSrc,
  title,
  className,
  priority,
  fetchPriority,
  alt,
  imageQuality,
  context,
  location,
  region,
  date,
}: ClientImageInnerProps) {
  const [forceUnoptimized, setForceUnoptimized] = useState(false);

  const { hasError, imageLoaded, showSkeleton, handleError, handleLoad, reset, getImageKey } =
    useImageRetry(2);

  const shouldBypassOptimizer = finalImageSrc.startsWith("/api/");

  const imageKey = getImageKey(`${finalImageSrc}-${forceUnoptimized ? "direct" : "opt"}`);

  const handleImageError = useCallback(() => {
    // If the Next.js image optimizer fails (common with TLS/cert issues or platform adapters),
    // retry once by bypassing optimization and letting the browser fetch the image directly.
    if (!forceUnoptimized) {
      setForceUnoptimized(true);
      reset();
      return;
    }
    handleError();
  }, [forceUnoptimized, handleError, reset]);

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

  return (
    <div className={className} style={containerStyle}>
      {showSkeleton && (
        <div className="absolute inset-0 flex justify-center items-center bg-muted animate-fast-pulse">
          <div className="w-full h-full bg-muted animate-fast-pulse"></div>
        </div>
      )}
      <NextImage
        key={imageKey}
        className="object-cover w-full h-full"
        src={finalImageSrc}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        onError={handleImageError}
        onLoad={handleLoad}
        quality={imageQuality}
        style={{
          objectFit: "cover",
          // Hide image until loaded to prevent broken image flash
          opacity: imageLoaded ? 1 : 0,
          transition: "opacity 0.3s ease-in-out",
          width: "100%",
          height: "100%",
          maxWidth: "100%",
        }}
        priority={priority}
        fetchPriority={fetchPriority ?? (priority ? "high" : "auto")}
        sizes={getOptimalImageSizes(context)}
        unoptimized={forceUnoptimized || shouldBypassOptimizer || env === "dev"}
      />
    </div>
  );
}

export default memo(ClientImage);
