"use client";

import { memo, useRef, RefObject, useState, useCallback } from "react";
import NextImage from "next/image";
import ImgDefault from "@components/ui/imgDefault";
import useOnScreen from "@components/hooks/useOnScreen";
import { env } from "@utils/helpers";
import { useNetworkSpeed } from "@components/hooks/useNetworkSpeed";
import { useImageRetry } from "@components/hooks/useImageRetry";
import { ImageComponentProps } from "types/common";
import {
  getOptimalImageQuality,
  getOptimalImageSizes,
  getServerImageQuality,
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
  alt = title,
  quality: customQuality,
  context = "card",
  cacheKey,
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const imgDefaultRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [forceUnoptimized, setForceUnoptimized] = useState(false);
  const isImgDefaultVisible = useOnScreen<HTMLDivElement>(
    imgDefaultRef as RefObject<HTMLDivElement>,
    { freezeOnceVisible: true }
  );

  const imageClassName = `${className}`;
  const networkQualityString = useNetworkSpeed();

  const { hasError, isLoading, handleError, handleLoad, reset, getImageKey } =
    useImageRetry(2);

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    networkQuality: getServerImageQuality(networkQualityString),
    customQuality,
  });

  const finalImageSrc = buildOptimizedImageUrl(image, cacheKey);

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

  // Error fallback: keep semantics (role="img") so accessibility & indexing remain consistent
  if (hasError) {
    return (
      <div
        className={imageClassName}
        ref={divRef}
        role="img"
        aria-label={title || "Imatge no disponible"}
      >
        {isImgDefaultVisible ? (
          <ImgDefault title={title} />
        ) : (
          <div className="flex justify-center items-center w-full">
            <div
              className="w-full h-60 bg-muted animate-fast-pulse"
              ref={imgDefaultRef}
            ></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={imageClassName}
      style={{
        position: "relative",
        maxWidth: "100%", // Ensure image doesn't exceed container
      }}
    >
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-muted animate-fast-pulse">
          <div className="w-full h-60 bg-muted animate-fast-pulse"></div>
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
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
          height: "auto",
          maxWidth: "100%", // Ensure image respects container constraints
        }}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        sizes={getOptimalImageSizes(context)}
        unoptimized={forceUnoptimized || env === "dev"}
      />
    </div>
  );
}

export default memo(ClientImage);
