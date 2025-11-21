import { EventImageProps } from "types/event";
import { FC } from "react";
import NextImage from "next/image";
import ImageDefault from "components/ui/imgDefault";
import { getOptimalImageQuality } from "@utils/image-quality";
import { escapeXml } from "@utils/xml-escape";

const EventImage: FC<EventImageProps> = ({ image, title, eventId }) => {
  // Escape title for safe use in HTML attributes (React also escapes, but this is defensive)
  const safeTitle = escapeXml(title || "");

  if (!image) {
    return (
      <div className="w-full aspect-[16/9] sm:aspect-[21/9] overflow-hidden rounded-card">
        <ImageDefault title={title} />
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
        href={image}
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full h-full cursor-pointer hover:opacity-95 transition-opacity"
        aria-label={`Veure imatge completa de ${safeTitle}`}
      >
        <NextImage
          src={image}
          alt={safeTitle}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1200px"
          className="object-cover"
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
