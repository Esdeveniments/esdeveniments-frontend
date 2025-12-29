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

function EventHeroImage({
  imageSrc,
  safeTitle,
  title,
  imageQuality,
  effectiveUnoptimized,
  onError,
}: {
  imageSrc: string;
  safeTitle: string;
  title: string;
  imageQuality: number;
  effectiveUnoptimized: boolean;
  onError: () => "retry" | "fail";
}) {
  const [hasFailed, setHasFailed] = useState(false);

  if (hasFailed) {
    return (
      <div className="absolute inset-0">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

  return (
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
      onError={() => {
        const outcome = onError();
        if (outcome === "fail") setHasFailed(true);
      }}
      // Bypass optimization for internal proxy URLs on SST/OpenNext.
      unoptimized={effectiveUnoptimized}
    />
  );
}

const EventImage: FC<EventImageProps> = ({ image, title, eventId }) => {
  // Escape title for safe use in HTML attributes (React also escapes, but this is defensive)
  const safeTitle = escapeXml(title || "");
  const [forceUnoptimized, setForceUnoptimized] = useState(false);

  const normalizedImage = useMemo(
    () => (image ? normalizeExternalImageUrl(image) : ""),
    [image]
  );
  const optimizedImage = useMemo(
    () => (image ? buildOptimizedImageUrl(image) : ""),
    [image]
  );

  // If URL normalization failed (e.g., overly long URL), treat as no image
  const hasValidImage = Boolean(image && optimizedImage);

  const anchorHref = normalizedImage || image || "";
  const isInternalProxy = optimizedImage.startsWith("/api/");
  const effectiveUnoptimized = forceUnoptimized || isInternalProxy;
  const imageSrc = forceUnoptimized ? anchorHref : optimizedImage;

  const handleImageError = useCallback((): "retry" | "fail" => {
    // First fallback: bypass Next.js optimizer (can 500 on some platforms or bad TLS chains)
    if (!forceUnoptimized && !isInternalProxy) {
      setForceUnoptimized(true);
      return "retry";
    }
    return "fail";
  }, [forceUnoptimized, isInternalProxy]);

  if (!hasValidImage) {
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
        <EventHeroImage
          key={imageSrc}
          imageSrc={imageSrc}
          safeTitle={safeTitle}
          title={title}
          imageQuality={imageQuality}
          effectiveUnoptimized={effectiveUnoptimized}
          onError={handleImageError}
        />
      </a>
    </div>
  );
};

export default EventImage;
