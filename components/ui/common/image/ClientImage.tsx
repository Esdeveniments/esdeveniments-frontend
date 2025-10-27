"use client";

import { memo, useRef, RefObject } from "react";
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
}: ImageComponentProps & { context?: "card" | "hero" | "list" | "detail" }) {
  const imgDefaultRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const isImgDefaultVisible = useOnScreen<HTMLDivElement>(
    imgDefaultRef as RefObject<HTMLDivElement>,
    { freezeOnceVisible: true }
  );

  const imageClassName = `${className}`;
  const networkQualityString = useNetworkSpeed();

  const { hasError, isLoading, handleError, handleLoad, getImageKey } =
    useImageRetry(2);

  const imageQuality = getOptimalImageQuality({
    isPriority: priority,
    isExternal: true,
    networkQuality: getServerImageQuality(networkQualityString),
    customQuality,
  });

  const imageKey = getImageKey(image);

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
              className="w-full h-60 bg-foreground-strong animate-fast-pulse"
              ref={imgDefaultRef}
            ></div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={imageClassName} style={{ position: "relative" }}>
      {isLoading && (
        <div className="absolute inset-0 flex justify-center items-center bg-foreground-strong animate-fast-pulse">
          <div className="w-full h-60 bg-foreground-strong animate-fast-pulse"></div>
        </div>
      )}
      <NextImage
        key={imageKey}
        className="object-cover"
        src={image}
        alt={alt}
        width={500}
        height={260}
        loading={priority ? "eager" : "lazy"}
        onError={handleError}
        onLoad={handleLoad}
        quality={imageQuality}
        style={{
          objectFit: "cover",
          opacity: isLoading ? 0 : 1,
          transition: "opacity 0.3s ease-in-out",
          height: "auto",
        }}
        priority={priority}
        fetchPriority={priority ? "high" : "auto"}
        sizes={getOptimalImageSizes(context)}
        unoptimized={env === "dev"}
      />
    </div>
  );
}

export default memo(ClientImage);
