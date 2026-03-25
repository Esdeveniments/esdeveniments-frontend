import { FC } from "react";
import type { EventImageProps } from "types/event";
import ImgDefaultServer from "@components/ui/imgDefault/ImgDefaultServer";
import { getOptimalImageQuality, getOptimalImageWidth } from "@utils/image-quality";
import {
  buildPictureSourceUrls,
  normalizeExternalImageUrl,
} from "@utils/image-cache";
import { escapeXml } from "@utils/xml-escape";
import EventHeroImageClient from "./EventHeroImageClient";

/**
 * Server component for the event hero image.
 * Computes deterministic image URLs server-side, delegates only error
 * handling to a tiny client component (EventHeroImageClient).
 * This keeps the <picture> element in pure SSR HTML for faster LCP.
 */
const EventImage: FC<EventImageProps> = ({ image, title, eventId }) => {
  const safeTitle = escapeXml(title || "");

  const imageQuality = getOptimalImageQuality({
    isPriority: true,
    isExternal: true,
  });

  const imageWidth = getOptimalImageWidth("hero");

  const normalizedImage = image ? normalizeExternalImageUrl(image) : "";

  const sources = image ? buildPictureSourceUrls(image, undefined, {
    width: imageWidth,
    quality: imageQuality,
  }) : null;

  const hasValidImage = Boolean(image && sources);

  const anchorHref = normalizedImage || image || "";

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
        <EventHeroImageClient
          sources={sources}
          safeTitle={safeTitle}
          title={title}
        />
      </a>
    </div>
  );
};

export default EventImage;
