"use client";

import { EventImageProps } from "types/event";
import { FC, useCallback, useMemo, useState } from "react";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { getOptimalImageQuality, getOptimalImageWidth } from "@utils/image-quality";
import {
  buildPictureSourceUrls,
  normalizeExternalImageUrl,
} from "@utils/image-cache";
import { escapeXml } from "@utils/xml-escape";

function EventHeroImage({
  sources,
  safeTitle,
  title,
  onError,
}: {
  sources: { avif: string; webp: string; fallback: string };
  safeTitle: string;
  title: string;
  onError: () => void;
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const sizes = "(max-width: 768px) 80vw, (max-width: 1280px) 70vw, 1200px";

  if (hasFailed) {
    return (
      <div className="absolute inset-0">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

  return (
    <picture>
      <source srcSet={sources.avif} type="image/avif" sizes={sizes} />
      <source srcSet={sources.webp} type="image/webp" sizes={sizes} />
      <img
        src={sources.fallback}
        alt={safeTitle}
        loading="eager"
        decoding="sync"
        fetchPriority="high"
        sizes={sizes}
        className="object-cover w-full h-full absolute inset-0 z-10"
        onError={() => {
          onError();
          setHasFailed(true);
        }}
      />
    </picture>
  );
}

const EventImage: FC<EventImageProps> = ({ image, title, eventId }) => {
  // Escape title for safe use in HTML attributes (React also escapes, but this is defensive)
  const safeTitle = escapeXml(title || "");

  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });

  const imageWidth = getOptimalImageWidth("hero");

  const normalizedImage = useMemo(
    () => (image ? normalizeExternalImageUrl(image) : ""),
    [image]
  );
  
  // Generate AVIF, WebP, and JPEG URLs for <picture> element
  const sources = useMemo(
    () => (image ? buildPictureSourceUrls(image, undefined, {
      width: imageWidth,
      quality: imageQuality,
    }) : null),
    [image, imageWidth, imageQuality]
  );

  // If URL normalization failed (e.g., overly long URL), treat as no image
  const hasValidImage = Boolean(image && sources);

  const anchorHref = normalizedImage || image || "";

  const handleImageError = useCallback(() => {
    // Error handling - image failed to load, fallback UI will show
  }, []);

  if (!hasValidImage || !sources) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card">
        <ImgDefaultServer title={title} />
      </div>
    );
  }

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
          sources={sources}
          safeTitle={safeTitle}
          title={title}
          onError={handleImageError}
        />
      </a>
    </div>
  );
};

export default EventImage;
