"use client";

import { EventImageProps } from "types/event";
import { FC, useCallback, useMemo, useState } from "react";
import NextImage from "next/image";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { getOptimalImageQuality } from "@utils/image-quality";
import {
  buildOptimizedImageUrl,
  normalizeExternalImageUrl,
} from "@utils/image-cache";
import { escapeXml } from "@utils/xml-escape";

const EventImage: FC<EventImageProps> = ({ image, title, eventId }) => {
  // Escape title for safe use in HTML attributes (React also escapes, but this is defensive)
  const safeTitle = escapeXml(title || "");
  const [forceUnoptimized, setForceUnoptimized] = useState(false);
  const [hideImage, setHideImage] = useState(false);

  const normalizedImage = useMemo(
    () => (image ? normalizeExternalImageUrl(image) : ""),
    [image]
  );
  const optimizedImage = useMemo(
    () => (image ? buildOptimizedImageUrl(image) : ""),
    [image]
  );
  const anchorHref = normalizedImage || image || "";
  const isInternalProxy = optimizedImage.startsWith("/api/");
  const effectiveUnoptimized = forceUnoptimized || isInternalProxy;
  const imageSrc = forceUnoptimized ? anchorHref : optimizedImage;

  const handleImageError = useCallback(() => {
    // First fallback: bypass Next.js optimizer (can 500 on some platforms or bad TLS chains)
    if (!forceUnoptimized && !isInternalProxy) {
      setForceUnoptimized(true);
      return;
    }
    // Second failure: stop rendering the broken <img>; keep the underlay visible
    setHideImage(true);
  }, [forceUnoptimized, isInternalProxy]);

  if (!image) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });

  return (
    <div
      className="relative w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card bg-muted"
      style={{ viewTransitionName: `event-image-${eventId}` }}
    >
      <a
        href={anchorHref}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full cursor-pointer hover:opacity-95 transition-opacity relative"
        aria-label={`Veure imatge completa de ${safeTitle}`}
      >
        {/* Default image underlay ensures a graceful visual fallback even if the image fails. */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <ImgDefaultServer title={title} />
        </div>
        {!hideImage && (
          <NextImage
            src={imageSrc}
            alt={safeTitle}
            fill
            sizes="(max-width: 768px) 80vw, (max-width: 1280px) 70vw, 1200px"
            className="object-cover relative z-10"
            priority={true}
            quality={imageQuality}
            loading="eager"
            fetchPriority="high"
            onError={handleImageError}
            // Bypass optimization for internal proxy URLs on SST/OpenNext.
            unoptimized={effectiveUnoptimized}
          />
        )}
      </a>
    </div>
  );
};

export default EventImage;
