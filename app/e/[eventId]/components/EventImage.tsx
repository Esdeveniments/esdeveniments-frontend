import { EventImageProps } from "types/event";
import { FC } from "react";
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

  const normalizedImage = normalizeExternalImageUrl(image);
  const proxiedImage = buildOptimizedImageUrl(image);
  const anchorHref = normalizedImage || image;
  const shouldRenderFallbackUnderlay = proxiedImage.startsWith("/api/image-proxy");

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
        {/* Server-only fallback underlay ONLY when using the proxy (risky sources).
            Avoids a visual flash for normal HTTPS images. */}
        {shouldRenderFallbackUnderlay && (
          <div className="absolute inset-0 z-0 pointer-events-none">
            <ImgDefaultServer title={title} />
          </div>
        )}
        <NextImage
          src={proxiedImage}
          alt={safeTitle}
          fill
          sizes="(max-width: 768px) 80vw, (max-width: 1280px) 70vw, 1200px"
          className="object-cover relative z-10"
          priority={true}
          quality={imageQuality}
          loading="eager"
          fetchPriority="high"
        />
      </a>
    </div>
  );
};

export default EventImage;
